import type DatabasePlugin from '@tauri-apps/plugin-sql';
import type { CalDAVTaskObject } from '$lib/caldav/types';
import type { CalDAVTaskObjectRow } from '$lib/database/types';

const rowToCalDAVTaskObject = (row: CalDAVTaskObjectRow): CalDAVTaskObject => ({
  taskUid: row.task_uid,
  accountId: row.account_id,
  calendarId: row.calendar_id,
  href: row.href,
  etag: row.etag ?? undefined,
  vtodo: row.vtodo,
  lastSyncAt: new Date(row.last_sync_at),
});

export const getCalDAVTaskObjectByUid = async (conn: DatabasePlugin, taskUid: string) => {
  const rows = await conn.select<CalDAVTaskObjectRow[]>(
    'SELECT * FROM caldav_task_objects WHERE task_uid = $1',
    [taskUid],
  );
  return rows.length > 0 ? rowToCalDAVTaskObject(rows[0]) : undefined;
};

export const getCalDAVTaskObjectsByCalendar = async (conn: DatabasePlugin, calendarId: string) => {
  const rows = await conn.select<CalDAVTaskObjectRow[]>(
    'SELECT * FROM caldav_task_objects WHERE calendar_id = $1',
    [calendarId],
  );
  return rows.map(rowToCalDAVTaskObject);
};

export const upsertCalDAVTaskObject = async (conn: DatabasePlugin, object: CalDAVTaskObject) => {
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

const MAX_SQLITE_PARAMETERS = 900;
const CALDAV_TASK_OBJECT_PARAMETER_COUNT = 7;

const buildCalDAVTaskObjectParams = (object: CalDAVTaskObject): unknown[] => [
  object.taskUid,
  object.accountId,
  object.calendarId,
  object.href,
  object.etag ?? null,
  object.vtodo,
  object.lastSyncAt.toISOString(),
];

export const upsertCalDAVTaskObjects = async (
  conn: DatabasePlugin,
  objects: CalDAVTaskObject[],
) => {
  const objectsPerBatch = Math.floor(MAX_SQLITE_PARAMETERS / CALDAV_TASK_OBJECT_PARAMETER_COUNT);

  for (let offset = 0; offset < objects.length; offset += objectsPerBatch) {
    const batch = objects.slice(offset, offset + objectsPerBatch);
    const params = batch.flatMap(buildCalDAVTaskObjectParams);
    const placeholders = batch
      .map((_, objectIndex) => {
        const start = objectIndex * CALDAV_TASK_OBJECT_PARAMETER_COUNT;
        return `(${Array.from(
          { length: CALDAV_TASK_OBJECT_PARAMETER_COUNT },
          (_value, parameterIndex) => `$${start + parameterIndex + 1}`,
        ).join(',')})`;
      })
      .join(',');

    await conn.execute(
      `INSERT OR REPLACE INTO caldav_task_objects (
        task_uid, account_id, calendar_id, href, etag, vtodo, last_sync_at
      ) VALUES ${placeholders}`,
      params,
    );
  }

  return objects;
};

export const removeCalDAVTaskObjectByUid = async (conn: DatabasePlugin, taskUid: string) => {
  await conn.execute('DELETE FROM caldav_task_objects WHERE task_uid = $1', [taskUid]);
};

export const removeCalDAVTaskObjectsByCalendar = async (
  conn: DatabasePlugin,
  calendarId: string,
) => {
  await conn.execute('DELETE FROM caldav_task_objects WHERE calendar_id = $1', [calendarId]);
};
