import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { settingsStore } from '$context/settingsContext';
import { getAllAccounts } from '$lib/database/accounts';
import { rowToTask } from '$lib/database/converters';
import { getUIState, setSelectedTask } from '$lib/database/ui';
import { toAppleEpoch } from '$lib/ical/vtodo';
import type { Task, TaskStatus } from '$types';
import type { TaskRow } from '$types/database';
import { generateUUID } from '$utils/misc';
import { getRecentlyDeletedRetentionCutoff } from '$utils/taskDeletion';

export const getAllTasks = async (conn: DatabasePlugin) => {
  const rows = await conn.select<TaskRow[]>('SELECT * FROM tasks');
  return rows.map(rowToTask);
};

export const getTaskById = async (conn: DatabasePlugin, id: string) => {
  const rows = await conn.select<TaskRow[]>('SELECT * FROM tasks WHERE id = $1', [id]);
  return rows.length > 0 ? rowToTask(rows[0]) : undefined;
};

export const getTaskByUid = async (conn: DatabasePlugin, uid: string) => {
  const rows = await conn.select<TaskRow[]>('SELECT * FROM tasks WHERE uid = $1', [uid]);
  return rows.length > 0 ? rowToTask(rows[0]) : undefined;
};

export const getTasksByCalendar = async (conn: DatabasePlugin, calendarId: string) => {
  const rows = await conn.select<TaskRow[]>('SELECT * FROM tasks WHERE calendar_id = $1', [
    calendarId,
  ]);
  return rows.map(rowToTask);
};

export const getTasksByTag = async (conn: DatabasePlugin, tagId: string) => {
  const rows = await conn.select<TaskRow[]>('SELECT * FROM tasks WHERE tags LIKE $1', [
    `%"${tagId}"%`,
  ]);
  return rows.map(rowToTask);
};

export const getChildTasks = async (conn: DatabasePlugin, parentUid: string) => {
  const rows = await conn.select<TaskRow[]>('SELECT * FROM tasks WHERE parent_uid = $1', [
    parentUid,
  ]);
  return rows.map(rowToTask);
};

export const countChildren = async (conn: DatabasePlugin, parentUid: string) => {
  const rows = await conn.select<Array<{ count: number }>>(
    'SELECT COUNT(*) as count FROM tasks WHERE parent_uid = $1',
    [parentUid],
  );
  return rows[0]?.count || 0;
};

/**
 * resolve tags for a new task, applying active tag and defaults
 */
const resolveTaskTags = (
  taskTags: string[] | undefined,
  activeTagId: string | null,
  defaultTags: string[],
) => {
  let tags = taskTags ?? [];
  if (activeTagId && !tags.includes(activeTagId)) {
    tags = [activeTagId, ...tags];
  }
  if (tags.length === 0 && defaultTags.length > 0) {
    tags = [...defaultTags];
  }
  return tags;
};

/**
 * resolve calendar and account for a new task
 */
const resolveCalendarAndAccount = async (
  conn: DatabasePlugin,
  calendarId: string | null,
  accountId: string | null,
  defaultCalendarId: string,
): Promise<{ calendarId: string | null; accountId: string | null }> => {
  if (calendarId) {
    return { calendarId, accountId };
  }

  const accounts = await getAllAccounts(conn);

  // try default calendar first
  if (defaultCalendarId) {
    for (const account of accounts) {
      const cal = account.calendars.find((c) => c.id === defaultCalendarId);
      if (cal) {
        return { calendarId: cal.id, accountId: account.id };
      }
    }
  }

  // fall back to first available calendar
  const first = accounts.find((a) => a.calendars.length > 0);
  if (first) {
    return { calendarId: first.calendars[0].id, accountId: first.id };
  }

  return { calendarId: null, accountId: null };
};

/**
 * build task insert parameters array
 */
const buildTaskInsertParams = (task: Task): unknown[] => [
  task.id,
  task.uid,
  task.etag || null,
  task.href || null,
  task.title,
  task.description,
  task.completed ? 1 : 0,
  task.completedAt ? task.completedAt.toISOString() : null,
  task.tags && task.tags.length > 0 ? JSON.stringify(task.tags) : null,
  task.categoryId || null,
  task.priority,
  task.startDate ? task.startDate.toISOString() : null,
  task.startDateAllDay ? 1 : 0,
  task.dueDate ? task.dueDate.toISOString() : null,
  task.dueDateAllDay ? 1 : 0,
  task.createdAt.toISOString(),
  task.modifiedAt.toISOString(),
  task.deletedAt ? task.deletedAt.toISOString() : null,
  task.reminders && task.reminders.length > 0 ? JSON.stringify(task.reminders) : null,
  task.parentUid || null,
  task.isCollapsed ? 1 : 0,
  task.sortOrder,
  task.accountId || null,
  task.calendarId || null,
  task.synced ? 1 : 0,
  task.localOnly ? 1 : 0,
  task.url || null,
  task.status,
  task.percentComplete ?? null,
  task.rrule || null,
  task.repeatFrom ?? 0,
];

export const createTask = async (conn: DatabasePlugin, taskData: Partial<Task>) => {
  const now = new Date();
  const { defaultCalendarId, defaultPriority, defaultTags } = settingsStore.getState();
  const uiState = await getUIState(conn);

  const tags = resolveTaskTags(taskData.tags, uiState.activeTagId, defaultTags);

  const { calendarId, accountId } = await resolveCalendarAndAccount(
    conn,
    taskData.calendarId ?? uiState.activeCalendarId,
    taskData.accountId ?? uiState.activeAccountId,
    defaultCalendarId ?? '',
  );

  const maxOrderRows = await conn.select<Array<{ max_order: number | null }>>(
    'SELECT MAX(sort_order) as max_order FROM tasks',
  );
  const maxSortOrder = maxOrderRows[0]?.max_order ?? toAppleEpoch(now.getTime()) - 1;

  const task: Task = {
    id: generateUUID(),
    uid: generateUUID(),
    title: taskData.title ?? 'New Task',
    description: taskData.description ?? '',
    status: 'needs-action',
    completed: false,
    priority: taskData.priority ?? defaultPriority,
    sortOrder: maxSortOrder + 1,
    accountId: accountId ?? '',
    calendarId: calendarId ?? '',
    synced: false,
    createdAt: now,
    modifiedAt: now,
    localOnly: !calendarId || !accountId,
    ...taskData,
    tags,
  };

  await conn.execute(
    `INSERT INTO tasks (
      id, uid, etag, href, title, description, completed, completed_at,
      tags, category_id, priority, start_date, start_date_all_day,
      due_date, due_date_all_day, created_at, modified_at, deleted_at, reminders,
      parent_uid, is_collapsed, sort_order, account_id,
      calendar_id, synced, local_only, url, status, percent_complete,
      rrule, repeat_from
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)`,
    buildTaskInsertParams(task),
  );

  return task;
};

/**
 * build task update parameters array
 */
const buildTaskUpdateParams = (task: Task, id: string): unknown[] => [
  task.uid,
  task.etag || null,
  task.href || null,
  task.title,
  task.description,
  task.completed ? 1 : 0,
  task.completedAt ? task.completedAt.toISOString() : null,
  task.tags && task.tags.length > 0 ? JSON.stringify(task.tags) : null,
  task.categoryId || null,
  task.priority,
  task.startDate ? task.startDate.toISOString() : null,
  task.startDateAllDay ? 1 : 0,
  task.dueDate ? task.dueDate.toISOString() : null,
  task.dueDateAllDay ? 1 : 0,
  task.modifiedAt.toISOString(),
  task.deletedAt ? task.deletedAt.toISOString() : null,
  task.reminders && task.reminders.length > 0 ? JSON.stringify(task.reminders) : null,
  task.parentUid || null,
  task.isCollapsed ? 1 : 0,
  task.sortOrder,
  task.accountId || null,
  task.calendarId || null,
  task.synced ? 1 : 0,
  task.localOnly ? 1 : 0,
  task.url || null,
  task.status,
  task.percentComplete ?? null,
  task.rrule || null,
  task.repeatFrom ?? 0,
  id,
];

/**
 * merge task updates with existing task, handling status/completed sync
 */
const mergeTaskUpdates = (existing: Task, updates: Partial<Task>) => {
  const merged: Task = {
    ...existing,
    ...updates,
    modifiedAt: updates.modifiedAt !== undefined ? updates.modifiedAt : new Date(),
    synced: updates.synced !== undefined ? updates.synced : false,
  };

  if (updates.status !== undefined && updates.completed === undefined) {
    merged.completed = updates.status === 'completed';
  } else if (updates.completed !== undefined && updates.status === undefined) {
    merged.status = updates.completed ? 'completed' : 'needs-action';
  }

  return merged;
};

export const updateTask = async (conn: DatabasePlugin, id: string, updates: Partial<Task>) => {
  const existing = await getTaskById(conn, id);
  if (!existing) return undefined;

  const merged = mergeTaskUpdates(existing, updates);

  await conn.execute(
    `UPDATE tasks SET
      uid=$1, etag=$2, href=$3, title=$4, description=$5,
      completed=$6, completed_at=$7, tags=$8, category_id=$9,
      priority=$10, start_date=$11, start_date_all_day=$12,
      due_date=$13, due_date_all_day=$14, modified_at=$15, deleted_at=$16,
      reminders=$17, parent_uid=$18, is_collapsed=$19,
      sort_order=$20, account_id=$21, calendar_id=$22, synced=$23,
      local_only=$24, url=$25, status=$26, percent_complete=$27,
      rrule=$28, repeat_from=$29
     WHERE id=$30`,
    buildTaskUpdateParams(merged, id),
  );

  return merged;
};

export const deleteTask = async (conn: DatabasePlugin, id: string, deleteChildren = true) => {
  const task = await getTaskById(conn, id);
  if (!task) return;

  const getAllDescendantIds = async (parentUid: string): Promise<string[]> => {
    const children = await getChildTasks(conn, parentUid);
    const childIds = children.map((ch) => ch.id);
    const nested = await Promise.all(children.map((ch) => getAllDescendantIds(ch.uid)));
    return [...childIds, ...nested.flat()];
  };

  const descendantIds = await getAllDescendantIds(task.uid);
  const toDelete = deleteChildren ? [id, ...descendantIds] : [id];
  const deletedAt = new Date().toISOString();

  const tasks = await Promise.all(toDelete.map((tid) => getTaskById(conn, tid)));
  for (const t of tasks.filter((t): t is Task => !!t && !!t.href)) {
    await conn.execute(
      `INSERT OR REPLACE INTO pending_deletions (
        uid, href, account_id, calendar_id, etag, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [t.uid, t.href, t.accountId, t.calendarId, t.etag ?? null, deletedAt],
    );
  }

  if (!deleteChildren) {
    await conn.execute(
      'UPDATE tasks SET parent_uid = NULL, modified_at = $1, synced = 0 WHERE parent_uid = $2',
      [new Date().toISOString(), task.uid],
    );
  }

  const placeholders = toDelete.map((_, i) => `$${i + 2}`).join(', ');
  await conn.execute(
    `UPDATE tasks SET deleted_at = $1, modified_at = $1 WHERE id IN (${placeholders})`,
    [deletedAt, ...toDelete],
  );

  const uiState = await getUIState(conn);
  if (toDelete.includes(uiState.selectedTaskId || '')) {
    await setSelectedTask(conn, null);
  }
};

export const restoreTask = async (conn: DatabasePlugin, id: string, restoreChildren = true) => {
  const task = await getTaskById(conn, id);
  if (!task) return;

  const getAllDescendantIds = async (parentUid: string): Promise<string[]> => {
    const children = await getChildTasks(conn, parentUid);
    const childIds = children.map((ch) => ch.id);
    const nested = await Promise.all(children.map((ch) => getAllDescendantIds(ch.uid)));
    return [...childIds, ...nested.flat()];
  };

  const descendantIds = await getAllDescendantIds(task.uid);
  const toRestore = restoreChildren ? [id, ...descendantIds] : [id];
  const tasks = await Promise.all(toRestore.map((tid) => getTaskById(conn, tid)));
  const now = new Date().toISOString();
  const placeholders = toRestore.map((_, i) => `$${i + 1}`).join(', ');

  await conn.execute(
    `UPDATE tasks SET deleted_at = NULL, href = NULL, etag = NULL, synced = 0, modified_at = $${toRestore.length + 1} WHERE id IN (${placeholders})`,
    [...toRestore, now],
  );

  for (const t of tasks.filter((t): t is Task => !!t)) {
    await conn.execute('DELETE FROM pending_deletions WHERE uid = $1', [t.uid]);
    await conn.execute('DELETE FROM caldav_task_objects WHERE task_uid = $1', [t.uid]);
  }
};

export const permanentlyDeleteTask = async (
  conn: DatabasePlugin,
  id: string,
  deleteChildren = true,
) => {
  const task = await getTaskById(conn, id);
  if (!task) return;

  const getAllDescendantIds = async (parentUid: string): Promise<string[]> => {
    const children = await getChildTasks(conn, parentUid);
    const childIds = children.map((ch) => ch.id);
    const nested = await Promise.all(children.map((ch) => getAllDescendantIds(ch.uid)));
    return [...childIds, ...nested.flat()];
  };

  const descendantIds = await getAllDescendantIds(task.uid);
  const toDelete = deleteChildren ? [id, ...descendantIds] : [id];

  if (!deleteChildren) {
    await conn.execute(
      'UPDATE tasks SET parent_uid = NULL, modified_at = $1, synced = 0 WHERE parent_uid = $2',
      [new Date().toISOString(), task.uid],
    );
  }

  const placeholders = toDelete.map((_, i) => `$${i + 1}`).join(', ');
  const tasks = await Promise.all(toDelete.map((tid) => getTaskById(conn, tid)));
  await conn.execute(`DELETE FROM tasks WHERE id IN (${placeholders})`, toDelete);

  for (const t of tasks.filter((t): t is Task => !!t)) {
    await conn.execute('DELETE FROM caldav_task_objects WHERE task_uid = $1', [t.uid]);
  }

  const uiState = await getUIState(conn);
  if (toDelete.includes(uiState.selectedTaskId || '')) {
    await setSelectedTask(conn, null);
  }
};

export const deleteExpiredRecentlyDeletedTasks = async (
  conn: DatabasePlugin,
  now: Date = new Date(),
  retentionDays?: number,
) => {
  const cutoff = getRecentlyDeletedRetentionCutoff(now, retentionDays).toISOString();
  const expiredTasks = await conn.select<Array<{ id: string; uid: string }>>(
    'SELECT id, uid FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at <= $1',
    [cutoff],
  );

  if (expiredTasks.length === 0) {
    return 0;
  }

  const ids = expiredTasks.map((task) => task.id);
  const uids = expiredTasks.map((task) => task.uid);
  const nowIso = new Date().toISOString();

  const uidPlaceholders = uids.map((_, i) => `$${i + 1}`).join(', ');
  await conn.execute(
    `UPDATE tasks SET parent_uid = NULL, modified_at = $${uids.length + 1}, synced = 0 WHERE parent_uid IN (${uidPlaceholders})`,
    [...uids, nowIso],
  );

  const idPlaceholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  await conn.execute(`DELETE FROM tasks WHERE id IN (${idPlaceholders})`, ids);

  for (const uid of uids) {
    await conn.execute('DELETE FROM caldav_task_objects WHERE task_uid = $1', [uid]);
  }

  const uiState = await getUIState(conn);
  if (ids.includes(uiState.selectedTaskId || '')) {
    await setSelectedTask(conn, null);
  }

  return expiredTasks.length;
};

export const toggleTaskComplete = async (conn: DatabasePlugin, id: string) => {
  const task = await getTaskById(conn, id);
  if (!task) return;

  const newStatus: TaskStatus =
    task.status === 'completed'
      ? 'needs-action'
      : task.status === 'cancelled' || task.status === 'in-process'
        ? 'needs-action'
        : 'completed';

  await updateTask(conn, id, {
    status: newStatus,
    completed: newStatus === 'completed',
    completedAt: newStatus === 'completed' ? new Date() : undefined,
    percentComplete: newStatus === 'completed' ? 100 : 0,
  });
};
