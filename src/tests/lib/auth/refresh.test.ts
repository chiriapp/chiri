import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '$types/account';

const mocks = vi.hoisted(() => ({
  getAccountById: vi.fn(),
  persistOAuthTokens: vi.fn(),
  refreshFastmailToken: vi.fn(),
  refreshStalwartToken: vi.fn(),
}));

vi.mock('$lib/store/accounts', () => ({
  getAccountById: mocks.getAccountById,
  persistOAuthTokens: mocks.persistOAuthTokens,
}));

vi.mock('$lib/auth/fastmail', () => ({
  refreshFastmailToken: mocks.refreshFastmailToken,
}));

vi.mock('$lib/auth/stalwart', () => ({
  refreshStalwartToken: mocks.refreshStalwartToken,
}));

import { OAuthTokenPersistenceError, refreshOAuthAccountToken } from '$lib/auth/refresh';

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
});
