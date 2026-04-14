import { db } from '$lib/database';
import { loggers } from '$lib/logger';
import { deleteAppPassword as deleteNextcloudAppPassword } from '$lib/nextcloud-auth';
import { dataStore } from '$lib/store';
import type { Account } from '$types';
import { generateUUID } from '$utils/misc';

const log = loggers.dataStore;

export const getAllAccounts = () => {
  return dataStore.load().accounts;
};

export const getAccountById = (id: string) => {
  return dataStore.load().accounts.find((a) => a.id === id);
};

export const createAccount = async (accountData: Partial<Account>) => {
  const data = dataStore.load();

  const serverUrl = accountData.serverUrl ?? '';
  const username = accountData.username ?? '';
  const duplicate = data.accounts.find(
    (a) =>
      a.serverUrl.replace(/\/$/, '') === serverUrl.replace(/\/$/, '') && a.username === username,
  );
  if (duplicate) {
    throw new Error(`An account with the same credentials already exists: ${duplicate.name}.`);
  }

  const maxExistingOrder = data.accounts.reduce((max, a) => Math.max(max, a.sortOrder), 0);

  const account: Account = {
    id: accountData.id ?? generateUUID(),
    name: accountData.name ?? 'New Account',
    serverUrl: accountData.serverUrl ?? '',
    username: accountData.username ?? '',
    password: accountData.password ?? '',
    serverType: accountData.serverType,
    calendarHomeUrl: accountData.calendarHomeUrl,
    principalUrl: accountData.principalUrl,
    calendars: [],
    isActive: true,
    sortOrder: accountData.sortOrder || maxExistingOrder + 100,
    acceptInvalidCerts: accountData.acceptInvalidCerts,
  } satisfies Account;

  await db.createAccount(account).catch((e) => log.error('Failed to persist account:', e));

  dataStore.save({
    ...data,
    accounts: [...data.accounts, account],
    ui: data.ui,
  });
  return account;
};

export const updateAccount = (id: string, updates: Partial<Account>) => {
  const data = dataStore.load();
  let updatedAccount: Account | undefined;

  const accounts = data.accounts.map((acc) => {
    if (acc.id === id) {
      updatedAccount = { ...acc, ...updates };
      return updatedAccount;
    }
    return acc;
  });

  if (updatedAccount) {
    db.updateAccount(id, updates).catch((e) => log.error('Failed to persist account update:', e));
  }

  dataStore.save({ ...data, accounts });
  return updatedAccount;
};

export const deleteAccount = (id: string) => {
  const data = dataStore.load();
  const newAccounts = data.accounts.filter((acc) => acc.id !== id);
  const deletedAccount = data.accounts.find((acc) => acc.id === id);
  const deletedCalendarIds = deletedAccount?.calendars.map((c) => c.id) ?? [];

  // Delete the app password on the server (only Nextcloud for now)
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

  dataStore.save({
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
