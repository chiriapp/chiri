import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '$types/account';

const mocks = vi.hoisted(() => ({
  getAccountById: vi.fn(),
  markOAuthReauthorizationRequired: vi.fn(),
  persistOAuthTokens: vi.fn(),
  refreshFastmailToken: vi.fn(),
  refreshStalwartToken: vi.fn(),
  deleteConnection: vi.fn(),
}));

vi.mock('$lib/store/accounts', () => ({
  getAccountById: mocks.getAccountById,
  markOAuthReauthorizationRequired: mocks.markOAuthReauthorizationRequired,
  persistOAuthTokens: mocks.persistOAuthTokens,
}));

vi.mock('$context/connectionContext', () => ({
  connectionStore: { deleteConnection: mocks.deleteConnection },
}));

vi.mock('$lib/auth/fastmail', () => ({
  refreshFastmailToken: mocks.refreshFastmailToken,
}));

vi.mock('$lib/auth/stalwart', () => ({
  refreshStalwartToken: mocks.refreshStalwartToken,
}));

import { OAuthTokenEndpointError } from '$lib/auth/oauth';
import {
  OAuthReauthorizationRequiredError,
  OAuthTemporaryRefreshError,
  OAuthTokenPersistenceError,
  refreshOAuthAccountToken,
} from '$lib/auth/refresh';

const makeAccount = (id: string, refreshToken = 'old-refresh-token'): Account => ({
  id,
  name: 'Fastmail',
  calendars: [],
  isActive: true,
  sortOrder: 100,
  caldav: {
    serverUrl: 'https://caldav.fastmail.com',
    username: 'user@example.com',
    password: 'old-access-token',
    serverType: 'fastmail',
    authType: 'oauth',
    refreshToken,
    tokenExpiry: '2026-10-19T00:00:00.000Z',
  },
});

const freshTokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
  tokenExpiry: '2026-10-19T01:00:00.000Z',
};

describe('refreshOAuthAccountToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markOAuthReauthorizationRequired.mockResolvedValue(true);
    mocks.persistOAuthTokens.mockResolvedValue(undefined);
    mocks.refreshFastmailToken.mockResolvedValue(freshTokens);
  });

  it('shares one provider refresh across concurrent callers for an account', async () => {
    const account = makeAccount('concurrent-account');
    mocks.getAccountById.mockReturnValue(account);

    const first = refreshOAuthAccountToken(account.id, 'old-refresh-token');
    const second = refreshOAuthAccountToken(account.id, 'old-refresh-token');

    await expect(Promise.all([first, second])).resolves.toEqual([freshTokens, freshTokens]);
    expect(mocks.refreshFastmailToken).toHaveBeenCalledTimes(1);
    expect(mocks.persistOAuthTokens).toHaveBeenCalledTimes(1);
  });

  it('does not expose refreshed tokens until durable persistence completes', async () => {
    const account = makeAccount('durability-account');
    const persistence = Promise.withResolvers<void>();
    mocks.getAccountById.mockReturnValue(account);
    mocks.persistOAuthTokens.mockReturnValueOnce(persistence.promise);

    let settled = false;
    const refresh = refreshOAuthAccountToken(account.id, 'old-refresh-token').then((tokens) => {
      settled = true;
      return tokens;
    });

    await vi.waitFor(() => expect(mocks.persistOAuthTokens).toHaveBeenCalledTimes(1));
    expect(settled).toBe(false);

    persistence.resolve();
    await expect(refresh).resolves.toEqual(freshTokens);
  });

  it('reuses tokens already rotated by an earlier caller', async () => {
    const account = makeAccount('stale-caller-account', 'new-refresh-token');
    if (account.caldav) {
      account.caldav.password = 'new-access-token';
      account.caldav.tokenExpiry = freshTokens.tokenExpiry;
    }
    mocks.getAccountById.mockReturnValue(account);

    await expect(refreshOAuthAccountToken(account.id, 'old-refresh-token')).resolves.toEqual(
      freshTokens,
    );
    expect(mocks.refreshFastmailToken).not.toHaveBeenCalled();
    expect(mocks.persistOAuthTokens).not.toHaveBeenCalled();
  });

  it('retries only persistence after a provider refresh has succeeded', async () => {
    const account = makeAccount('persistence-retry-account');
    mocks.getAccountById.mockReturnValue(account);
    mocks.persistOAuthTokens
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce(undefined);

    await expect(refreshOAuthAccountToken(account.id, 'old-refresh-token')).rejects.toBeInstanceOf(
      OAuthTokenPersistenceError,
    );

    await expect(refreshOAuthAccountToken(account.id, 'old-refresh-token')).resolves.toEqual(
      freshTokens,
    );
    expect(mocks.refreshFastmailToken).toHaveBeenCalledTimes(1);
    expect(mocks.persistOAuthTokens).toHaveBeenCalledTimes(2);
  });

  it('discards pending persistence when the account has been reauthorized', async () => {
    const accountId = 'reauthorized-account';
    mocks.getAccountById.mockReturnValue(makeAccount(accountId));
    mocks.persistOAuthTokens.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(refreshOAuthAccountToken(accountId, 'old-refresh-token')).rejects.toBeInstanceOf(
      OAuthTokenPersistenceError,
    );

    const reauthorized = makeAccount(accountId, 'reauthorized-refresh-token');
    if (reauthorized.caldav) {
      reauthorized.caldav.password = 'reauthorized-access-token';
      reauthorized.caldav.tokenExpiry = '2026-10-19T02:00:00.000Z';
    }
    mocks.getAccountById.mockReturnValue(reauthorized);

    await expect(refreshOAuthAccountToken(accountId, 'old-refresh-token')).resolves.toEqual({
      accessToken: 'reauthorized-access-token',
      refreshToken: 'reauthorized-refresh-token',
      tokenExpiry: '2026-10-19T02:00:00.000Z',
    });
    expect(mocks.refreshFastmailToken).toHaveBeenCalledTimes(1);
    expect(mocks.persistOAuthTokens).toHaveBeenCalledTimes(1);
  });

  it('retains a temporarily invalid grant and retries it with bounded backoff', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T00:00:00.000Z'));
    const account = makeAccount('temporary-grant-account');
    mocks.getAccountById.mockReturnValue(account);
    const temporaryError = new OAuthTokenEndpointError({
      context: 'Token refresh',
      error: 'invalid_grant',
      errorDescription: 'Your administrator has temporarily locked this account.',
      temporary: true,
      status: 400,
    });
    mocks.refreshFastmailToken.mockRejectedValue(temporaryError);

    try {
      const first = refreshOAuthAccountToken(account.id, 'old-refresh-token');
      await expect(first).rejects.toMatchObject({
        name: 'OAuthTemporaryRefreshError',
        message: 'Your administrator has temporarily locked this account.',
        retryAt: Date.now() + 30_000,
      });

      await expect(
        refreshOAuthAccountToken(account.id, 'old-refresh-token'),
      ).rejects.toBeInstanceOf(OAuthTemporaryRefreshError);
      expect(mocks.refreshFastmailToken).toHaveBeenCalledTimes(1);
      expect(mocks.markOAuthReauthorizationRequired).not.toHaveBeenCalled();

      vi.advanceTimersByTime(30_000);
      mocks.refreshFastmailToken.mockResolvedValueOnce(freshTokens);
      await expect(refreshOAuthAccountToken(account.id, 'old-refresh-token')).resolves.toEqual(
        freshTokens,
      );
      expect(mocks.refreshFastmailToken).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('caps repeated temporary-grant backoff at fifteen minutes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T00:00:00.000Z'));
    const account = makeAccount('bounded-backoff-account');
    mocks.getAccountById.mockReturnValue(account);
    mocks.refreshFastmailToken.mockRejectedValue(
      new OAuthTokenEndpointError({
        context: 'Token refresh',
        error: 'invalid_grant',
        errorDescription: 'This account is temporarily unavailable.',
        temporary: true,
        status: 400,
      }),
    );

    try {
      for (const delay of [30_000, 60_000, 120_000, 240_000, 480_000, 900_000, 900_000]) {
        try {
          await refreshOAuthAccountToken(account.id, 'old-refresh-token');
          expect.unreachable('Expected a temporary refresh failure');
        } catch (error) {
          expect(error).toBeInstanceOf(OAuthTemporaryRefreshError);
          expect((error as OAuthTemporaryRefreshError).retryAt - Date.now()).toBe(delay);
        }
        vi.advanceTimersByTime(delay);
      }

      expect(mocks.refreshFastmailToken).toHaveBeenCalledTimes(7);
      expect(mocks.markOAuthReauthorizationRequired).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks a permanent invalid grant for reauthorization and never retries it', async () => {
    const account = makeAccount('permanent-grant-account');
    mocks.getAccountById.mockReturnValue(account);
    mocks.refreshFastmailToken.mockRejectedValue(
      new OAuthTokenEndpointError({
        context: 'Token refresh',
        error: 'invalid_grant',
        errorDescription: 'This authorization has been revoked.',
        status: 400,
      }),
    );

    await expect(refreshOAuthAccountToken(account.id, 'old-refresh-token')).rejects.toMatchObject({
      name: 'OAuthReauthorizationRequiredError',
      message: 'This authorization has been revoked.',
    });
    expect(mocks.markOAuthReauthorizationRequired).toHaveBeenCalledWith(
      account.id,
      'old-refresh-token',
    );
    expect(mocks.deleteConnection).toHaveBeenCalledWith(account.id);

    await expect(refreshOAuthAccountToken(account.id, 'old-refresh-token')).rejects.toBeInstanceOf(
      OAuthReauthorizationRequiredError,
    );
    expect(mocks.refreshFastmailToken).toHaveBeenCalledTimes(1);
  });

  it('does not reuse a refresh token after an ambiguous Fastmail response', async () => {
    const account = makeAccount('ambiguous-refresh-account');
    mocks.getAccountById.mockReturnValue(account);
    mocks.refreshFastmailToken.mockRejectedValue(new SyntaxError('Unexpected end of JSON input'));

    await expect(refreshOAuthAccountToken(account.id, 'old-refresh-token')).rejects.toMatchObject({
      name: 'OAuthReauthorizationRequiredError',
      message:
        'Fastmail returned an uncertain token refresh result. Reconnect Fastmail to protect this account.',
    });

    await expect(refreshOAuthAccountToken(account.id, 'old-refresh-token')).rejects.toBeInstanceOf(
      OAuthReauthorizationRequiredError,
    );
    expect(mocks.refreshFastmailToken).toHaveBeenCalledTimes(1);
    expect(mocks.markOAuthReauthorizationRequired).toHaveBeenCalledTimes(1);
  });

  it('does not clear or disconnect a newer authorization after a stale refresh fails', async () => {
    const accountId = 'reauthorization-race-account';
    mocks.getAccountById.mockReturnValue(makeAccount(accountId));
    mocks.refreshFastmailToken.mockRejectedValue(
      new OAuthTokenEndpointError({
        context: 'Token refresh',
        error: 'invalid_grant',
        errorDescription: 'The old authorization has been revoked.',
        status: 400,
      }),
    );
    const reauthorized = makeAccount(accountId, 'reauthorized-refresh-token');
    if (reauthorized.caldav) {
      reauthorized.caldav.password = 'reauthorized-access-token';
      reauthorized.caldav.tokenExpiry = '2026-10-19T02:00:00.000Z';
    }
    mocks.markOAuthReauthorizationRequired.mockImplementationOnce(() => {
      mocks.getAccountById.mockReturnValue(reauthorized);
      return Promise.resolve(false);
    });

    await expect(refreshOAuthAccountToken(accountId, 'old-refresh-token')).resolves.toEqual({
      accessToken: 'reauthorized-access-token',
      refreshToken: 'reauthorized-refresh-token',
      tokenExpiry: '2026-10-19T02:00:00.000Z',
    });
    expect(mocks.deleteConnection).not.toHaveBeenCalled();
  });
});
