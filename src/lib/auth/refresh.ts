import { connectionStore } from '$context/connectionContext';
import { refreshFastmailToken } from '$lib/auth/fastmail';
import { OAuthTokenEndpointError, type OAuthTokens } from '$lib/auth/oauth';
import { refreshStalwartToken } from '$lib/auth/stalwart';
import {
  getAccountById,
  markOAuthReauthorizationRequired,
  persistOAuthTokens,
} from '$lib/store/accounts';
import type { CalDAVConfig } from '$types/account';

interface PendingTokenPersistence {
  consumedRefreshToken: string;
  tokens: OAuthTokens;
}

const refreshesByAccount = new Map<string, Promise<OAuthTokens>>();
const pendingPersistenceByAccount = new Map<string, PendingTokenPersistence>();
const temporaryFailuresByAccount = new Map<
  string,
  {
    refreshToken: string;
    attempt: number;
    retryAt: number;
    description: string;
  }
>();
const reauthorizationByAccount = new Map<string, { refreshToken: string; description: string }>();

const TEMPORARY_RETRY_BASE_MS = 30_000;
const TEMPORARY_RETRY_MAX_MS = 15 * 60_000;

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

export class OAuthTemporaryRefreshError extends Error {
  readonly retryAt: number;

  constructor(description: string, retryAt: number) {
    super(description);
    this.name = 'OAuthTemporaryRefreshError';
    this.retryAt = retryAt;
  }
}

export class OAuthReauthorizationRequiredError extends Error {
  readonly accountId: string;
  readonly persistenceError?: unknown;

  constructor(accountId: string, description: string, persistenceError?: unknown) {
    super(description);
    this.name = 'OAuthReauthorizationRequiredError';
    this.accountId = accountId;
    this.persistenceError = persistenceError;
  }
}

export const isOAuthReauthorizationRequiredError = (
  error: unknown,
): error is OAuthReauthorizationRequiredError => error instanceof OAuthReauthorizationRequiredError;

const getOAuthConfig = (accountId: string): CalDAVConfig => {
  const account = getAccountById(accountId);
  if (account?.caldav?.authType !== 'oauth') {
    throw new Error(`Cannot refresh OAuth tokens for account ${accountId}.`);
  }
  if (!account.caldav.refreshToken) {
    throw new OAuthReauthorizationRequiredError(
      accountId,
      account.caldav.serverType === 'fastmail'
        ? 'Reconnect Fastmail to authorize this account again.'
        : 'Reconnect this account to authorize it again.',
    );
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

const getTemporaryRetryDelay = (attempt: number) =>
  Math.min(TEMPORARY_RETRY_BASE_MS * 2 ** Math.max(0, attempt - 1), TEMPORARY_RETRY_MAX_MS);

const blockForReauthorization = async (
  accountId: string,
  refreshToken: string,
  description: string,
): Promise<OAuthTokens> => {
  reauthorizationByAccount.set(accountId, { refreshToken, description });
  temporaryFailuresByAccount.delete(accountId);
  pendingPersistenceByAccount.delete(accountId);

  try {
    const marked = await markOAuthReauthorizationRequired(accountId, refreshToken);
    if (!marked) {
      reauthorizationByAccount.delete(accountId);
      return tokensFromConfig(accountId, getOAuthConfig(accountId));
    }
  } catch (error) {
    connectionStore.deleteConnection(accountId);
    throw new OAuthReauthorizationRequiredError(accountId, description, error);
  }
  connectionStore.deleteConnection(accountId);
  throw new OAuthReauthorizationRequiredError(accountId, description);
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

const enforceTemporaryBackoff = (accountId: string, config: CalDAVConfig) => {
  const temporaryFailure = temporaryFailuresByAccount.get(accountId);
  if (!temporaryFailure) return;

  if (config.refreshToken !== temporaryFailure.refreshToken) {
    temporaryFailuresByAccount.delete(accountId);
    return;
  }
  if (Date.now() < temporaryFailure.retryAt) {
    throw new OAuthTemporaryRefreshError(temporaryFailure.description, temporaryFailure.retryAt);
  }
};

const handleProviderRefreshError = (
  accountId: string,
  config: CalDAVConfig,
  expectedRefreshToken: string,
  error: unknown,
): Promise<OAuthTokens> => {
  if (
    config.serverType === 'fastmail' &&
    error instanceof OAuthTokenEndpointError &&
    error.error === 'invalid_grant'
  ) {
    const description =
      error.errorDescription ??
      (error.temporary === true
        ? 'Fastmail temporarily rejected the account authorization.'
        : 'The Fastmail authorization is no longer valid.');
    if (error.temporary === true) {
      const previous = temporaryFailuresByAccount.get(accountId);
      const attempt = previous?.refreshToken === expectedRefreshToken ? previous.attempt + 1 : 1;
      const retryAt = Date.now() + getTemporaryRetryDelay(attempt);
      temporaryFailuresByAccount.set(accountId, {
        refreshToken: expectedRefreshToken,
        attempt,
        retryAt,
        description,
      });
      throw new OAuthTemporaryRefreshError(description, retryAt);
    }

    return blockForReauthorization(accountId, expectedRefreshToken, description);
  }

  if (config.serverType === 'fastmail' && !(error instanceof OAuthTokenEndpointError)) {
    return blockForReauthorization(
      accountId,
      expectedRefreshToken,
      'Fastmail returned an uncertain token refresh result. Reconnect Fastmail to protect this account.',
    );
  }

  throw error;
};

const performTokenRefresh = async (
  accountId: string,
  expectedRefreshToken: string,
): Promise<OAuthTokens> => {
  const blocked = reauthorizationByAccount.get(accountId);
  if (blocked) {
    const currentRefreshToken = getAccountById(accountId)?.caldav?.refreshToken;
    if (!currentRefreshToken || currentRefreshToken === blocked.refreshToken) {
      throw new OAuthReauthorizationRequiredError(accountId, blocked.description);
    }
    reauthorizationByAccount.delete(accountId);
  }

  const config = getOAuthConfig(accountId);

  enforceTemporaryBackoff(accountId, config);

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

  let tokens: OAuthTokens;
  try {
    tokens = await refreshProviderToken(config, expectedRefreshToken);
  } catch (error) {
    return handleProviderRefreshError(accountId, config, expectedRefreshToken, error);
  }

  temporaryFailuresByAccount.delete(accountId);
  reauthorizationByAccount.delete(accountId);
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
