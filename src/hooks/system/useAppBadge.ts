import { useCallback, useEffect, useRef } from 'react';
import { useSettingsStore } from '$context/settingsContext';
import { useTasks } from '$hooks/queries/useTasks';
import { updateAppBadge } from '$lib/badge';
import { getTaskSnoozeStatus } from '$lib/notifications/snoozes';

/**
 * hook that keeps the app icon badge synchronized with the overdue task count
 * and the user's badge visibility setting
 */
export const useAppBadge = () => {
  const { data: tasks = [] } = useTasks();
  const { showAppIconBadge } = useSettingsStore();
  const lastCountRef = useRef<number | null>(null);

  const updateBadge = useCallback(() => {
    if (!showAppIconBadge) {
      if (lastCountRef.current !== 0) {
        updateAppBadge(0);
        lastCountRef.current = 0;
      }
      return;
    }

    const nowTime = Date.now();

    const overdueCount = tasks.filter((task) => {
      // only active tasks
      if (task.status === 'completed' || task.status === 'cancelled') {
        return false;
      }

      // do not count deleted tasks
      if (task.deletedAt) {
        return false;
      }

      // must have a due date
      if (!task.dueDate) {
        return false;
      }

      // check if it's strictly in the past
      if (task.dueDate.getTime() >= nowTime) {
        return false;
      }

      // check if the task is currently snoozed
      const snoozeStatus = getTaskSnoozeStatus(task.id, nowTime);
      if (snoozeStatus.isSnoozed) {
        return false;
      }

      return true;
    }).length;

    if (lastCountRef.current !== overdueCount) {
      updateAppBadge(overdueCount);
      lastCountRef.current = overdueCount;
    }
  }, [tasks, showAppIconBadge]);

  useEffect(() => {
    // initial update
    updateBadge();

    // set up polling interval to catch tasks that become overdue while the app is open
    const intervalId = setInterval(updateBadge, 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [updateBadge]);
};
