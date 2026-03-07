/**
 * TanStack Query-based sync hook
 * Handles syncing CalDAV data using mutations
 */

import { useQueryClient } from '@tanstack/react-query';
import { emit } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef } from 'react';
import { settingsStore } from '$context/settingsContext';
import { useOffline } from '$hooks/useOffline';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { useSyncStore } from '$hooks/useSyncStore';
import { toastManager } from '$hooks/useToast.tsx';
import { caldavService } from '$lib/caldav';
import { loggers } from '$lib/logger';
import { queryKeys } from '$lib/queryClient';
import { getAllAccounts } from '$lib/store/accounts';
import { addCalendar, updateCalendar } from '$lib/store/calendars';
import { clearPendingDeletion, getPendingDeletions } from '$lib/store/sync';
import { createTag, getAllTags } from '$lib/store/tags';
import { createTask, deleteTask, getTasksByCalendar, updateTask } from '$lib/store/tasks';
import { getUIState, setAllTasksView } from '$lib/store/ui';
import type { Calendar, Task } from '$types/index';
import { generateTagColor } from '$utils/color';
import { MENU_EVENTS } from '$utils/menu';

const log = loggers.sync;

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
  const syncInProgressRef = useRef(false);
  const syncAllRef = useRef<(() => Promise<void>) | null>(null);

  // Handle online/offline status
  const { isOffline, isOfflineRef } = useOffline({
    onOnline: () => {
      log.info('Back online');
      const { syncOnReconnect } = settingsStore.getState();
      if (syncOnReconnect && syncAllRef.current) {
        log.info('Auto-sync on reconnect enabled, triggering sync');
        pendingSyncRef.current = true;
        syncAllRef.current();
      }
    },
    onOffline: () => {
      log.info('Going offline');
    },
  });

  /**
   * Reconnect all accounts on app startup
   */
  const reconnectAccounts = useCallback(async () => {
    const accounts = getAllAccounts();
    for (const account of accounts) {
      if (!caldavService.isConnected(account.id)) {
        try {
          await caldavService.reconnect(account);
          log.info(`Reconnected to account: ${account.name}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          log.error(`Failed to reconnect account ${account.name}:`, error);
          toastManager.error(
            `Account sync failed: ${account.name}`,
            errorMessage,
            `sync-error-account-${account.id}`,
            {
              label: 'Edit Account',
              onClick: () => {
                emit(MENU_EVENTS.EDIT_ACCOUNT, { accountId: account.id });
              },
            },
          );
        }
      }
    }
  }, []);

  /**
   * Sync calendars for an account - add new, remove deleted, update properties
   */
  const syncCalendarsForAccount = useCallback(
    async (accountId: string) => {
      const accounts = getAllAccounts();
      const account = accounts.find((a) => a.id === accountId);
      if (!account) return;

      // Ensure we're connected
      if (!caldavService.isConnected(accountId)) {
        await caldavService.reconnect(account);
      }

      let remoteCalendars: Calendar[];
      try {
        remoteCalendars = await caldavService.fetchCalendars(accountId);
      } catch (error) {
        log.error(`Failed to fetch calendars for ${account.name}:`, error);
        log.debug('About to show calendar sync error toast...');
        toastManager.error(
          'Calendar Sync Error',
          `Could not fetch calendars from "${account.name}". Server returned ${error instanceof Error ? error.message : 'an error'}.`,
          'calendar-fetch-error',
        );
        log.debug('Calendar sync error toast call completed');
        return; // skip calendar sync to avoid deleting calendars based on failed fetch
      }

      log.info(`Found ${remoteCalendars.length} calendars on server for ${account.name}`);

      const localCalendars = account.calendars;
      const remoteCalendarIds = new Set(remoteCalendars.map((c) => c.id));

      // Build updated calendar list
      const updatedCalendars: Calendar[] = [];
      const calendarUpdates: Map<string, Partial<Calendar>> = new Map();
      const newCalendars: Calendar[] = [];

      // Add/update calendars from server
      for (const remoteCalendar of remoteCalendars) {
        const localCalendar = localCalendars.find((c) => c.id === remoteCalendar.id);

        if (localCalendar) {
          // Calendar exists - check if properties changed
          const displayNameChanged = localCalendar.displayName !== remoteCalendar.displayName;
          const colorChanged = localCalendar.color !== remoteCalendar.color;
          const ctagChanged = localCalendar.ctag !== remoteCalendar.ctag;
          const syncTokenChanged = localCalendar.syncToken !== remoteCalendar.syncToken;

          // if ctag/syncToken changed, calendar properties were modified on server
          const serverPropertiesChanged = ctagChanged || syncTokenChanged;

          if (displayNameChanged || colorChanged || ctagChanged || syncTokenChanged) {
            const updates: Partial<Calendar> = {
              displayName: remoteCalendar.displayName,
              color: serverPropertiesChanged ? remoteCalendar.color : localCalendar.color,
              ctag: remoteCalendar.ctag,
              syncToken: remoteCalendar.syncToken,
            };

            calendarUpdates.set(localCalendar.id, updates);

            updatedCalendars.push({
              ...localCalendar,
              ...updates,
            });
          } else {
            updatedCalendars.push(localCalendar);
          }
        } else {
          // New calendar from server
          updatedCalendars.push(remoteCalendar);
          newCalendars.push(remoteCalendar);
        }
      }

      // track if we need to redirect to All Tasks
      const currentUIState = getUIState();
      let needsRedirectToAllTasks = false;

      // remove calendars that were deleted on server
      for (const localCalendar of localCalendars) {
        if (!remoteCalendarIds.has(localCalendar.id)) {
          log.warn(
            `Calendar "${localCalendar.displayName}" (${localCalendar.id}) not found on server. Removing locally.`,
          );

          // check if this was the active calendar
          if (currentUIState.activeCalendarId === localCalendar.id) {
            needsRedirectToAllTasks = true;
          }

          // remove tasks for this calendar
          const tasks = getTasksByCalendar(localCalendar.id);
          log.warn(`Deleting ${tasks.length} tasks from calendar "${localCalendar.displayName}"`);

          for (const task of tasks) {
            deleteTask(task.id);
          }
        }
      }

      // persist new calendars to database
      for (const calendar of newCalendars) {
        addCalendar(accountId, calendar);
      }

      // persist calendar property updates to database
      for (const [calendarId, updates] of calendarUpdates) {
        updateCalendar(accountId, calendarId, updates);
      }

      // if active calendar was deleted, redirect to All Tasks
      if (needsRedirectToAllTasks) {
        log.info('Active calendar was deleted on server, redirecting to All Tasks');
        setAllTasksView();
        queryClient.invalidateQueries({ queryKey: ['uiState'] });
      }

      return updatedCalendars;
    },
    [queryClient],
  );

  /**
   * Ensure a tag exists by name, returns the tag ID
   */
  const ensureTagExists = useCallback((tagName: string): string => {
    const currentTags = getAllTags();
    const existing = currentTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());

    if (existing) {
      return existing.id;
    }

    const newTag = createTag({
      name: tagName,
      color: generateTagColor(tagName),
    });

    return newTag.id;
  }, []);

  /**
   * Sync a specific calendar - push local changes, then fetch from server
   */
  const syncCalendar = useCallback(
    async (calendarId: string) => {
      const accounts = getAllAccounts();
      const account = accounts.find((a) => a.calendars.some((c) => c.id === calendarId));

      if (!account) {
        log.error('Calendar not found in any account, calendarId:', calendarId);
        return;
      }

      const calendar = account.calendars.find((c) => c.id === calendarId);
      if (!calendar) {
        log.error('Calendar not found');
        return;
      }

      // Set syncing state for this calendar
      setSyncingCalendarId(calendarId);

      try {
        // Ensure we're connected
        if (!caldavService.isConnected(account.id)) {
          await caldavService.reconnect(account);
        }

        // STEP 0: Process pending deletions for this calendar
        const pendingDeletions = getPendingDeletions();
        const calendarDeletions = pendingDeletions.filter((d) => d.calendarId === calendarId);

        for (const deletion of calendarDeletions) {
          try {
            // Create minimal task object for deletion (only href is used by caldav service)
            await caldavService.deleteTask(account.id, {
              id: '',
              uid: deletion.uid,
              href: deletion.href,
              title: '',
              description: '',
              completed: false,
              priority: 'none',
              subtasks: [],
              sortOrder: 0,
              accountId: deletion.accountId,
              calendarId: deletion.calendarId,
              synced: true,
              createdAt: new Date(),
              modifiedAt: new Date(),
            });
            clearPendingDeletion(deletion.uid);
          } catch (error) {
            log.error(
              `Failed to delete task from calendar ${calendar.displayName} from server:`,
              error,
            );
            // Still clear the pending deletion to avoid infinite retries
            clearPendingDeletion(deletion.uid);
          }
        }

        // Get local tasks for this calendar
        const localCalendarTasks = getTasksByCalendar(calendarId);

        // STEP 1: Push unsynced local tasks to server
        const unsyncedTasks = localCalendarTasks.filter((t) => !t.synced);

        for (const task of unsyncedTasks) {
          try {
            if (task.href) {
              // Update existing task on server
              const result = await caldavService.updateTask(account.id, task);
              if (result) {
                updateTask(task.id, { etag: result.etag, synced: true });
              }
            } else {
              // Create new task on server
              const result = await caldavService.createTask(account.id, calendar, task);
              if (result) {
                updateTask(task.id, {
                  href: result.href,
                  etag: result.etag,
                  synced: true,
                });
              }
            }
          } catch (error) {
            log.error(
              `Failed to push task ${task.title} to calendar ${calendar.displayName}:`,
              error,
            );
          }
        }

        // STEP 2: Fetch tasks from server
        const remoteTasks = await caldavService.fetchTasks(account.id, calendar);

        // If fetchTasks returns null, it indicates a server error (not just empty)
        // We can't trust the response, so skip the comparison/deletion logic
        // But we already pushed local changes above, so new tasks are safe
        if (remoteTasks === null) {
          log.warn(
            `Failed to fetch tasks from ${calendar.displayName}. Local changes were pushed successfully, but skipping server comparison to prevent data loss.`,
          );
          toastManager.error(
            'Partial Sync',
            `Pushed changes to "${calendar.displayName}", but could not verify server state. Your local tasks are safe.`,
            'sync-fetch-error',
          );
          return; // Exit early, preserve local tasks (but pushes already happened)
        }

        log.info(`Fetched ${remoteTasks.length} tasks from ${calendar.displayName}`);

        // Re-get local tasks (may have been updated by push)
        const updatedLocalTasks = getTasksByCalendar(calendarId);
        const localUids = new Set(updatedLocalTasks.map((t) => t.uid));
        const remoteUids = new Set(remoteTasks.map((t) => t.uid));

        // Find new tasks from server (not in local)
        for (const remoteTask of remoteTasks) {
          if (!localUids.has(remoteTask.uid)) {
            // New task from server

            // Extract category/tag from the task and create if needed
            let tagIds: string[] = [];
            if (remoteTask.categoryId) {
              const categoryNames = remoteTask.categoryId
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean);
              tagIds = categoryNames.map((name: string) => ensureTagExists(name));
            }

            // Add the task with tags
            createTask({
              ...remoteTask,
              tags: tagIds,
            });
          } else {
            // Task exists locally - check if server version is newer
            const localTask = updatedLocalTasks.find((t) => t.uid === remoteTask.uid);
            if (localTask) {
              // Check if tags need to be synced from server
              let remoteTagIds: string[] = [];
              if (remoteTask.categoryId) {
                const categoryNames = remoteTask.categoryId
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter(Boolean);
                remoteTagIds = categoryNames.map((name: string) => ensureTagExists(name));
              }

              // Check if local task is missing tags that exist on server
              const localTagIds = localTask.tags || [];
              const tagsMatch =
                remoteTagIds.length === localTagIds.length &&
                remoteTagIds.every((id) => localTagIds.includes(id));

              if (remoteTask.etag !== localTask.etag) {
                // Only update from server if local task is synced (no local changes)
                if (localTask.synced) {
                  updateTask(localTask.id, {
                    ...remoteTask,
                    id: localTask.id, // Keep local ID
                    tags: remoteTagIds,
                    synced: true,
                  });
                }
              } else if (!tagsMatch && localTask.synced) {
                // Etag matches but tags don't - sync tags without marking as unsynced
                updateTask(localTask.id, {
                  tags: remoteTagIds,
                  synced: true,
                });
              }
            }
          }
        }

        // Find tasks deleted on server (in local but not in remote)
        for (const localTask of updatedLocalTasks) {
          if (localTask.synced && !remoteUids.has(localTask.uid)) {
            // Task was deleted on server
            deleteTask(localTask.id);
          }
        }

        // Invalidate queries after sync
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      } finally {
        // Clear syncing state
        setSyncingCalendarId(null);
      }
    },
    [queryClient, ensureTagExists, setSyncingCalendarId],
  );

  /**
   * Sync all calendars for all accounts
   */
  const syncAll = useCallback(async () => {
    // Skip if already syncing (use ref for reliable concurrency check)
    if (syncInProgressRef.current) {
      log.debug('Sync already in progress, skipping...');
      return;
    }

    // Skip if offline (use ref for immediate read, not state which may be stale)
    if (isOfflineRef.current) {
      log.info('Skipping sync - offline');
      setLastSyncError('You are offline. Changes will sync when you reconnect.');
      return;
    }

    log.info('Starting sync...');
    syncInProgressRef.current = true;
    setIsSyncing(true);
    setLastSyncError(null);

    try {
      await reconnectAccounts();

      // get fresh accounts from data layer
      let freshAccounts = getAllAccounts();

      // sync calendars for each account (add/remove/update calendars)
      for (const account of freshAccounts) {
        try {
          await syncCalendarsForAccount(account.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          log.error(`Failed to sync calendars for ${account.name}:`, error);
          toastManager.error(
            `Account sync failed: ${account.name}`,
            errorMessage,
            `sync-error-account-${account.id}`,
            {
              label: 'Edit Account',
              onClick: () => {
                emit(MENU_EVENTS.EDIT_ACCOUNT, { accountId: account.id });
              },
            },
          );
        }
      }

      // re-fetch accounts after calendar sync (calendars may have been added/removed)
      freshAccounts = getAllAccounts();

      // sync tasks for each calendar
      for (const account of freshAccounts) {
        for (const calendar of account.calendars) {
          try {
            await syncCalendar(calendar.id);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            log.error(`Failed to sync calendar ${calendar.displayName}:`, error);
            toastManager.error(
              `Calendar sync failed: ${calendar.displayName}`,
              errorMessage,
              `sync-error-calendar-${calendar.id}`,
              {
                label: 'Edit Account',
                onClick: () => {
                  emit(MENU_EVENTS.EDIT_ACCOUNT, { accountId: account.id });
                },
              },
            );
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      setLastSyncError(message);
      log.error('Sync error:', error);
      toastManager.error('Sync Failed', message, 'sync-error');
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
      setLastSyncTime(new Date());
    }
  }, [
    reconnectAccounts,
    syncCalendar,
    syncCalendarsForAccount,
    isOfflineRef,
    setIsSyncing,
    setLastSyncError,
    setLastSyncTime,
  ]);

  /**
   * Push a task to the server
   */
  const pushTask = useCallback(
    async (task: Task) => {
      const accounts = getAllAccounts();
      const account = accounts.find((a) => a.id === task.accountId);
      if (!account) return;

      const calendar = account.calendars.find((c) => c.id === task.calendarId);
      if (!calendar) return;

      if (!caldavService.isConnected(account.id)) {
        await caldavService.reconnect(account);
      }

      if (task.href) {
        // Update existing
        const result = await caldavService.updateTask(account.id, task);
        if (result) {
          updateTask(task.id, { etag: result.etag, synced: true });
        }
      } else {
        // Create new
        const result = await caldavService.createTask(account.id, calendar, task);
        if (result) {
          updateTask(task.id, { href: result.href, etag: result.etag, synced: true });
        }
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    [queryClient],
  );

  /**
   * Delete a task from the server
   */
  const removeTaskFromServer = useCallback(async (task: Task) => {
    if (!task.href) return true; // Not on server yet

    const accounts = getAllAccounts();
    const account = accounts.find((a) => a.id === task.accountId);
    if (!account) return false;

    if (!caldavService.isConnected(account.id)) {
      await caldavService.reconnect(account);
    }

    return caldavService.deleteTask(account.id, task);
  }, []);

  // Register syncAll for initial sync trigger
  useEffect(() => {
    registerInitialSyncCallback(syncAll);
  }, [registerInitialSyncCallback, syncAll]);

  // Update ref when syncAll changes
  useEffect(() => {
    syncAllRef.current = syncAll;
  }, [syncAll]);

  // Auto-sync interval
  useEffect(() => {
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
            syncAll();
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
  }, [autoSync, syncInterval, isOffline, isSyncing, syncAll]);

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
