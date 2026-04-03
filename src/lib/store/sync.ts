import type { QueryClient } from '@tanstack/react-query';
import { emit } from '@tauri-apps/api/event';
import { MENU_EVENTS } from '$constants/menu';
import { toastManager } from '$hooks/ui/useToast';
import { CalDAVClient } from '$lib/caldav';
import { db } from '$lib/database';
import { loggers } from '$lib/logger';
import { queryKeys } from '$lib/queryClient';
import { dataStore } from '$lib/store';
import { getAllAccounts } from '$lib/store/accounts';
import { addCalendar, updateCalendar } from '$lib/store/calendars';
import { createTag, getAllTags, updateTag } from '$lib/store/tags';
import { createTask, deleteTask, getTasksByCalendar, updateTask } from '$lib/store/tasks';
import { getUIState, setAllTasksView } from '$lib/store/ui';
import type { Calendar, Task } from '$types';
import { generateTagColor } from '$utils/color';

const log = loggers.dataStore;
const syncLog = loggers.sync;

// Helper: process pending deletions for a calendar
const processPendingDeletions = async (
  client: ReturnType<typeof CalDAVClient.getForAccount>,
  calendarId: string,
  calendarDisplayName: string,
) => {
  const pendingDeletions = getPendingDeletions();
  const calendarDeletions = pendingDeletions.filter((d) => d.calendarId === calendarId);

  for (const deletion of calendarDeletions) {
    try {
      await client.deleteTask({
        id: '',
        uid: deletion.uid,
        href: deletion.href,
        title: '',
        description: '',
        status: 'needs-action',
        completed: false,
        priority: 'none',
        sortOrder: 0,
        accountId: deletion.accountId,
        calendarId: deletion.calendarId,
        synced: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
      });
      clearPendingDeletion(deletion.uid);
    } catch (error) {
      syncLog.error(
        `Failed to delete task from calendar ${calendarDisplayName} from server:`,
        error,
      );
      clearPendingDeletion(deletion.uid);
    }
  }
};

// Helper: push unsynced local tasks to server
const pushUnsyncedTasks = async (
  client: ReturnType<typeof CalDAVClient.getForAccount>,
  calendar: Calendar,
  calendarId: string,
) => {
  const localCalendarTasks = getTasksByCalendar(calendarId);
  const unsyncedTasks = localCalendarTasks.filter((t) => !t.synced);

  for (const task of unsyncedTasks) {
    try {
      if (task.href) {
        const result = await client.updateTask(task);
        if (result) {
          updateTask(task.id, { etag: result.etag, synced: true });
        }
      } else {
        const result = await client.createTask(calendar, task);
        if (result) {
          updateTask(task.id, { href: result.href, etag: result.etag, synced: true });
        }
      }
    } catch (error) {
      syncLog.error(
        `Failed to push task ${task.title} to calendar ${calendar.displayName}:`,
        error,
      );
    }
  }
};

// Helper: process a new task from server
const processNewRemoteTask = (remoteTask: Task) => {
  const { tagColorsByName: _tagColorsByName, ...remoteTaskData } = remoteTask;
  const categoryNames = getRemoteCategoryNames(remoteTask);
  const tagIds = categoryNames.map((name: string) => ensureTagExists(name));
  applyRemoteTagColors(remoteTask, categoryNames);

  createTask({ ...remoteTaskData, tags: tagIds });
};

// Helper: process an existing task from server (update if needed)
const processExistingRemoteTask = (remoteTask: Task, localTask: Task) => {
  const { tagColorsByName: _tagColorsByName, ...remoteTaskData } = remoteTask;
  const categoryNames = getRemoteCategoryNames(remoteTask);
  const remoteTagIds = categoryNames.map((name: string) => ensureTagExists(name));
  applyRemoteTagColors(remoteTask, categoryNames);

  const localTagIds = localTask.tags || [];
  const tagsMatch =
    remoteTagIds.length === localTagIds.length &&
    remoteTagIds.every((id) => localTagIds.includes(id));

  if (remoteTask.etag !== localTask.etag) {
    if (localTask.synced) {
      updateTask(localTask.id, {
        ...remoteTaskData,
        id: localTask.id,
        tags: remoteTagIds,
        synced: true,
      });
    }
  } else if (!tagsMatch && localTask.synced) {
    updateTask(localTask.id, { tags: remoteTagIds, synced: true });
  }
};

export const getPendingDeletions = () => {
  return dataStore.load().pendingDeletions;
};

export const clearPendingDeletion = (uid: string) => {
  const data = dataStore.load();

  db.clearPendingDeletion(uid).catch((e) =>
    log.error('Failed to persist pending deletion clear:', e),
  );

  dataStore.save({
    ...data,
    pendingDeletions: data.pendingDeletions.filter((d) => d.uid !== uid),
  });
};

export const reconnectAccounts = async () => {
  const accounts = getAllAccounts();
  for (const account of accounts) {
    if (!CalDAVClient.isConnected(account.id)) {
      try {
        await CalDAVClient.reconnect(account);
        syncLog.info(`Reconnected to account: ${account.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        syncLog.error(`Failed to reconnect account ${account.name}:`, error);
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
};

export const ensureTagExists = (tagName: string) => {
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
};

const normalizeTagColor = (value: string) => {
  const normalized = value.trim().replace(/^#/, '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(normalized)) return undefined;
  return `#${normalized}`;
};

const getRemoteCategoryNames = (remoteTask: Task) => {
  if (!remoteTask.categoryId) return [];

  return remoteTask.categoryId
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
};

const applyRemoteTagColors = (remoteTask: Task, categoryNames: string[]) => {
  if (!remoteTask.tagColorsByName || categoryNames.length === 0) return;

  const tagsByName = new Map(getAllTags().map((tag) => [tag.name.toLowerCase(), tag]));

  for (const categoryName of categoryNames) {
    const remoteColor = remoteTask.tagColorsByName[categoryName.toLowerCase()];
    if (!remoteColor) continue;

    const normalizedColor = normalizeTagColor(remoteColor);
    if (!normalizedColor) continue;

    const tag = tagsByName.get(categoryName.toLowerCase());
    if (!tag || tag.color === normalizedColor) continue;

    updateTag(tag.id, { color: normalizedColor }, { markTaskSyncDirty: false });
    tagsByName.set(categoryName.toLowerCase(), { ...tag, color: normalizedColor });
  }
};

/**
 * Check if a calendar needs updates based on remote vs local comparison
 */
const getCalendarUpdates = (
  localCalendar: Calendar,
  remoteCalendar: Calendar,
  calendarSortMode: string,
): Partial<Calendar> | null => {
  const displayNameChanged = localCalendar.displayName !== remoteCalendar.displayName;
  const colorChanged = localCalendar.color !== remoteCalendar.color;
  const ctagChanged = localCalendar.ctag !== remoteCalendar.ctag;
  const syncTokenChanged = localCalendar.syncToken !== remoteCalendar.syncToken;
  const serverPropertiesChanged = ctagChanged || syncTokenChanged;

  const serverOrderChanged =
    calendarSortMode === 'server' &&
    remoteCalendar.sortOrder !== 0 &&
    localCalendar.sortOrder !== remoteCalendar.sortOrder;

  const hasChanges =
    displayNameChanged || colorChanged || ctagChanged || syncTokenChanged || serverOrderChanged;

  if (!hasChanges) return null;

  return {
    displayName: remoteCalendar.displayName,
    color: serverPropertiesChanged ? remoteCalendar.color : localCalendar.color,
    ctag: remoteCalendar.ctag,
    syncToken: remoteCalendar.syncToken,
    ...(serverOrderChanged ? { sortOrder: remoteCalendar.sortOrder } : {}),
  };
};

/**
 * Remove locally-deleted calendars that no longer exist on the server
 */
const removeDeletedCalendars = (
  localCalendars: Calendar[],
  remoteCalendarIds: Set<string>,
  activeCalendarId: string | null,
): boolean => {
  let needsRedirectToAllTasks = false;

  for (const localCalendar of localCalendars) {
    if (remoteCalendarIds.has(localCalendar.id)) continue;

    syncLog.warn(
      `Calendar "${localCalendar.displayName}" (${localCalendar.id}) not found on server. Removing locally.`,
    );

    if (activeCalendarId === localCalendar.id) {
      needsRedirectToAllTasks = true;
    }

    const tasks = getTasksByCalendar(localCalendar.id);
    syncLog.warn(`Deleting ${tasks.length} tasks from calendar "${localCalendar.displayName}"`);

    for (const task of tasks) {
      deleteTask(task.id);
    }
  }

  return needsRedirectToAllTasks;
};

export const syncCalendarsForAccount = async (accountId: string, queryClient: QueryClient) => {
  const accounts = getAllAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return;

  // Ensure we're connected
  if (!CalDAVClient.isConnected(accountId)) {
    await CalDAVClient.reconnect(account);
  }

  const client = CalDAVClient.getForAccount(accountId);

  let remoteCalendars: Calendar[];
  try {
    remoteCalendars = await client.fetchCalendars();
  } catch (error) {
    syncLog.error(`Failed to fetch calendars for ${account.name}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toastManager.error(
      'Calendar Sync Error',
      `${account.name}: ${errorMessage}`,
      'calendar-fetch-error',
    );
    return; // skip calendar sync to avoid deleting calendars based on failed fetch
  }

  syncLog.info(`Found ${remoteCalendars.length} calendars on server for ${account.name}`);

  const localCalendars = account.calendars;
  const remoteCalendarIds = new Set(remoteCalendars.map((c) => c.id));
  const calendarSortMode = getUIState().calendarSortConfig.mode;

  // Build updated calendar list
  const updatedCalendars: Calendar[] = [];
  const calendarUpdates: Map<string, Partial<Calendar>> = new Map();
  const newCalendars: Calendar[] = [];

  // Add/update calendars from server
  for (const remoteCalendar of remoteCalendars) {
    const localCalendar = localCalendars.find((c) => c.id === remoteCalendar.id);

    if (localCalendar) {
      const updates = getCalendarUpdates(localCalendar, remoteCalendar, calendarSortMode);
      if (updates) {
        calendarUpdates.set(localCalendar.id, updates);
        updatedCalendars.push({ ...localCalendar, ...updates });
      } else {
        updatedCalendars.push(localCalendar);
      }
    } else {
      // New calendar from server
      updatedCalendars.push(remoteCalendar);
      newCalendars.push(remoteCalendar);
    }
  }

  // Remove calendars deleted on server and check if redirect is needed
  const currentUIState = getUIState();
  const needsRedirectToAllTasks = removeDeletedCalendars(
    localCalendars,
    remoteCalendarIds,
    currentUIState.activeCalendarId,
  );

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
    syncLog.info('Active calendar was deleted on server, redirecting to All Tasks');
    setAllTasksView();
    queryClient.invalidateQueries({ queryKey: ['uiState'] });
  }

  return updatedCalendars;
};

export const syncCalendarTasks = async (
  calendarId: string,
  queryClient: QueryClient,
  setSyncingCalendarId: (id: string | null) => void,
) => {
  const accounts = getAllAccounts();
  const account = accounts.find((a) => a.calendars.some((c) => c.id === calendarId));

  if (!account) {
    syncLog.error('Calendar not found in any account, calendarId:', calendarId);
    return;
  }

  const calendar = account.calendars.find((c) => c.id === calendarId);
  if (!calendar) {
    syncLog.error('Calendar not found');
    return;
  }

  // Set syncing state for this calendar
  setSyncingCalendarId(calendarId);

  try {
    // Ensure we're connected
    if (!CalDAVClient.isConnected(account.id)) {
      await CalDAVClient.reconnect(account);
    }

    const client = CalDAVClient.getForAccount(account.id);

    // STEP 0: Process pending deletions for this calendar
    await processPendingDeletions(client, calendarId, calendar.displayName);

    // STEP 1: Push unsynced local tasks to server
    await pushUnsyncedTasks(client, calendar, calendarId);

    // STEP 2: Fetch tasks from server
    const remoteTasks = await client.fetchTasks(calendar);

    // If fetchTasks returns null, it indicates a server error (not just empty)
    if (remoteTasks === null) {
      syncLog.warn(
        `Failed to fetch tasks from ${calendar.displayName}. Local changes were pushed successfully, but skipping server comparison to prevent data loss.`,
      );
      return;
    }

    // Re-get local tasks (may have been updated by push)
    const updatedLocalTasks = getTasksByCalendar(calendarId);
    const localUids = new Set(updatedLocalTasks.map((t) => t.uid));
    const remoteUids = new Set(remoteTasks.map((t) => t.uid));

    // STEP 3: Process remote tasks
    for (const remoteTask of remoteTasks) {
      if (!localUids.has(remoteTask.uid)) {
        processNewRemoteTask(remoteTask);
      } else {
        const localTask = updatedLocalTasks.find((t) => t.uid === remoteTask.uid);
        if (localTask) {
          processExistingRemoteTask(remoteTask, localTask);
        }
      }
    }

    // STEP 4: Find tasks deleted on server (in local but not in remote)
    for (const localTask of updatedLocalTasks) {
      if (localTask.synced && !remoteUids.has(localTask.uid)) {
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
};

export const performFullSync = async (
  queryClient: QueryClient,
  setSyncingCalendarId: (id: string | null) => void,
) => {
  await reconnectAccounts();

  // get fresh accounts from data layer
  let freshAccounts = getAllAccounts();

  // sync calendars for each account (add/remove/update calendars)
  for (const account of freshAccounts) {
    try {
      await syncCalendarsForAccount(account.id, queryClient);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      syncLog.error(`Failed to sync calendars for ${account.name}:`, error);
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
        await syncCalendarTasks(calendar.id, queryClient, setSyncingCalendarId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        syncLog.error(`Failed to sync calendar ${calendar.displayName}:`, error);
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
};

export const pushTaskToServer = async (task: Task, queryClient: QueryClient) => {
  const accounts = getAllAccounts();
  const account = accounts.find((a) => a.id === task.accountId);
  if (!account) return;

  const calendar = account.calendars.find((c) => c.id === task.calendarId);
  if (!calendar) return;

  if (!CalDAVClient.isConnected(account.id)) {
    await CalDAVClient.reconnect(account);
  }

  const client = CalDAVClient.getForAccount(account.id);

  if (task.href) {
    // Update existing
    const result = await client.updateTask(task);
    if (result) {
      updateTask(task.id, { etag: result.etag, synced: true });
    }
  } else {
    // Create new
    const result = await client.createTask(calendar, task);
    if (result) {
      updateTask(task.id, { href: result.href, etag: result.etag, synced: true });
    }
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
};

export const removeTaskFromServer = async (task: Task) => {
  if (!task.href) return true; // Not on server yet

  const accounts = getAllAccounts();
  const account = accounts.find((a) => a.id === task.accountId);
  if (!account) return false;

  if (!CalDAVClient.isConnected(account.id)) {
    await CalDAVClient.reconnect(account);
  }

  return CalDAVClient.getForAccount(account.id).deleteTask(task);
};
