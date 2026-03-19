/**
 * Account operations
 */

import * as db from '$lib/database';
import { loggers } from '$lib/logger';
import { deleteAppPassword as deleteNextcloudAppPassword } from '$lib/nextcloud-auth';
import { loadDataStore, saveDataStore } from '$lib/store';
import type { Account } from '$types/index';
import { generateUUID } from '$utils/misc';

const log = loggers.dataStore;

// Account operations
export const getAllAccounts = () => {
  return loadDataStore().accounts;
};

export const getAccountById = (id: string) => {
  return loadDataStore().accounts.find((a) => a.id === id);
};

export const createAccount = (accountData: Partial<Account>) => {
  const data = loadDataStore();

  const account: Account = {
    id: accountData.id ?? generateUUID(),
    name: accountData.name ?? 'New Account',
    serverUrl: accountData.serverUrl ?? '',
    username: accountData.username ?? '',
    password: accountData.password ?? '',
    serverType: accountData.serverType,
    calendars: [],
    isActive: true,
  } satisfies Account;

  // Persist to SQLite
  db.createAccount(account).catch((e) => log.error('Failed to persist account:', e));

  saveDataStore({
    ...data,
    accounts: [...data.accounts, account],
    ui: data.ui,
  });
  return account;
};

export const updateAccount = (id: string, updates: Partial<Account>) => {
  const data = loadDataStore();
  let updatedAccount: Account | undefined;

  const accounts = data.accounts.map((acc) => {
    if (acc.id === id) {
      updatedAccount = { ...acc, ...updates };
      return updatedAccount;
    }
    return acc;
  });

  // Persist to SQLite
  if (updatedAccount) {
    db.updateAccount(id, updates).catch((e) => log.error('Failed to persist account update:', e));
  }

  saveDataStore({ ...data, accounts });
  return updatedAccount;
};

export const deleteAccount = (id: string) => {
  const data = loadDataStore();
  const newAccounts = data.accounts.filter((acc) => acc.id !== id);
  const deletedAccount = data.accounts.find((acc) => acc.id === id);
  const deletedCalendarIds = deletedAccount?.calendars.map((c) => c.id) ?? [];

  // Delete the app password on the server (for supported server types)
  if (deletedAccount?.serverType === 'nextcloud') {
    deleteNextcloudAppPassword(
      deletedAccount.serverUrl,
      deletedAccount.username,
      deletedAccount.password,
    )
      .then(() => log.info('Nextcloud app password deleted for account', { accountId: id }))
      .catch((e) => log.warn('Failed to delete Nextcloud app password:', e));
  }

  db.deleteAccount(id).catch((e) => log.error('Failed to persist account deletion:', e));

  // check if the active calendar belongs to the deleted account
  const isActiveCalendarDeleted = deletedCalendarIds.includes(data.ui.activeCalendarId ?? '');

  saveDataStore({
    ...data,
    accounts: newAccounts,
    ui: {
      ...data.ui,
      // redirect to All Tasks view instead of another account's calendar
      activeAccountId: isActiveCalendarDeleted
        ? null
        : data.ui.activeAccountId === id
          ? null
          : data.ui.activeAccountId,
      activeCalendarId: isActiveCalendarDeleted ? null : data.ui.activeCalendarId,
      activeTagId: isActiveCalendarDeleted ? null : data.ui.activeTagId,
      selectedTaskId: null,
      isEditorOpen: false,
    },
    tasks: data.tasks.filter((task) => task.accountId !== id),
  });
};
