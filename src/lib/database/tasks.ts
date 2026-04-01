import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { settingsStore } from '$context/settingsContext';
import { getAllAccounts } from '$lib/database/accounts';
import { rowToTask } from '$lib/database/converters';
import { getUIState, setSelectedTask } from '$lib/database/ui';
import { toAppleEpoch } from '$lib/ical/vtodo';
import type { Task, TaskStatus } from '$types';
import type { TaskRow } from '$types/database';
import { generateUUID } from '$utils/misc';

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

export const createTask = async (conn: DatabasePlugin, taskData: Partial<Task>) => {
  const now = new Date();
  const { defaultCalendarId, defaultPriority, defaultTags } = settingsStore.getState();
  const uiState = await getUIState(conn);

  let calendarId = taskData.calendarId ?? uiState.activeCalendarId;
  let accountId = taskData.accountId ?? uiState.activeAccountId;

  let tags = taskData.tags ?? [];
  if (uiState.activeTagId && !tags.includes(uiState.activeTagId)) {
    tags = [uiState.activeTagId, ...tags];
  }
  if (tags.length === 0 && defaultTags.length > 0) {
    tags = [...defaultTags];
  }

  if (!calendarId) {
    const accounts = await getAllAccounts(conn);
    if (defaultCalendarId) {
      for (const account of accounts) {
        const cal = account.calendars.find((cal) => cal.id === defaultCalendarId);
        if (cal) {
          calendarId = cal.id;
          accountId = account.id;
          break;
        }
      }
    }
    if (!calendarId) {
      const first = accounts.find((a) => a.calendars.length > 0);
      if (first) {
        calendarId = first.calendars[0].id;
        accountId = first.id;
      }
    }
  }

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
      due_date, due_date_all_day, created_at, modified_at, reminders,
      parent_uid, is_collapsed, sort_order, account_id,
      calendar_id, synced, local_only, url, status, percent_complete,
      rrule, repeat_from
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)`,
    [
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
    ],
  );

  return task;
};

export const updateTask = async (conn: DatabasePlugin, id: string, updates: Partial<Task>) => {
  const existing = await getTaskById(conn, id);
  if (!existing) return undefined;

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

  await conn.execute(
    `UPDATE tasks SET
      uid=$1, etag=$2, href=$3, title=$4, description=$5,
      completed=$6, completed_at=$7, tags=$8, category_id=$9,
      priority=$10, start_date=$11, start_date_all_day=$12,
      due_date=$13, due_date_all_day=$14, modified_at=$15,
      reminders=$16, parent_uid=$17, is_collapsed=$18,
      sort_order=$19, account_id=$20, calendar_id=$21, synced=$22,
      local_only=$23, url=$24, status=$25, percent_complete=$26,
      rrule=$27, repeat_from=$28
     WHERE id=$29`,
    [
      merged.uid,
      merged.etag || null,
      merged.href || null,
      merged.title,
      merged.description,
      merged.completed ? 1 : 0,
      merged.completedAt ? merged.completedAt.toISOString() : null,
      merged.tags && merged.tags.length > 0 ? JSON.stringify(merged.tags) : null,
      merged.categoryId || null,
      merged.priority,
      merged.startDate ? merged.startDate.toISOString() : null,
      merged.startDateAllDay ? 1 : 0,
      merged.dueDate ? merged.dueDate.toISOString() : null,
      merged.dueDateAllDay ? 1 : 0,
      merged.modifiedAt.toISOString(),
      merged.reminders && merged.reminders.length > 0 ? JSON.stringify(merged.reminders) : null,
      merged.parentUid || null,
      merged.isCollapsed ? 1 : 0,
      merged.sortOrder,
      merged.accountId || null,
      merged.calendarId || null,
      merged.synced ? 1 : 0,
      merged.localOnly ? 1 : 0,
      merged.url || null,
      merged.status,
      merged.percentComplete ?? null,
      merged.rrule || null,
      merged.repeatFrom ?? 0,
      id,
    ],
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

  const tasks = await Promise.all(toDelete.map((tid) => getTaskById(conn, tid)));
  for (const t of tasks.filter((t): t is Task => !!t && !!t.href)) {
    await conn.execute(
      `INSERT OR REPLACE INTO pending_deletions (uid, href, account_id, calendar_id) VALUES ($1,$2,$3,$4)`,
      [t.uid, t.href, t.accountId, t.calendarId],
    );
  }

  if (!deleteChildren) {
    await conn.execute(
      'UPDATE tasks SET parent_uid = NULL, modified_at = $1, synced = 0 WHERE parent_uid = $2',
      [new Date().toISOString(), task.uid],
    );
  }

  const placeholders = toDelete.map((_, i) => `$${i + 1}`).join(', ');
  await conn.execute(`DELETE FROM tasks WHERE id IN (${placeholders})`, toDelete);

  const uiState = await getUIState(conn);
  if (toDelete.includes(uiState.selectedTaskId || '')) {
    await setSelectedTask(conn, null);
  }
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
