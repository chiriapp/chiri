import type { QueryClient } from '@tanstack/react-query';
import { emit } from '@tauri-apps/api/event';
import { MENU_EVENTS } from '$constants/menu';
import { settingsStore } from '$context/settingsContext';
import { toastManager } from '$hooks/ui/useToast';
import { CalDAVClient } from '$lib/caldav';
import { db } from '$lib/database';
import { taskToVTodo, vtodoToTask } from '$lib/ical/vtodo';
import { loggers } from '$lib/logger';
import { disablePushForCalendar } from '$lib/push';
import { queryKeys } from '$lib/queryClient';
import { dataStore } from '$lib/store';
import { getAccountById, getAllAccounts } from '$lib/store/accounts';
import { addCalendar, deleteCalendar, updateCalendar } from '$lib/store/calendars';
import { createTag, getAllTags, updateTag } from '$lib/store/tags';
import { createTask, getTasksByCalendar, removeLocalTask, updateTask } from '$lib/store/tasks';
import { getUIState, setAllTasksView } from '$lib/store/ui';
import { getErrorMessage } from '$lib/tauriHttp';
import type { Account, CalDAVTaskObject, Calendar, Task, TaskWithCalDAVObject } from '$types';
import { getColorSchemeColorPresets } from '$utils/color/scheme';
import { generateTagColor } from '$utils/color/tag';
import { resolveEffectiveTheme } from '$utils/color/theme';

const log = loggers.dataStore;
const syncLog = loggers.sync;
const OAUTH_REFRESH_BUFFER_MS = 60 * 1000;

const taskFieldsForBaselineMerge = [
  'title',
  'description',
  'status',
  'completedAt',
  'percentComplete',
  'priority',
  'startDate',
  'startDateAllDay',
  'dueDate',
  'dueDateAllDay',
  'parentUid',
  'sortOrder',
  'url',
  'rrule',
  'repeatFrom',
] as const satisfies readonly (keyof Task)[];

const valueEquals = (left: unknown, right: unknown) => {
  if (left instanceof Date || right instanceof Date) {
    const leftTime = left instanceof Date ? left.getTime() : undefined;
    const rightTime = right instanceof Date ? right.getTime() : undefined;
    return leftTime === rightTime;
  }

  return left === right;
};

const stringArraysEqual = (left: string[] | undefined, right: string[] | undefined) => {
  const leftValues = left ?? [];
  const rightValues = right ?? [];
  return (
    leftValues.length === rightValues.length && leftValues.every((id) => rightValues.includes(id))
  );
};

const buildSyncedTaskObject = (
  task: Task,
  href: string,
  etag: string | undefined,
): CalDAVTaskObject => {
  const syncedTask = { ...task, href, etag, synced: true };
  return {
    taskUid: task.uid,
    accountId: task.accountId,
    calendarId: task.calendarId,
    href,
    etag,
    vtodo: taskToVTodo(syncedTask),
    lastSyncAt: new Date(),
  };
};

const stripRemoteTaskMetadata = ({
  caldavObject: _caldavObject,
  tagColorsByName: _tagColorsByName,
  ...taskData
}: TaskWithCalDAVObject): Task => taskData;

const persistTaskObject = async (object: CalDAVTaskObject) => {
  try {
    await db.upsertCalDAVTaskObject(object);
  } catch (error) {
    syncLog.error('Failed to persist CalDAV task object baseline:', error);
  }
};

const removeTaskObject = async (taskUid: string) => {
  try {
    await db.removeCalDAVTaskObjectByUid(taskUid);
  } catch (error) {
    syncLog.error('Failed to remove CalDAV task object baseline:', error);
  }
};

// helper: process pending deletions for a calendar
const processPendingDeletions = async (
  client: ReturnType<typeof CalDAVClient.getForAccount>,
  calendarId: string,
  calendarDisplayName: string,
) => {
  const pendingDeletions = getPendingDeletions();
  const calendarDeletions = pendingDeletions.filter((d) => d.calendarId === calendarId);

  for (const deletion of calendarDeletions) {
    try {
      const deleted = await client.deleteTask({
        id: '',
        uid: deletion.uid,
        href: deletion.href,
        etag: deletion.etag,
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

      if (deleted) {
        clearPendingDeletion(deletion.uid);
      } else {
        const error = `Server did not confirm deletion for ${deletion.href}`;
        syncLog.warn(error);
        recordPendingDeletionAttempt(deletion.uid, error);
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      syncLog.error(
        `Failed to delete task from calendar ${calendarDisplayName} from server:`,
        error,
      );
      recordPendingDeletionAttempt(deletion.uid, errorMessage);
    }
  }
};

// helper: push unsynced local tasks to server
const pushUnsyncedTasks = async (
  client: ReturnType<typeof CalDAVClient.getForAccount>,
  calendar: Calendar,
  calendarId: string,
) => {
  const localCalendarTasks = getTasksByCalendar(calendarId);
  const unsyncedTasks = localCalendarTasks.filter((t) => !t.synced && !t.deletedAt);

  for (const task of unsyncedTasks) {
    try {
      if (task.href) {
        const result = await client.updateTask(task);
        if (result) {
          await persistTaskObject(buildSyncedTaskObject(task, task.href, result.etag));
          updateTask(task.id, { etag: result.etag, synced: true });
        }
      } else {
        const result = await client.createTask(calendar, task);
        if (result) {
          await persistTaskObject(buildSyncedTaskObject(task, result.href, result.etag));
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

const getBaselineTask = async (taskUid: string) => {
  try {
    const object = await db.getCalDAVTaskObjectByUid(taskUid);
    if (!object) return null;
    return vtodoToTask(object.vtodo, object.accountId, object.calendarId, object.href, object.etag);
  } catch (error) {
    syncLog.error('Failed to load CalDAV task object baseline:', error);
    return null;
  }
};

const buildBaselineMergeUpdates = (
  remoteTask: TaskWithCalDAVObject,
  localTask: Task,
  baselineTask: Task,
  remoteTagIds: string[],
) => {
  const updates: Partial<Task> = {
    href: remoteTask.href ?? remoteTask.caldavObject?.href,
    etag: remoteTask.etag ?? remoteTask.caldavObject?.etag,
    modifiedAt: localTask.modifiedAt,
    synced: false,
  };

  for (const field of taskFieldsForBaselineMerge) {
    const remoteValue = remoteTask[field];
    const localValue = localTask[field];
    const baselineValue = baselineTask[field];

    if (!valueEquals(remoteValue, baselineValue) && valueEquals(localValue, baselineValue)) {
      updates[field] = remoteValue as never;
    }
  }

  const baselineTagIds = getRemoteCategoryNames(baselineTask).map((name: string) =>
    ensureTagExists(name),
  );
  const remoteTagsChanged = !stringArraysEqual(remoteTagIds, baselineTagIds);
  const localTagsUnchanged = stringArraysEqual(localTask.tags, baselineTagIds);
  if (remoteTagsChanged && localTagsUnchanged) {
    updates.tags = remoteTagIds;
  }

  return updates;
};

// helper: process a new task from server
const processNewRemoteTask = async (remoteTask: TaskWithCalDAVObject) => {
  const remoteTaskData = stripRemoteTaskMetadata(remoteTask);
  const categoryNames = getRemoteCategoryNames(remoteTask);
  const tagIds = categoryNames.map((name: string) => ensureTagExists(name));
  applyRemoteTagColors(remoteTask, categoryNames);

  createTask({
    ...remoteTaskData,
    href: remoteTask.href ?? remoteTask.caldavObject?.href,
    etag: remoteTask.etag ?? remoteTask.caldavObject?.etag,
    tags: tagIds,
  });
  if (remoteTask.caldavObject) {
    await persistTaskObject(remoteTask.caldavObject);
  }
};

// helper: process an existing task from server (update if needed)
const processExistingRemoteTask = async (remoteTask: TaskWithCalDAVObject, localTask: Task) => {
  const remoteTaskData = stripRemoteTaskMetadata(remoteTask);
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
        href: remoteTask.href ?? remoteTask.caldavObject?.href,
        etag: remoteTask.etag ?? remoteTask.caldavObject?.etag,
        tags: remoteTagIds,
        synced: true,
      });
    } else {
      const baselineTask = await getBaselineTask(localTask.uid);
      if (baselineTask) {
        updateTask(
          localTask.id,
          buildBaselineMergeUpdates(remoteTask, localTask, baselineTask, remoteTagIds),
        );
      }
    }
  } else if (!tagsMatch && localTask.synced) {
    updateTask(localTask.id, { tags: remoteTagIds, synced: true });
  }

  if (remoteTask.caldavObject) {
    await persistTaskObject(remoteTask.caldavObject);
  }
};

export const getPendingDeletions = () => {
  return dataStore.load().pendingDeletions;
};

export const clearPendingDeletion = (uid: string) => {
  const data = dataStore.load();
  const localTask = (data.tasks ?? []).find((task) => task.uid === uid);

  db.clearPendingDeletion(uid).catch((e) =>
    log.error('Failed to persist pending deletion clear:', e),
  );

  if (!localTask || localTask.deletedAt) {
    db.removeCalDAVTaskObjectByUid(uid).catch((e) =>
      log.error('Failed to remove CalDAV task object after deletion:', e),
    );
  }

  dataStore.save({
    ...data,
    pendingDeletions: data.pendingDeletions.filter((d) => d.uid !== uid),
  });
};

export const recordPendingDeletionAttempt = (uid: string, error: string) => {
  const data = dataStore.load();
  const lastAttemptAt = new Date();

  db.markPendingDeletionAttempt(uid, error).catch((e) =>
    log.error('Failed to persist pending deletion attempt:', e),
  );

  dataStore.save({
    ...data,
    pendingDeletions: data.pendingDeletions.map((deletion) =>
      deletion.uid === uid
        ? {
            ...deletion,
            attemptCount: (deletion.attemptCount ?? 0) + 1,
            lastAttemptAt,
            lastError: error,
          }
        : deletion,
    ),
  });
};

export const reconnectAccounts = async () => {
  const accounts = getAllAccounts();
  const failedAccountIds = new Set<string>();
  for (const account of accounts) {
    if (!account.caldav) continue;
    if (shouldReconnectAccount(account)) {
      try {
        await CalDAVClient.reconnect(account);
        syncLog.info(`Reconnected to account: ${account.name}`);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        syncLog.error(`Failed to reconnect account ${account.name}:`, error);
        failedAccountIds.add(account.id);
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
  return failedAccountIds;
};

const isOAuthTokenExpiring = (account: Account) => {
  const caldav = account.caldav;
  if (caldav?.authType !== 'oauth' || !caldav.tokenExpiry) return false;

  const expiresAt = new Date(caldav.tokenExpiry).getTime();
  if (!Number.isFinite(expiresAt)) return true;

  return Date.now() >= expiresAt - OAUTH_REFRESH_BUFFER_MS;
};

const shouldReconnectAccount = (account: Account) => {
  return !CalDAVClient.isConnected(account.id) || isOAuthTokenExpiring(account);
};

const ensureAccountConnected = async (account: Account) => {
  if (shouldReconnectAccount(account)) {
    await CalDAVClient.reconnect(account);
  }
};

export const ensureTagExists = (tagName: string) => {
  const currentTags = getAllTags();
  const existing = currentTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());

  if (existing) {
    return existing.id;
  }

  const settings = settingsStore.getState();
  const colorPresets = getColorSchemeColorPresets(
    settings.colorScheme,
    settings.colorSchemeFlavor,
    resolveEffectiveTheme(settings.theme),
  );

  const newTag = createTag({
    name: tagName,
    color: generateTagColor(tagName, colorPresets),
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
 * check if a calendar needs updates based on remote vs local comparison
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

  // WebDAV Push property changes
  const pushTopicChanged = localCalendar.pushTopic !== remoteCalendar.pushTopic;
  const pushSupportedChanged = localCalendar.pushSupported !== remoteCalendar.pushSupported;
  const pushVapidKeyChanged = localCalendar.pushVapidKey !== remoteCalendar.pushVapidKey;
  const pushPropertiesChanged = pushTopicChanged || pushSupportedChanged || pushVapidKeyChanged;

  const hasChanges =
    displayNameChanged ||
    colorChanged ||
    ctagChanged ||
    syncTokenChanged ||
    serverOrderChanged ||
    pushPropertiesChanged;

  if (!hasChanges) return null;

  return {
    displayName: remoteCalendar.displayName,
    color: serverPropertiesChanged ? remoteCalendar.color : localCalendar.color,
    ctag: remoteCalendar.ctag,
    syncToken: remoteCalendar.syncToken,
    ...(serverOrderChanged ? { sortOrder: remoteCalendar.sortOrder } : {}),
    // always update push properties when they change
    ...(pushPropertiesChanged
      ? {
          pushTopic: remoteCalendar.pushTopic,
          pushSupported: remoteCalendar.pushSupported,
          pushVapidKey: remoteCalendar.pushVapidKey,
        }
      : {}),
  };
};

/**
 * remove locally-deleted calendars that no longer exist on the server
 */
const removeDeletedCalendars = async (
  localCalendars: Calendar[],
  remoteCalendarIds: Set<string>,
  activeCalendarId: string | null,
) => {
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
    syncLog.warn(
      `Removing ${tasks.length} tasks from calendar "${localCalendar.displayName}" locally`,
    );

    try {
      await disablePushForCalendar(localCalendar.accountId, localCalendar.id);
    } catch (error) {
      syncLog.warn(
        `Failed to disable push before removing calendar "${localCalendar.displayName}" locally:`,
        error,
      );
    }

    for (const task of tasks) {
      removeLocalTask(task.id);
    }

    deleteCalendar(localCalendar.accountId, localCalendar.id);
  }

  return needsRedirectToAllTasks;
};

export const syncCalendarsForAccount = async (accountId: string, queryClient: QueryClient) => {
  const accounts = getAllAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return;

  // ensure we're connected
  await ensureAccountConnected(account);

  const client = CalDAVClient.getForAccount(accountId);

  let remoteCalendars: Calendar[];
  try {
    remoteCalendars = await client.fetchCalendars();
  } catch (error) {
    syncLog.error(`Failed to fetch calendars for ${account.name}:`, error);
    const errorMessage = getErrorMessage(error);
    toastManager.error(
      'Calendar Sync Error',
      `${account.name}: ${errorMessage}`,
      'calendar-fetch-error',
    );
    return; // skip calendar sync to avoid deleting calendars based on failed fetch
  }

  syncLog.info(`Found ${remoteCalendars.length} calendars on server for ${account.name}`);

  const localCalendars = account.calendars;

  // build the set of confirmed-existing calendar IDs. Start with what the
  // server listing returned, then verify any "missing" local calendars via a
  // direct PROPFIND before treating them as deleted. Unreliable servers (e.g
  // Vikunja) sometimes return an incomplete listing; the extra PROPFIND lets
  // us distinguish a real deletion from a transient omission, including the
  // case where a flaky listing returns zero calendars
  const confirmedExistingIds = new Set(remoteCalendars.map((c) => c.id));
  const potentiallyDeleted = localCalendars.filter((c) => !confirmedExistingIds.has(c.id));

  for (const calendar of potentiallyDeleted) {
    try {
      const exists = await client.calendarExists(calendar.url);
      if (exists) {
        syncLog.warn(
          `Calendar "${calendar.displayName}" was absent from server listing but still exists via direct PROPFIND. Server listing may be incomplete. Skipping removal.`,
        );
        confirmedExistingIds.add(calendar.id);
      }
    } catch (error) {
      syncLog.warn(
        `Calendar "${calendar.displayName}" was absent from server listing, but direct PROPFIND verification failed. Preserving locally to prevent potential data loss.`,
        error,
      );
      confirmedExistingIds.add(calendar.id);
    }
  }

  const remoteCalendarIds = confirmedExistingIds;
  const calendarSortMode = getUIState().calendarSortConfig.mode;

  // build updated calendar list
  const updatedCalendars: Calendar[] = [];
  const calendarUpdates: Map<string, Partial<Calendar>> = new Map();
  const newCalendars: Calendar[] = [];

  // add/update calendars from server
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
      // new calendar from server
      updatedCalendars.push(remoteCalendar);
      newCalendars.push(remoteCalendar);
    }
  }

  for (const localCalendar of localCalendars) {
    if (
      remoteCalendarIds.has(localCalendar.id) &&
      !updatedCalendars.some((calendar) => calendar.id === localCalendar.id)
    ) {
      updatedCalendars.push(localCalendar);
    }
  }

  // remove calendars deleted on server and check if redirect is needed
  const currentUIState = getUIState();
  const needsRedirectToAllTasks = await removeDeletedCalendars(
    localCalendars,
    remoteCalendarIds,
    currentUIState.activeCalendarId,
  );

  // persist new calendars to database
  for (const calendar of newCalendars) {
    await addCalendar(accountId, calendar);
  }

  // persist calendar property updates to database
  for (const [calendarId, updates] of calendarUpdates) {
    updateCalendar(accountId, calendarId, updates);
  }

  // if selected calendar was deleted, redirect to All Tasks
  if (needsRedirectToAllTasks) {
    syncLog.info('Selected calendar was deleted on server, redirecting to All Tasks');
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

  // set syncing state for this calendar
  setSyncingCalendarId(calendarId);

  try {
    // ensure we're connected
    await ensureAccountConnected(account);

    const client = CalDAVClient.getForAccount(account.id);

    // STEP 0: Process pending deletions for this calendar
    await processPendingDeletions(client, calendarId, calendar.displayName);

    // STEP 1: Push unsynced local tasks to server
    await pushUnsyncedTasks(client, calendar, calendarId);

    // STEP 2: Fetch tasks from server
    const remoteTasks = await client.fetchTasks(calendar);

    // if fetchTasks returns null, it indicates a server error (not just empty)
    if (remoteTasks === null) {
      syncLog.warn(
        `Failed to fetch tasks from ${calendar.displayName}. Local changes were pushed successfully, but skipping server comparison to prevent data loss.`,
      );
      return;
    }

    // re-get local tasks (may have been updated by push)
    const updatedLocalTasks = getTasksByCalendar(calendarId);
    const localUids = new Set(updatedLocalTasks.map((t) => t.uid));
    const remoteUids = new Set(remoteTasks.map((t) => t.uid));

    // STEP 3: Process remote tasks
    for (const remoteTask of remoteTasks) {
      if (!localUids.has(remoteTask.uid)) {
        await processNewRemoteTask(remoteTask);
      } else {
        const localTask = updatedLocalTasks.find((t) => t.uid === remoteTask.uid);
        if (localTask) {
          await processExistingRemoteTask(remoteTask, localTask);
        }
      }
    }

    // STEP 4: find tasks deleted on server (in local but not in remote)
    // use removeLocalTask (not deleteTask) so we don't queue a server-side DELETE
    // the server already removed the resource, and queuing a DELETE could accidentally
    // destroy a resource that was repurposed (e.g. fruux reassigns the UID on the same href)
    for (const localTask of updatedLocalTasks) {
      if (!localTask.deletedAt && localTask.synced && !remoteUids.has(localTask.uid)) {
        await removeTaskObject(localTask.uid);
        removeLocalTask(localTask.id);
      }
    }

    // invalidate queries after sync
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
  } finally {
    // clear syncing state
    setSyncingCalendarId(null);
  }
};

export const performFullSync = async (
  queryClient: QueryClient,
  setSyncingCalendarId: (id: string | null) => void,
  setSyncProgress: (progress: { current: number; total: number } | null) => void,
) => {
  const failedAccountIds = await reconnectAccounts();

  // get fresh accounts from data layer
  let freshAccounts = getAllAccounts();

  // sync calendars for each account (add/remove/update calendars)
  for (const account of freshAccounts) {
    if (!account.caldav) continue;
    if (!getAccountById(account.id)) continue;
    if (failedAccountIds.has(account.id)) continue;
    try {
      await syncCalendarsForAccount(account.id, queryClient);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      syncLog.error(`Failed to sync calendars for ${account.name}:`, error);
      failedAccountIds.add(account.id);
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

  // build flat list of calendars to sync for progress tracking
  const calendarsToSync = freshAccounts
    .filter((a) => a.caldav && getAccountById(a.id) && !failedAccountIds.has(a.id))
    .flatMap((a) => a.calendars);
  const total = calendarsToSync.length;

  // sync tasks for each calendar
  let current = 0;
  for (const account of freshAccounts) {
    if (!account.caldav) continue;
    if (!getAccountById(account.id)) continue;
    if (failedAccountIds.has(account.id)) continue;
    for (const calendar of account.calendars) {
      current += 1;
      setSyncProgress({ current, total });
      try {
        await syncCalendarTasks(calendar.id, queryClient, setSyncingCalendarId);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
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

  setSyncProgress(null);
};

export const pushTaskToServer = async (task: Task, queryClient: QueryClient) => {
  const accounts = getAllAccounts();
  const account = accounts.find((a) => a.id === task.accountId);
  if (!account) return;

  const calendar = account.calendars.find((c) => c.id === task.calendarId);
  if (!calendar) return;

  await ensureAccountConnected(account);

  const client = CalDAVClient.getForAccount(account.id);

  if (task.href) {
    // update existing
    const result = await client.updateTask(task);
    if (result) {
      await persistTaskObject(buildSyncedTaskObject(task, task.href, result.etag));
      updateTask(task.id, { etag: result.etag, synced: true });
    }
  } else {
    // create new
    const result = await client.createTask(calendar, task);
    if (result) {
      await persistTaskObject(buildSyncedTaskObject(task, result.href, result.etag));
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

  await ensureAccountConnected(account);

  const deleted = await CalDAVClient.getForAccount(account.id).deleteTask(task);
  if (deleted) {
    await removeTaskObject(task.uid);
  }
  return deleted;
};
