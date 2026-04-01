import type DatabasePlugin from '@tauri-apps/plugin-sql';
import type { Task } from '$types';
import type { TaskHistoryEntry, TaskHistoryRow } from '$types/database';
import { generateUUID } from '$utils/misc';

const HISTORY_FIELDS = [
  'title',
  'description',
  'status',
  'percentComplete',
  'priority',
  'startDate',
  'startDateAllDay',
  'dueDate',
  'dueDateAllDay',
  'tags',
  'reminders',
  'parentUid',
  'url',
  'calendarId',
  'rrule',
  'repeatFrom',
  'accountId',
] as const;

const serializeHistoryValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value);
};

export const logHistoryForTaskUpdate = async (
  conn: DatabasePlugin,
  taskUid: string,
  oldTask: Task,
  updates: Partial<Task>,
) => {
  for (const field of HISTORY_FIELDS) {
    if (!(field in updates)) continue;
    const oldVal = serializeHistoryValue(oldTask[field]);
    const newVal = serializeHistoryValue(updates[field]);
    if (oldVal !== newVal) {
      await logTaskChange(conn, taskUid, field, oldVal, newVal);
    }
  }
};

export const logTaskChange = async (
  conn: DatabasePlugin,
  taskUid: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
) => {
  await conn.execute(
    `INSERT INTO task_history (id, task_uid, changed_at, field, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [generateUUID(), taskUid, new Date().toISOString(), field, oldValue, newValue],
  );
};

export const getTaskHistory = async (
  conn: DatabasePlugin,
  taskUid: string,
): Promise<TaskHistoryEntry[]> => {
  const rows = await conn.select<TaskHistoryRow[]>(
    'SELECT * FROM task_history WHERE task_uid = $1 ORDER BY changed_at DESC',
    [taskUid],
  );
  return rows.map((row) => ({
    id: row.id,
    taskUid: row.task_uid,
    changedAt: new Date(row.changed_at),
    field: row.field,
    oldValue: row.old_value,
    newValue: row.new_value,
  }));
};
