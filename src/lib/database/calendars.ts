import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { getAllAccounts } from '$lib/database/accounts';
import { rowToCalendar } from '$lib/database/converters';
import { getTasksByCalendar } from '$lib/database/tasks';
import { getUIState } from '$lib/database/ui';
import type { Calendar } from '$types';
import type { CalendarRow } from '$types/database';
import { generateUUID } from '$utils/misc';

export const addCalendar = async (
  conn: DatabasePlugin,
  accountId: string,
  calendarData: Partial<Calendar>,
) => {
  let sortOrder = calendarData.sortOrder ?? 0;
  if (!sortOrder) {
    const maxRows = await conn.select<Array<{ max_order: number | null }>>(
      'SELECT MAX(sort_order) as max_order FROM calendars WHERE account_id = $1',
      [accountId],
    );
    sortOrder = (maxRows[0]?.max_order ?? 0) + 100;
  }

  const calendarId = calendarData.id ?? generateUUID();
  const displayName = calendarData.displayName ?? 'Tasks';
  const url = calendarData.url ?? '';

  await conn.execute(
    `INSERT INTO calendars (id, account_id, display_name, url, ctag, sync_token, color, icon, emoji, supported_components, sort_order, push_topic, push_supported, push_vapid_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      calendarId,
      accountId,
      displayName,
      url,
      calendarData.ctag || null,
      calendarData.syncToken || null,
      calendarData.color || null,
      calendarData.icon || null,
      calendarData.emoji || null,
      calendarData.supportedComponents ? JSON.stringify(calendarData.supportedComponents) : null,
      sortOrder,
      calendarData.pushTopic || null,
      calendarData.pushSupported ? 1 : 0,
      calendarData.pushVapidKey || null,
    ],
  );

  const uiState = await getUIState(conn);
  if (!uiState.activeCalendarId) {
    await conn.execute('UPDATE ui_state SET active_calendar_id = $1 WHERE id = 1', [calendarId]);
  }
};

export const updateCalendar = async (
  conn: DatabasePlugin,
  calendarId: string,
  updates: Partial<Calendar>,
) => {
  const rows = await conn.select<CalendarRow[]>('SELECT * FROM calendars WHERE id = $1', [
    calendarId,
  ]);
  if (rows.length === 0) return;

  const updated = { ...rowToCalendar(rows[0]), ...updates };

  await conn.execute(
    `UPDATE calendars SET
      display_name = $1, url = $2, ctag = $3, sync_token = $4, color = $5,
      icon = $6, emoji = $7, supported_components = $8, sort_order = $9,
      push_topic = $10, push_supported = $11, push_vapid_key = $12
     WHERE id = $13`,
    [
      updated.displayName,
      updated.url,
      updated.ctag || null,
      updated.syncToken || null,
      updated.color || null,
      updated.icon || null,
      updated.emoji || null,
      updated.supportedComponents ? JSON.stringify(updated.supportedComponents) : null,
      updated.sortOrder ?? 0,
      updated.pushTopic || null,
      updated.pushSupported ? 1 : 0,
      updated.pushVapidKey || null,
      calendarId,
    ],
  );
};

export const deleteCalendar = async (
  conn: DatabasePlugin,
  _accountId: string,
  calendarId: string,
) => {
  const tasks = await getTasksByCalendar(conn, calendarId);
  for (const t of tasks.filter((t) => t.href)) {
    await conn.execute(
      `INSERT OR REPLACE INTO pending_deletions (uid, href, account_id, calendar_id) VALUES ($1, $2, $3, $4)`,
      [t.uid, t.href, t.accountId, t.calendarId],
    );
  }

  await conn.execute('DELETE FROM calendars WHERE id = $1', [calendarId]);

  const uiState = await getUIState(conn);
  if (uiState.activeCalendarId === calendarId) {
    const accounts = await getAllAccounts(conn);
    const other = accounts.flatMap((a) => a.calendars).find((cal) => cal.id !== calendarId);
    await conn.execute('UPDATE ui_state SET active_calendar_id = $1 WHERE id = 1', [
      other?.id || null,
    ]);
  }
};
