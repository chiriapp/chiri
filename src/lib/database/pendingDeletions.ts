import type DatabasePlugin from '@tauri-apps/plugin-sql';
import type { PendingDeletionRow } from '$types/database';
import type { PendingDeletion } from '$types/store';

export const getPendingDeletions = async (conn: DatabasePlugin): Promise<PendingDeletion[]> => {
  const rows = await conn.select<PendingDeletionRow[]>('SELECT * FROM pending_deletions');
  return rows.map((row) => ({
    uid: row.uid,
    href: row.href,
    accountId: row.account_id,
    calendarId: row.calendar_id,
  }));
};

export const clearPendingDeletion = async (conn: DatabasePlugin, uid: string) => {
  await conn.execute('DELETE FROM pending_deletions WHERE uid = $1', [uid]);
};
