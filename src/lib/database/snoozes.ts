import type DatabasePlugin from '@tauri-apps/plugin-sql';

const LEGACY_MIGRATION_KEY = 'task_snoozes_local_storage_v1';

interface TaskSnoozeRow {
  task_id: string;
  snoozed_until: number;
}

export const getTaskSnoozes = async (
  conn: DatabasePlugin,
  now: number = Date.now(),
): Promise<Array<[string, number]>> => {
  await conn.execute(
    `DELETE FROM task_snoozes
     WHERE snoozed_until <= $1
        OR task_id NOT IN (SELECT id FROM tasks)`,
    [now],
  );
  const rows = await conn.select<TaskSnoozeRow[]>(
    'SELECT task_id, snoozed_until FROM task_snoozes',
  );
  return rows.map((row) => [row.task_id, row.snoozed_until]);
};

export const setTaskSnooze = async (conn: DatabasePlugin, taskId: string, snoozedUntil: number) => {
  await conn.execute(
    `INSERT INTO task_snoozes (task_id, snoozed_until)
     VALUES ($1, $2)
     ON CONFLICT(task_id) DO UPDATE SET snoozed_until = excluded.snoozed_until`,
    [taskId, snoozedUntil],
  );
};

export const clearTaskSnooze = async (conn: DatabasePlugin, taskId: string) => {
  await conn.execute('DELETE FROM task_snoozes WHERE task_id = $1', [taskId]);
};

export const hasImportedLegacyTaskSnoozes = async (conn: DatabasePlugin) => {
  const rows = await conn.select<Array<{ value: string }>>(
    'SELECT value FROM app_metadata WHERE key = $1',
    [LEGACY_MIGRATION_KEY],
  );
  return rows[0]?.value === 'complete';
};

export const importLegacyTaskSnoozes = async (
  conn: DatabasePlugin,
  snoozes: Array<[string, number]>,
) => {
  for (const [taskId, snoozedUntil] of snoozes) {
    await conn.execute(
      `INSERT INTO task_snoozes (task_id, snoozed_until)
       SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM tasks WHERE id = $1)
       ON CONFLICT(task_id) DO UPDATE SET snoozed_until = excluded.snoozed_until`,
      [taskId, snoozedUntil],
    );
  }
  await conn.execute(
    `INSERT INTO app_metadata (key, value) VALUES ($1, 'complete')
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [LEGACY_MIGRATION_KEY],
  );
};
