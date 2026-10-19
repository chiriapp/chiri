import { refreshFastmailToken } from '$lib/auth/fastmail';
import type { OAuthTokens } from '$lib/auth/oauth';
import { refreshStalwartToken } from '$lib/auth/stalwart';
import { getAccountById, persistOAuthTokens } from '$lib/store/accounts';
import type { CalDAVConfig } from '$types/account';

interface PendingTokenPersistence {
  consumedRefreshToken: string;
  tokens: OAuthTokens;
}

const refreshesByAccount = new Map<string, Promise<OAuthTokens>>();
const pendingPersistenceByAccount = new Map<string, PendingTokenPersistence>();

export class OAuthTokenPersistenceError extends Error {
  readonly accountId: string;
  readonly cause: unknown;

  constructor(accountId: string, cause: unknown) {
    super('The refreshed OAuth tokens could not be saved.');
    this.name = 'OAuthTokenPersistenceError';
    this.accountId = accountId;
    this.cause = cause;
  }
}

const getOAuthConfig = (accountId: string): CalDAVConfig => {
  const account = getAccountById(accountId);
  if (account?.caldav?.authType !== 'oauth') {
    throw new Error(`Cannot refresh OAuth tokens for account ${accountId}.`);
  }
  if (!account.caldav.refreshToken) {
    throw new Error(`OAuth account ${accountId} has no refresh token.`);
  }
  return account.caldav;
};

const tokensFromConfig = (accountId: string, config: CalDAVConfig): OAuthTokens => {
  if (!config.refreshToken || !config.tokenExpiry) {
    throw new Error(`OAuth account ${accountId} has incomplete token data.`);
  }
  return {
    accessToken: config.password,
    refreshToken: config.refreshToken,
    tokenExpiry: config.tokenExpiry,
  };
};

const refreshProviderToken = async (
  config: CalDAVConfig,
  refreshToken: string,
): Promise<OAuthTokens> => {
  if (config.serverType === 'fastmail') {
    return refreshFastmailToken(refreshToken);
  }
  if (config.serverType === 'stalwart') {
    return refreshStalwartToken(config.serverUrl, refreshToken, config.oauthClientId, {
      acceptInvalidCerts: config.acceptInvalidCerts,
    });
  }
  throw new Error(`OAuth refresh not implemented for ${config.serverType}.`);
};

const persistPendingTokens = async (
  accountId: string,
  pending: PendingTokenPersistence,
): Promise<OAuthTokens> => {
  try {
    await persistOAuthTokens(accountId, pending.consumedRefreshToken, pending.tokens);
  } catch (error) {
    throw new OAuthTokenPersistenceError(accountId, error);
  }

  if (pendingPersistenceByAccount.get(accountId) === pending) {
    pendingPersistenceByAccount.delete(accountId);
  }
  return pending.tokens;
};

const performTokenRefresh = async (
  accountId: string,
  expectedRefreshToken: string,
): Promise<OAuthTokens> => {
  const config = getOAuthConfig(accountId);
  const pending = pendingPersistenceByAccount.get(accountId);
  if (pending) {
    if (
      config.refreshToken === pending.consumedRefreshToken ||
      config.refreshToken === pending.tokens.refreshToken
    ) {
      return persistPendingTokens(accountId, pending);
    }

    // the account was reauthorized or otherwise changed after persistence
    // failed. so the pending rotation no longer belongs to its current grant
    pendingPersistenceByAccount.delete(accountId);
  }

  // another caller may already have completed a refresh before this caller
  // entered the coordinator. we reuse the newly stored tokens instead of consuming
  // the new refresh token immediately
  if (config.refreshToken !== expectedRefreshToken) {
    return tokensFromConfig(accountId, config);
  }

  const tokens = await refreshProviderToken(config, expectedRefreshToken);
  const nextPending = { consumedRefreshToken: expectedRefreshToken, tokens };
  pendingPersistenceByAccount.set(accountId, nextPending);
  return persistPendingTokens(accountId, nextPending);
};

export const refreshOAuthAccountToken = (
  accountId: string,
  expectedRefreshToken: string,
): Promise<OAuthTokens> => {
  const activeRefresh = refreshesByAccount.get(accountId);
  if (activeRefresh) return activeRefresh;

  const refresh = performTokenRefresh(accountId, expectedRefreshToken);
  refreshesByAccount.set(accountId, refresh);
  const clearActiveRefresh = () => {
    if (refreshesByAccount.get(accountId) === refresh) {
      refreshesByAccount.delete(accountId);
    }
  };
  void refresh.then(clearActiveRefresh, clearActiveRefresh);
  return refresh;
};
