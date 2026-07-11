import { useEffect } from 'react';
import { RECENTLY_DELETED_CLEANUP_INTERVAL_MS } from '$constants';
import { useSettingsStore } from '$context/settingsContext';
import { deleteExpiredRecentlyDeletedTasks } from '$lib/store/tasks';

export const useRecentlyDeletedCleanup = () => {
  const { autoEmptyRecentlyDeleted, recentlyDeletedRetentionDays } = useSettingsStore();

  useEffect(() => {
    if (!autoEmptyRecentlyDeleted) return;

    const runCleanup = () => {
      void recentlyDeletedRetentionDays;
      deleteExpiredRecentlyDeletedTasks();
    };

    runCleanup();
    const intervalId = window.setInterval(runCleanup, RECENTLY_DELETED_CLEANUP_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [autoEmptyRecentlyDeleted, recentlyDeletedRetentionDays]);
};
