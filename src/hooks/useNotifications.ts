import { listen } from '@tauri-apps/api/event';
import { differenceInSeconds, isPast } from 'date-fns';
import { useCallback, useEffect, useRef } from 'react';
import { useTasks, useToggleTaskComplete, useUpdateTask } from '$hooks/queries/useTasks';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { loggers } from '$lib/logger';
import {
  checkNotificationPermission,
  type NotificationActionEvent,
  type NotificationType,
  requestNotificationPermission,
  sendNotification,
} from '$lib/notifications';

const log = loggers.notifications;

interface NotificationOptions {
  title: string;
  body: string;
  taskId: string;
  notificationType: NotificationType;
}

const showNotification = async (options: NotificationOptions) => {
  try {
    // Use our native permission check
    const permissionStatus = await checkNotificationPermission();
    let permissionGranted = permissionStatus.status === 'granted';

    if (!permissionGranted) {
      // Request permission using native API
      const result = await requestNotificationPermission();
      permissionGranted = result.granted;

      log.info('Notification permission requested:', result);
    }

    if (permissionGranted) {
      await sendNotification({
        title: options.title,
        body: options.body,
        taskId: options.taskId,
        notificationType: options.notificationType,
      });
      log.info('Notification sent:', {
        title: options.title,
        body: options.body,
      });
    } else {
      log.warn('Notification permission not granted:', permissionStatus.status);
    }
  } catch (error) {
    log.error('Failed to show notification:', error);
  }
};

interface UseNotificationsOptions {
  onOpenTaskActions?: (taskId: string) => void;
}

/**
 * hook that monitors tasks and shows notifications for due tasks and reminders
 */
export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { onOpenTaskActions } = options;
  const { data: tasks = [] } = useTasks();
  const {
    notifications,
    notifyReminders,
    notifyOverdue,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
  } = useSettingsStore();
  const updateTaskMutation = useUpdateTask();
  const toggleTaskCompleteMutation = useToggleTaskComplete();
  const notifiedTasksRef = useRef<Set<string>>(new Set());
  const notifiedRemindersRef = useRef<Set<string>>(new Set());
  const snoozedTasksRef = useRef<Map<string, number>>(new Map());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to handle snoozing a task
  const handleSnoozeTask = useCallback((taskId: string, durationMinutes: number) => {
    // Calculate when the snooze expires
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + durationMinutes);
    snoozedTasksRef.current.set(taskId, snoozeUntil.getTime());

    // Remove from notified sets so notifications can fire again once the snooze expires
    const reminderKeys = Array.from(notifiedRemindersRef.current).filter((key) =>
      key.startsWith(`reminder-${taskId}`),
    );
    reminderKeys.forEach((key) => {
      notifiedRemindersRef.current.delete(key);
    });

    const dueKeys = Array.from(notifiedTasksRef.current).filter((key) =>
      key.startsWith(`due-${taskId}`),
    );
    dueKeys.forEach((key) => {
      notifiedTasksRef.current.delete(key);
    });

    log.info(`Snoozed notification for task: ${taskId} for ${durationMinutes} minutes`);
  }, []);

  useEffect(() => {
    if (!notifications) {
      // notifications disabled, clear interval
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Notification polling has multiple conditions
    const checkDueTasks = () => {
      const now = new Date();

      if (quietHoursEnabled) {
        const hour = now.getHours();
        const inQuietHours =
          quietHoursStart <= quietHoursEnd
            ? hour >= quietHoursStart && hour < quietHoursEnd
            : hour >= quietHoursStart || hour < quietHoursEnd;
        if (inQuietHours) return;
      }

      for (const task of tasks) {
        // skip completed tasks
        if (task.completed) continue;

        // Check if task is currently snoozed
        let justUnsnoozed = false;
        const snoozeUntil = snoozedTasksRef.current.get(task.id);
        if (snoozeUntil && now.getTime() < snoozeUntil) {
          continue; // still snoozed, skip all notifications for this task
        } else if (snoozeUntil) {
          // Snooze expired, remove it so we don't keep checking
          snoozedTasksRef.current.delete(task.id);
          justUnsnoozed = true;
        }

        // Check reminders (VALARM)
        if (notifyReminders && task.reminders && task.reminders.length > 0) {
          for (const reminder of task.reminders) {
            const reminderKey = `reminder-${task.id}-${reminder.id}`;

            // skip if we already notified about this reminder
            if (notifiedRemindersRef.current.has(reminderKey)) continue;

            const reminderDate = new Date(reminder.trigger);
            const secondsUntilReminder = differenceInSeconds(reminderDate, now);

            // Fire reminder when the time has arrived (0 or past, within 60 second window to avoid missing)
            // OR if the task was just unsnoozed
            if ((secondsUntilReminder <= 0 && secondsUntilReminder >= -60) || justUnsnoozed) {
              showNotification({
                title: justUnsnoozed ? 'Snoozed Task Reminder' : 'Task Reminder',
                body: task.title,
                taskId: task.id,
                notificationType: 'reminder',
              });
              notifiedRemindersRef.current.add(reminderKey);
              justUnsnoozed = false; // mark as handled so we don't re-trigger other notifications
            }
          }
        }

        // check due dates - notify when task becomes overdue
        if (!notifyOverdue || !task.dueDate) continue;

        const dueDate = new Date(task.dueDate);
        const taskKey = `due-${task.id}-${dueDate.getTime()}`;

        // skip if we already notified about this task
        if (notifiedTasksRef.current.has(taskKey)) continue;

        // Notify when task is overdue or just unsnoozed
        if ((isPast(dueDate) || justUnsnoozed) && !notifiedTasksRef.current.has(taskKey)) {
          showNotification({
            title: justUnsnoozed ? 'Snoozed Task Overdue' : 'Task Overdue',
            body: task.title,
            taskId: task.id,
            notificationType: 'overdue',
          });

          notifiedTasksRef.current.add(taskKey);
          justUnsnoozed = false;
        }
      }

      // clean up old notification records (keep only recent ones)
      if (notifiedTasksRef.current.size > 1000) {
        notifiedTasksRef.current.clear();
      }
      if (notifiedRemindersRef.current.size > 1000) {
        notifiedRemindersRef.current.clear();
      }
    };

    // check immediately
    checkDueTasks();

    // check every minute
    checkIntervalRef.current = setInterval(checkDueTasks, 60 * 1000);

    // Listen for notification actions
    const unlistenPromise = listen<NotificationActionEvent>('notification-action', (event) => {
      const { action, taskId, notificationType } = event.payload;
      log.info('Notification action received:', { action, taskId, notificationType });

      if (action === 'complete') {
        // Use toggleTaskComplete so recurring tasks advance to their next occurrence
        toggleTaskCompleteMutation.mutate(taskId);
        log.info('Completing task:', taskId);
      } else if (action === 'snooze-15min' || action === 'snooze-1hr') {
        // Snooze the notification
        const durationMinutes = action === 'snooze-1hr' ? 60 : 15;
        handleSnoozeTask(taskId, durationMinutes);
      } else if (action === 'view') {
        // View action - open the task actions modal
        log.info('Viewing task:', taskId);
        onOpenTaskActions?.(taskId);
      }
    });

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [
    tasks,
    notifications,
    notifyReminders,
    notifyOverdue,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
    updateTaskMutation,
    toggleTaskCompleteMutation,
    handleSnoozeTask,
    onOpenTaskActions,
  ]);
};
