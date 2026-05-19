import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { rowToAccount, rowToCalendar } from '$lib/database/converters';
import { getUIState } from '$lib/database/ui';
import type { Account } from '$types';
import type { AccountRow, CaldavConfigRow, CalendarRow } from '$types/database';
import { generateUUID } from '$utils/misc';

export const getAllAccounts = async (conn: DatabasePlugin) => {
  const accountRows = await conn.select<AccountRow[]>(
    'SELECT * FROM accounts ORDER BY sort_order ASC',
  );
  const caldavRows = await conn.select<CaldavConfigRow[]>('SELECT * FROM caldav_configs');
  const calendarRows = await conn.select<CalendarRow[]>(
    'SELECT * FROM calendars ORDER BY sort_order ASC',
  );

  const calendars = calendarRows.map(rowToCalendar);
  const caldavByAccountId = new Map(caldavRows.map((r) => [r.account_id, r]));

  return accountRows.map((row) =>
    rowToAccount(row, calendars, caldavByAccountId.get(row.id)),
  );
};

export const getAccountById = async (conn: DatabasePlugin, id: string) => {
  const accounts = await getAllAccounts(conn);
  return accounts.find((a) => a.id === id);
};

export const createAccount = async (conn: DatabasePlugin, accountData: Partial<Account>) => {
  const maxOrderRow = await conn.select<[{ max_order: number | null }]>(
    'SELECT MAX(sort_order) as max_order FROM accounts',
  );
  const maxOrder = maxOrderRow[0]?.max_order ?? 0;

  const account: Account = {
    id: accountData.id ?? generateUUID(),
    name: accountData.name ?? 'New Account',
    icon: accountData.icon,
    emoji: accountData.emoji,
    calendars: [],
    isActive: true,
    sortOrder: accountData.sortOrder || maxOrder + 100,
    caldav: accountData.caldav ?? null,
  };

  await conn.execute(
    `INSERT INTO accounts (id, name, icon, emoji, last_sync, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      account.id,
      account.name,
      account.icon || null,
      account.emoji || null,
      account.lastSync ? account.lastSync.toISOString() : null,
      account.isActive ? 1 : 0,
      account.sortOrder,
    ],
  );

  if (account.caldav) {
    await conn.execute(
      `INSERT INTO caldav_configs (account_id, server_url, username, password, server_type, calendar_home_url, principal_url, accept_invalid_certs, auth_type, refresh_token, token_expiry)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        account.id,
        account.caldav.serverUrl,
        account.caldav.username,
        account.caldav.password,
        account.caldav.serverType || null,
        account.caldav.calendarHomeUrl || null,
        account.caldav.principalUrl || null,
        account.caldav.acceptInvalidCerts ? 1 : 0,
        account.caldav.authType ?? 'basic',
        account.caldav.refreshToken ?? null,
        account.caldav.tokenExpiry ?? null,
      ],
    );
  }

  const uiState = await getUIState(conn);
  if (!uiState.activeAccountId) {
    await conn.execute('UPDATE ui_state SET active_account_id = $1 WHERE id = 1', [account.id]);
  }

  return account;
};

export const updateAccount = async (
  conn: DatabasePlugin,
  id: string,
  updates: Partial<Account>,
) => {
  const existing = await getAccountById(conn, id);
  if (!existing) return undefined;

  const updated: Account = { ...existing, ...updates };

  await conn.execute(
    `UPDATE accounts SET name = $1, icon = $2, emoji = $3, last_sync = $4, is_active = $5, sort_order = $6
     WHERE id = $7`,
    [
      updated.name,
      updated.icon || null,
      updated.emoji || null,
      updated.lastSync ? updated.lastSync.toISOString() : null,
      updated.isActive ? 1 : 0,
      updated.sortOrder,
      id,
    ],
  );

  if (updated.caldav) {
    await conn.execute(
      `INSERT OR REPLACE INTO caldav_configs (account_id, server_url, username, password, server_type, calendar_home_url, principal_url, accept_invalid_certs, auth_type, refresh_token, token_expiry)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        updated.caldav.serverUrl,
        updated.caldav.username,
        updated.caldav.password,
        updated.caldav.serverType || null,
        updated.caldav.calendarHomeUrl || null,
        updated.caldav.principalUrl || null,
        updated.caldav.acceptInvalidCerts ? 1 : 0,
        updated.caldav.authType ?? 'basic',
        updated.caldav.refreshToken ?? null,
        updated.caldav.tokenExpiry ?? null,
      ],
    );
  } else if (existing.caldav && !updated.caldav) {
    await conn.execute('DELETE FROM caldav_configs WHERE account_id = $1', [id]);
  }

  return updated;
};

export const deleteAccount = async (conn: DatabasePlugin, id: string) => {
  await conn.execute('DELETE FROM accounts WHERE id = $1', [id]);

  const accounts = await getAllAccounts(conn);
  const uiState = await getUIState(conn);
  if (uiState.activeAccountId === id) {
    await conn.execute('UPDATE ui_state SET active_account_id = $1 WHERE id = 1', [
      accounts[0]?.id || null,
    ]);
  }
};
