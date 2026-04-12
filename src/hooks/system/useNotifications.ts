import { listen } from '@tauri-apps/api/event';
import { differenceInSeconds, isPast } from 'date-fns';
import { useCallback, useEffect, useRef } from 'react';
import { useTasks, useToggleTaskComplete } from '$hooks/queries/useTasks';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { clearSnoozed, getSnoozedTasks, setSnoozed } from '$hooks/store/useSnoozedTasksStore';
import { loggers } from '$lib/logger';
import {
  checkNotificationPermission,
  type NotificationActionEvent,
  type NotificationType,
  requestNotificationPermission,
  sendNotification,
} from '$lib/notifications';
import type { Task } from '$types';

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

// Helper: Check if current time is within quiet hours
const isInQuietHours = (
  quietHoursEnabled: boolean,
  quietHoursStart: number,
  quietHoursEnd: number,
): boolean => {
  if (!quietHoursEnabled) return false;
  const hour = new Date().getHours();
  return quietHoursStart <= quietHoursEnd
    ? hour >= quietHoursStart && hour < quietHoursEnd
    : hour >= quietHoursStart || hour < quietHoursEnd;
};

// Helper: Check snooze status and return whether task just unsnoozed
const checkSnoozeStatus = (
  taskId: string,
  now: Date,
  snoozedTasks: Map<string, number>,
): { isSnoozed: boolean; justUnsnoozed: boolean } => {
  const snoozeUntil = snoozedTasks.get(taskId);
  if (!snoozeUntil) return { isSnoozed: false, justUnsnoozed: false };

  if (now.getTime() < snoozeUntil) {
    return { isSnoozed: true, justUnsnoozed: false };
  }

  // Snooze expired, remove it
  snoozedTasks.delete(taskId);
  return { isSnoozed: false, justUnsnoozed: true };
};

// Helper: Process reminders for a task
const processTaskReminders = (
  task: Task,
  now: Date,
  justUnsnoozed: boolean,
  notifiedReminders: Set<string>,
): boolean => {
  if (!task.reminders || task.reminders.length === 0) return justUnsnoozed;

  let stillJustUnsnoozed = justUnsnoozed;

  for (const reminder of task.reminders) {
    const reminderKey = `reminder-${task.id}-${reminder.id}`;

    // skip if we already notified about this reminder
    if (notifiedReminders.has(reminderKey)) continue;

    const reminderDate = new Date(reminder.trigger);
    const secondsUntilReminder = differenceInSeconds(reminderDate, now);

    // Fire reminder when the time has arrived (0 or past, within 60 second window to avoid missing)
    // OR if the task was just unsnoozed
    const shouldNotify =
      (secondsUntilReminder <= 0 && secondsUntilReminder >= -60) || stillJustUnsnoozed;

    if (shouldNotify) {
      showNotification({
        title: stillJustUnsnoozed ? 'Snoozed Task Reminder' : 'Task Reminder',
        body: task.title,
        taskId: task.id,
        notificationType: 'reminder',
      });
      notifiedReminders.add(reminderKey);
      stillJustUnsnoozed = false; // mark as handled so we don't re-trigger other notifications
    }
  }

  return stillJustUnsnoozed;
};

// Helper: Process overdue notification for a task
const processOverdueNotification = (
  task: Task,
  justUnsnoozed: boolean,
  notifiedTasks: Set<string>,
): void => {
  if (!task.dueDate) return;

  const dueDate = new Date(task.dueDate);
  const taskKey = `due-${task.id}-${dueDate.getTime()}`;

  // skip if we already notified about this task
  if (notifiedTasks.has(taskKey)) return;

  // Notify when task is overdue or just unsnoozed
  if (isPast(dueDate) || justUnsnoozed) {
    showNotification({
      title: justUnsnoozed ? 'Snoozed Task Overdue' : 'Task Overdue',
      body: task.title,
      taskId: task.id,
      notificationType: 'overdue',
    });
    notifiedTasks.add(taskKey);
  }
};

// Helper: Handle notification action events
const handleNotificationAction = (
  action: string,
  taskId: string,
  toggleTaskComplete: (taskId: string) => void,
  snoozeTask: (taskId: string, durationMinutes: number) => void,
  openTaskActions?: (taskId: string) => void,
): void => {
  if (action === 'complete') {
    toggleTaskComplete(taskId);
    log.info('Completing task:', taskId);
  } else if (action === 'snooze-15min' || action === 'snooze-1hr') {
    const durationMinutes = action === 'snooze-1hr' ? 60 : 15;
    snoozeTask(taskId, durationMinutes);
  } else if (action === 'view') {
    log.info('Viewing task:', taskId);
    openTaskActions?.(taskId);
  }
};

// Helper: Clean up notification refs to prevent memory leaks
const cleanupNotificationRefs = (
  notifiedTasks: Set<string>,
  notifiedReminders: Set<string>,
): void => {
  if (notifiedTasks.size > 1000) {
    notifiedTasks.clear();
  }
  if (notifiedReminders.size > 1000) {
    notifiedReminders.clear();
  }
};

interface UseNotificationsOptions {
  onOpenTaskActions?: (taskId: string) => void;
}

// Helper: Clear snooze notification keys for a task
const clearSnoozeKeys = (
  taskId: string,
  notifiedReminders: Set<string>,
  notifiedTasks: Set<string>,
): void => {
  for (const key of notifiedReminders) {
    if (key.startsWith(`reminder-${taskId}`)) {
      notifiedReminders.delete(key);
    }
  }
  for (const key of notifiedTasks) {
    if (key.startsWith(`due-${taskId}`)) {
      notifiedTasks.delete(key);
    }
  }
};

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
  const toggleTaskCompleteMutation = useToggleTaskComplete();
  const notifiedTasksRef = useRef<Set<string>>(new Set());
  const notifiedRemindersRef = useRef<Set<string>>(new Set());
  const snoozedTasksRef = useRef(getSnoozedTasks());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to handle snoozing a task
  const handleSnoozeTask = useCallback((taskId: string, durationMinutes: number) => {
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + durationMinutes);
    const until = snoozeUntil.getTime();
    snoozedTasksRef.current.set(taskId, until);
    setSnoozed(taskId, until);

    clearSnoozeKeys(taskId, notifiedRemindersRef.current, notifiedTasksRef.current);
    log.info(`Snoozed notification for task: ${taskId} for ${durationMinutes} minutes`);
  }, []);

  useEffect(() => {
    if (!notifications) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    const checkDueTasks = () => {
      if (isInQuietHours(quietHoursEnabled, quietHoursStart, quietHoursEnd)) return;

      const now = new Date();

      for (const task of tasks) {
        if (task.completed) continue;

        const snoozeStatus = checkSnoozeStatus(task.id, now, snoozedTasksRef.current);
        if (snoozeStatus.justUnsnoozed) clearSnoozed(task.id);
        if (snoozeStatus.isSnoozed) continue;

        let justUnsnoozed = snoozeStatus.justUnsnoozed;

        if (notifyReminders) {
          justUnsnoozed = processTaskReminders(
            task,
            now,
            justUnsnoozed,
            notifiedRemindersRef.current,
          );
        }

        if (notifyOverdue) {
          processOverdueNotification(task, justUnsnoozed, notifiedTasksRef.current);
        }
      }

      cleanupNotificationRefs(notifiedTasksRef.current, notifiedRemindersRef.current);
    };

    checkDueTasks();
    checkIntervalRef.current = setInterval(checkDueTasks, 60 * 1000);

    const unlistenPromise = listen<NotificationActionEvent>('notification-action', (event) => {
      const { action, taskId, notificationType } = event.payload;
      log.info('Notification action received:', { action, taskId, notificationType });

      handleNotificationAction(
        action,
        taskId,
        (id) => toggleTaskCompleteMutation.mutate(id),
        handleSnoozeTask,
        onOpenTaskActions,
      );
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
    toggleTaskCompleteMutation,
    handleSnoozeTask,
    onOpenTaskActions,
  ]);
};
