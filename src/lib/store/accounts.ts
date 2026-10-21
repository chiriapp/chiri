import { revokeFastmailAuthorization } from '$lib/auth/fastmail';
import { deleteAppPassword as deleteNextcloudAppPassword } from '$lib/auth/nextcloud';
import type { OAuthTokens } from '$lib/auth/oauth';
import { db } from '$lib/database';
import { loggers } from '$lib/logger';
import { dataStore } from '$lib/store';
import type { Account } from '$types/account';
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

  if (accountData.caldav) {
    const serverUrl = accountData.caldav.serverUrl;
    const username = accountData.caldav.username;
    const duplicate = data.accounts.find(
      (a) =>
        a.caldav &&
        a.caldav.serverUrl.replace(/\/$/, '') === serverUrl.replace(/\/$/, '') &&
        a.caldav.username === username,
    );
    if (duplicate) {
      throw new Error(`An account with the same credentials already exists: ${duplicate.name}.`);
    }
  }

  const maxExistingOrder = data.accounts.reduce((max, a) => Math.max(max, a.sortOrder), 0);

  const account: Account = {
    id: accountData.id ?? generateUUID(),
    name: accountData.name ?? 'New Account',
    icon: accountData.icon,
    emoji: accountData.emoji,
    calendars: [],
    isActive: true,
    sortOrder: accountData.sortOrder || maxExistingOrder + 100,
    caldav: accountData.caldav ?? null,
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

export const persistOAuthTokens = async (
  accountId: string,
  consumedRefreshToken: string,
  tokens: OAuthTokens,
) => {
  await db.updateOAuthTokens(accountId, consumedRefreshToken, tokens);

  const data = dataStore.load();
  let updatedAccount: Account | undefined;
  const accounts = data.accounts.map((account) => {
    if (account.id !== accountId) return account;
    if (account.caldav?.authType !== 'oauth') {
      throw new Error(`Cannot publish OAuth tokens for account ${accountId}.`);
    }
    if (
      account.caldav.refreshToken !== consumedRefreshToken &&
      account.caldav.refreshToken !== tokens.refreshToken
    ) {
      throw new Error(
        `OAuth tokens changed before they could be published for account ${accountId}.`,
      );
    }

    updatedAccount = {
      ...account,
      caldav: {
        ...account.caldav,
        password: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: tokens.tokenExpiry,
      },
    };
    return updatedAccount;
  });

  if (!updatedAccount) {
    throw new Error(`Cannot publish OAuth tokens for missing account ${accountId}.`);
  }

  dataStore.save({ ...data, accounts });
  return updatedAccount;
};

export const markOAuthReauthorizationRequired = async (
  accountId: string,
  expectedRefreshToken: string,
) => {
  const current = getAccountById(accountId);
  if (current?.caldav?.authType !== 'oauth') {
    throw new Error(`Cannot clear OAuth authorization for account ${accountId}.`);
  }
  if (current.caldav.refreshToken !== expectedRefreshToken) return false;

  const cleared = await db.clearOAuthAuthorization(accountId, expectedRefreshToken);
  if (!cleared) return false;

  const data = dataStore.load();
  let marked = false;
  const accounts = data.accounts.map((account) => {
    if (
      account.id !== accountId ||
      account.caldav?.authType !== 'oauth' ||
      account.caldav.refreshToken !== expectedRefreshToken
    ) {
      return account;
    }

    marked = true;
    return {
      ...account,
      caldav: {
        ...account.caldav,
        password: '',
        refreshToken: undefined,
        tokenExpiry: undefined,
      },
    };
  });
  if (!marked) return false;
  dataStore.save({ ...data, accounts });
  return true;
};

export const replaceOAuthAccountAuthorization = async (accountId: string, tokens: OAuthTokens) => {
  const current = getAccountById(accountId);
  if (current?.caldav?.authType !== 'oauth') {
    throw new Error(`Cannot replace OAuth authorization for account ${accountId}.`);
  }

  await db.replaceOAuthAuthorization(accountId, tokens);

  const data = dataStore.load();
  let updatedAccount: Account | undefined;
  const accounts = data.accounts.map((account) => {
    if (account.id !== accountId || account.caldav?.authType !== 'oauth') return account;
    updatedAccount = {
      ...account,
      caldav: {
        ...account.caldav,
        password: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: tokens.tokenExpiry,
      },
    };
    return updatedAccount;
  });

  if (!updatedAccount) {
    throw new Error(`Cannot publish OAuth authorization for account ${accountId}.`);
  }
  dataStore.save({ ...data, accounts });
  return updatedAccount;
};

export const deleteAccount = async (id: string) => {
  const data = dataStore.load();
  const newAccounts = data.accounts.filter((acc) => acc.id !== id);
  const deletedAccount = data.accounts.find((acc) => acc.id === id);
  const deletedCalendarIds = deletedAccount?.calendars.map((c) => c.id) ?? [];
  let fastmailRevocation: Promise<void> | undefined;

  if (
    deletedAccount?.caldav?.serverType === 'nextcloud' ||
    deletedAccount?.caldav?.serverType === 'disrootCloud'
  ) {
    deleteNextcloudAppPassword(
      deletedAccount.caldav.serverUrl,
      deletedAccount.caldav.username,
      deletedAccount.caldav.password,
    )
      .then(() => log.info('Nextcloud app password deleted for account', { accountId: id }))
      .catch((e) => log.warn('Failed to delete Nextcloud app password:', e));
  }

  if (
    deletedAccount?.caldav?.serverType === 'fastmail' &&
    deletedAccount.caldav.authType === 'oauth'
  ) {
    fastmailRevocation = revokeFastmailAuthorization({
      accessToken: deletedAccount.caldav.password,
      refreshToken: deletedAccount.caldav.refreshToken,
    })
      .then(() => log.info('Fastmail authorization revoked for account', { accountId: id }))
      .catch((e) => log.warn('Failed to revoke Fastmail authorization:', e));
  }

  db.deleteAccount(id).catch((e) => log.error('Failed to persist account deletion:', e));

  // check if the selected calendar belongs to the deleted account
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

  await fastmailRevocation;
};
