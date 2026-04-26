/**
 * TanStack Query-based sync hook
 * Handles syncing CalDAV data using mutations
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { settingsStore } from '$context/settingsContext';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { useSyncStore } from '$hooks/store/useSyncStore';
import { useOffline } from '$hooks/system/useOffline';
import { toastManager } from '$hooks/ui/useToast';
import { loggers } from '$lib/logger';
import { getAllAccounts } from '$lib/store/accounts';
import {
  performFullSync,
  pushTaskToServer,
  removeTaskFromServer,
  syncCalendarTasks,
} from '$lib/store/sync';
import type { Task } from '$types';

const log = loggers.sync;

type SyncTrigger =
  | string
  | {
      source: string;
      reason?: string;
      where?: string;
    };

let syncOwnerInstanceId: string | null = null;
let syncRunInProgress = false;
let syncRunCounter = 0;
let syncHookInstanceCounter = 0;
let activeSyncRun: { id: number; source: string } | null = null;

const normalizeSyncTrigger = (trigger?: SyncTrigger) => {
  if (!trigger) {
    return {
      source: 'unknown',
      reason: 'no trigger metadata provided',
      where: 'unspecified',
    };
  }

  if (typeof trigger === 'string') {
    return {
      source: trigger,
      reason: undefined,
      where: undefined,
    };
  }

  return trigger;
};

export const useSyncQuery = () => {
  const queryClient = useQueryClient();
  const { autoSync, syncInterval } = useSettingsStore();
  const {
    syncingCalendarId,
    setSyncingCalendarId,
    isSyncing,
    setIsSyncing,
    lastSyncTime,
    setLastSyncTime,
    lastSyncError,
    setLastSyncError,
    registerInitialSyncCallback,
  } = useSyncStore();

  const pendingSyncRef = useRef(false);
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const instanceIdRef = useRef<string>(`sync-hook-${++syncHookInstanceCounter}`);
  const syncAllRef = useRef<((trigger?: SyncTrigger) => Promise<void>) | null>(null);

  const ensureSyncOwner = useCallback(() => {
    if (!syncOwnerInstanceId) {
      syncOwnerInstanceId = instanceIdRef.current;
      log.debug('Sync effect owner claimed', { owner: syncOwnerInstanceId });
    }

    return syncOwnerInstanceId === instanceIdRef.current;
  }, []);

  // Handle online/offline status
  const { isOffline, isOfflineRef } = useOffline({
    onOnline: () => {
      log.info('Back online');
      const { syncOnReconnect } = settingsStore.getState();
      if (syncOnReconnect && syncAllRef.current) {
        log.info('Auto-sync on reconnect enabled, triggering sync');
        pendingSyncRef.current = true;
        syncAllRef.current({
          source: 'auto-reconnect',
          reason: 'network became online and syncOnReconnect is enabled',
          where: 'useOffline.onOnline',
        });
      }
    },
    onOffline: () => {
      log.info('Going offline');
    },
  });

  const syncCalendar = useCallback(
    (calendarId: string) => syncCalendarTasks(calendarId, queryClient, setSyncingCalendarId),
    [queryClient, setSyncingCalendarId],
  );

  const syncAll = useCallback(
    async (trigger?: SyncTrigger) => {
      const syncTrigger = normalizeSyncTrigger(trigger);

      // Skip if already syncing (shared across all hook instances)
      if (syncRunInProgress) {
        log.info('Sync request skipped - another sync is already running', {
          requestedBy: syncTrigger,
          activeRun: activeSyncRun,
        });
        return;
      }

      // Skip if offline (use ref for immediate read, not state which may be stale)
      if (isOfflineRef.current) {
        log.info('Skipping sync - offline', { requestedBy: syncTrigger });
        setLastSyncError('You are offline. Changes will sync when you reconnect.');
        return;
      }

      if (getAllAccounts().length === 0) {
        log.info('Skipping sync - no accounts configured', { requestedBy: syncTrigger });
        return;
      }

      const runId = ++syncRunCounter;
      syncRunInProgress = true;
      activeSyncRun = { id: runId, source: syncTrigger.source };
      log.info('Starting sync...', { runId, trigger: syncTrigger });
      setIsSyncing(true);
      setLastSyncError(null);

      try {
        await performFullSync(queryClient, setSyncingCalendarId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sync failed';
        setLastSyncError(message);
        log.error('Sync error:', error);
        toastManager.error('Sync Failed', message, 'sync-error');
      } finally {
        log.info('Sync finished', { runId });
        syncRunInProgress = false;
        activeSyncRun = null;
        setIsSyncing(false);
        setLastSyncTime(new Date());
      }
    },
    [
      queryClient,
      setSyncingCalendarId,
      isOfflineRef,
      setIsSyncing,
      setLastSyncError,
      setLastSyncTime,
    ],
  );

  const pushTask = useCallback((task: Task) => pushTaskToServer(task, queryClient), [queryClient]);

  // Register syncAll for initial sync trigger
  useEffect(() => {
    if (!ensureSyncOwner()) {
      return;
    }

    registerInitialSyncCallback(() => {
      syncAll({
        source: 'startup-initial',
        reason: 'initial sync callback from SyncProvider',
        where: 'SyncProvider.registerInitialSyncCallback',
      });
    });
  }, [ensureSyncOwner, registerInitialSyncCallback, syncAll]);

  // Update ref when syncAll changes
  useEffect(() => {
    syncAllRef.current = syncAll;
  }, [syncAll]);

  // Auto-sync interval
  useEffect(() => {
    if (!ensureSyncOwner()) {
      return;
    }

    // Clear existing interval
    if (autoSyncIntervalRef.current) {
      clearInterval(autoSyncIntervalRef.current);
      autoSyncIntervalRef.current = null;
    }

    const accounts = getAllAccounts();
    // Set up new interval if autosync is enabled
    if (autoSync && syncInterval > 0 && accounts.length > 0) {
      autoSyncIntervalRef.current = setInterval(
        () => {
          if (!isOffline && !isSyncing) {
            syncAll({
              source: 'auto-interval',
              reason: `autoSync enabled with ${syncInterval} minute interval`,
              where: 'useSyncQuery auto-sync interval',
            });
          }
        },
        syncInterval * 60 * 1000,
      );
    }

    return () => {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }
    };
  }, [autoSync, syncInterval, ensureSyncOwner, isOffline, isSyncing, syncAll]);

  useEffect(() => {
    return () => {
      if (syncOwnerInstanceId === instanceIdRef.current) {
        syncOwnerInstanceId = null;
        log.debug('Sync effect owner released', { owner: instanceIdRef.current });
      }
    };
  }, []);

  return {
    isSyncing,
    syncingCalendarId,
    isOffline,
    lastSyncError,
    lastSyncTime,
    syncAll,
    syncCalendar,
    pushTask,
    removeTaskFromServer,
  };
};
