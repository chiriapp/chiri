import type DatabasePlugin from '@tauri-apps/plugin-sql';
import type { CalDAVTaskObject } from '$types';
import type { CalDAVTaskObjectRow } from '$types/database';

const rowToCalDAVTaskObject = (row: CalDAVTaskObjectRow): CalDAVTaskObject => ({
  taskUid: row.task_uid,
  accountId: row.account_id,
  calendarId: row.calendar_id,
  href: row.href,
  etag: row.etag ?? undefined,
  vtodo: row.vtodo,
  lastSyncAt: new Date(row.last_sync_at),
});

export const getCalDAVTaskObjectByUid = async (
  conn: DatabasePlugin,
  taskUid: string,
): Promise<CalDAVTaskObject | undefined> => {
  const rows = await conn.select<CalDAVTaskObjectRow[]>(
    'SELECT * FROM caldav_task_objects WHERE task_uid = $1',
    [taskUid],
  );
  return rows.length > 0 ? rowToCalDAVTaskObject(rows[0]) : undefined;
};

export const getCalDAVTaskObjectsByCalendar = async (
  conn: DatabasePlugin,
  calendarId: string,
): Promise<CalDAVTaskObject[]> => {
  const rows = await conn.select<CalDAVTaskObjectRow[]>(
    'SELECT * FROM caldav_task_objects WHERE calendar_id = $1',
    [calendarId],
  );
  return rows.map(rowToCalDAVTaskObject);
};

export const upsertCalDAVTaskObject = async (
  conn: DatabasePlugin,
  object: CalDAVTaskObject,
): Promise<void> => {
  await conn.execute(
    `INSERT OR REPLACE INTO caldav_task_objects (
      task_uid, account_id, calendar_id, href, etag, vtodo, last_sync_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      object.taskUid,
      object.accountId,
      object.calendarId,
      object.href,
      object.etag ?? null,
      object.vtodo,
      object.lastSyncAt.toISOString(),
    ],
  );
};

export const removeCalDAVTaskObjectByUid = async (
  conn: DatabasePlugin,
  taskUid: string,
): Promise<void> => {
  await conn.execute('DELETE FROM caldav_task_objects WHERE task_uid = $1', [taskUid]);
};

export const removeCalDAVTaskObjectsByCalendar = async (
  conn: DatabasePlugin,
  calendarId: string,
): Promise<void> => {
  await conn.execute('DELETE FROM caldav_task_objects WHERE calendar_id = $1', [calendarId]);
};
