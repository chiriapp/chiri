import type DatabasePlugin from '@tauri-apps/plugin-sql';
import type { PendingDeletionRow } from '$lib/database/types';
import type { PendingDeletion } from '$types/store/sync';

const MAX_SQLITE_PARAMETERS = 900;
const fromDate = (date: Date | undefined) => date?.toISOString() ?? null;
const toDate = (value: string | null) => (value ? new Date(value) : undefined);

export const getPendingDeletions = async (conn: DatabasePlugin): Promise<PendingDeletion[]> => {
  const rows = await conn.select<PendingDeletionRow[]>('SELECT * FROM pending_deletions');
  return rows.map((row) => ({
    uid: row.uid,
    href: row.href,
    accountId: row.account_id,
    calendarId: row.calendar_id,
    etag: row.etag ?? undefined,
    deletedAt: toDate(row.deleted_at),
    attemptCount: row.attempt_count ?? 0,
    lastAttemptAt: toDate(row.last_attempt_at),
    lastError: row.last_error ?? undefined,
  }));
};

export const addPendingDeletion = async (conn: DatabasePlugin, deletion: PendingDeletion) => {
  await addPendingDeletions(conn, [deletion]);
};

export const addPendingDeletions = async (conn: DatabasePlugin, deletions: PendingDeletion[]) => {
  const parameterCount = 9;
  const deletionsPerBatch = Math.floor(MAX_SQLITE_PARAMETERS / parameterCount);

  for (let offset = 0; offset < deletions.length; offset += deletionsPerBatch) {
    const batch = deletions.slice(offset, offset + deletionsPerBatch);
    const params = batch.flatMap((deletion) => {
      const deletedAt = deletion.deletedAt ?? new Date();
      return [
        deletion.uid,
        deletion.href,
        deletion.accountId,
        deletion.calendarId,
        deletion.etag ?? null,
        deletedAt.toISOString(),
        deletion.attemptCount ?? 0,
        fromDate(deletion.lastAttemptAt),
        deletion.lastError ?? null,
      ];
    });
    const placeholders = batch
      .map((_, deletionIndex) => {
        const start = deletionIndex * parameterCount;
        return `(${Array.from(
          { length: parameterCount },
          (_value, parameterIndex) => `$${start + parameterIndex + 1}`,
        ).join(',')})`;
      })
      .join(',');

    await conn.execute(
      `INSERT OR REPLACE INTO pending_deletions (
        uid, href, account_id, calendar_id, etag, deleted_at,
        attempt_count, last_attempt_at, last_error
      ) VALUES ${placeholders}`,
      params,
    );
  }
};

export const clearPendingDeletion = async (conn: DatabasePlugin, uid: string) => {
  await conn.execute('DELETE FROM pending_deletions WHERE uid = $1', [uid]);
};

export const clearPendingDeletionsForCalendar = async (
  conn: DatabasePlugin,
  calendarId: string,
) => {
  await conn.execute('DELETE FROM pending_deletions WHERE calendar_id = $1', [calendarId]);
};

export const markPendingDeletionAttempt = async (
  conn: DatabasePlugin,
  uid: string,
  error: string,
) => {
  await conn.execute(
    `UPDATE pending_deletions
     SET attempt_count = COALESCE(attempt_count, 0) + 1,
         last_attempt_at = $1,
         last_error = $2
     WHERE uid = $3`,
    [new Date().toISOString(), error, uid],
  );
};
