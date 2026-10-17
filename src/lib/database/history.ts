import type DatabasePlugin from '@tauri-apps/plugin-sql';
import type { TaskHistoryRow } from '$lib/database/types';
import type { TaskHistoryEntry } from '$types/task/history';
import type { Task } from '$types/task/model';
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

// we don't use the 'completed' field anymore so we'll want to to ignore it
const LEGACY_HISTORY_FIELDS = new Set<string>(['completed']);
const MAX_SQLITE_PARAMETERS = 900;

interface TaskHistoryUpdate {
  taskUid: string;
  oldTask: Task;
  updates: Partial<Task>;
}

interface TaskHistoryChange {
  id: string;
  taskUid: string;
  changedAt: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

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
  await logHistoryForTaskUpdates(conn, [{ taskUid, oldTask, updates }]);
};

export const logHistoryForTaskUpdates = async (
  conn: DatabasePlugin,
  taskUpdates: TaskHistoryUpdate[],
) => {
  const changedAt = new Date().toISOString();
  const changes: TaskHistoryChange[] = [];

  for (const { taskUid, oldTask, updates } of taskUpdates) {
    for (const field of HISTORY_FIELDS) {
      if (!(field in updates)) continue;
      const oldValue = serializeHistoryValue(oldTask[field]);
      const newValue = serializeHistoryValue(updates[field]);
      if (oldValue === newValue) continue;

      changes.push({
        id: generateUUID(),
        taskUid,
        changedAt,
        field,
        oldValue,
        newValue,
      });
    }
  }

  const parameterCount = 6;
  const changesPerBatch = Math.floor(MAX_SQLITE_PARAMETERS / parameterCount);
  for (let offset = 0; offset < changes.length; offset += changesPerBatch) {
    const batch = changes.slice(offset, offset + changesPerBatch);
    const params = batch.flatMap((change) => [
      change.id,
      change.taskUid,
      change.changedAt,
      change.field,
      change.oldValue,
      change.newValue,
    ]);
    const placeholders = batch
      .map((_, changeIndex) => {
        const start = changeIndex * parameterCount;
        return `(${Array.from(
          { length: parameterCount },
          (_value, parameterIndex) => `$${start + parameterIndex + 1}`,
        ).join(',')})`;
      })
      .join(',');

    await conn.execute(
      `INSERT INTO task_history (id, task_uid, changed_at, field, old_value, new_value)
       VALUES ${placeholders}`,
      params,
    );
  }
};

export const logTaskChange = async (
  conn: DatabasePlugin,
  taskUid: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
) => {
  if (LEGACY_HISTORY_FIELDS.has(field)) return;

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
    "SELECT * FROM task_history WHERE task_uid = $1 AND field != 'completed' ORDER BY changed_at DESC",
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
