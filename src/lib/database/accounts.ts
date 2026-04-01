import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { rowToAccount, rowToCalendar } from '$lib/database/converters';
import { getUIState } from '$lib/database/ui';
import type { Account } from '$types';
import type { AccountRow, CalendarRow } from '$types/database';
import { generateUUID } from '$utils/misc';

export const getAllAccounts = async (conn: DatabasePlugin) => {
  const accountRows = await conn.select<AccountRow[]>(
    'SELECT * FROM accounts ORDER BY sort_order ASC',
  );
  const calendarRows = await conn.select<CalendarRow[]>(
    'SELECT * FROM calendars ORDER BY sort_order ASC',
  );
  const calendars = calendarRows.map(rowToCalendar);
  return accountRows.map((row) => rowToAccount(row, calendars));
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
    serverUrl: accountData.serverUrl ?? '',
    username: accountData.username ?? '',
    password: accountData.password ?? '',
    serverType: accountData.serverType,
    calendars: [],
    isActive: true,
    sortOrder: accountData.sortOrder || maxOrder + 100,
  };

  await conn.execute(
    `INSERT INTO accounts (id, name, server_url, username, password, server_type, last_sync, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      account.id,
      account.name,
      account.serverUrl,
      account.username,
      account.password,
      account.serverType || null,
      account.lastSync ? account.lastSync.toISOString() : null,
      account.isActive ? 1 : 0,
      account.sortOrder,
    ],
  );

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
    `UPDATE accounts SET name = $1, server_url = $2, username = $3, password = $4, server_type = $5, last_sync = $6, is_active = $7, sort_order = $8
     WHERE id = $9`,
    [
      updated.name,
      updated.serverUrl,
      updated.username,
      updated.password,
      updated.serverType || null,
      updated.lastSync ? updated.lastSync.toISOString() : null,
      updated.isActive ? 1 : 0,
      updated.sortOrder,
      id,
    ],
  );

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
