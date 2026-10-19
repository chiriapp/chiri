import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '$types/account';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  updateOAuthTokens: vi.fn(),
}));

vi.mock('$lib/auth/nextcloud', () => ({
  deleteAppPassword: vi.fn(),
}));

vi.mock('$lib/database', () => ({
  db: {
    updateOAuthTokens: mocks.updateOAuthTokens,
  },
}));

vi.mock('$lib/logger', () => ({
  loggers: {
    dataStore: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  },
}));

vi.mock('$lib/store', () => ({
  dataStore: {
    load: mocks.load,
    save: mocks.save,
  },
}));

import { persistOAuthTokens } from '$lib/store/accounts';

const account: Account = {
  id: 'account-1',
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
    refreshToken: 'old-refresh-token',
    tokenExpiry: '2026-10-19T00:00:00.000Z',
  },
};

const tokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
  tokenExpiry: '2026-10-19T01:00:00.000Z',
};

const data = {
  accounts: [account],
  tasks: [],
  tags: [],
  filters: [],
  pendingDeletions: [],
  ui: {},
};

describe('persistOAuthTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.load.mockReturnValue(data);
  });

  it('publishes rotated tokens only after the database write completes', async () => {
    const persistence = Promise.withResolvers<void>();
    mocks.updateOAuthTokens.mockReturnValueOnce(persistence.promise);

    const result = persistOAuthTokens('account-1', 'old-refresh-token', tokens);
    await vi.waitFor(() => expect(mocks.updateOAuthTokens).toHaveBeenCalledTimes(1));
    expect(mocks.save).not.toHaveBeenCalled();

    persistence.resolve();
    await expect(result).resolves.toEqual(
      expect.objectContaining({
        caldav: expect.objectContaining({
          password: 'new-access-token',
          refreshToken: 'new-refresh-token',
          tokenExpiry: '2026-10-19T01:00:00.000Z',
        }),
      }),
    );
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accounts: [
          expect.objectContaining({
            caldav: expect.objectContaining({
              password: 'new-access-token',
              refreshToken: 'new-refresh-token',
            }),
          }),
        ],
      }),
    );
  });

  it('does not publish tokens when durable persistence fails', async () => {
    mocks.updateOAuthTokens.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(persistOAuthTokens('account-1', 'old-refresh-token', tokens)).rejects.toThrow(
      'database unavailable',
    );
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
