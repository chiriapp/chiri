import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '$types/account';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  clearOAuthAuthorization: vi.fn(),
  replaceOAuthAuthorization: vi.fn(),
  updateOAuthTokens: vi.fn(),
}));

vi.mock('$lib/auth/nextcloud', () => ({
  deleteAppPassword: vi.fn(),
}));

vi.mock('$lib/database', () => ({
  db: {
    clearOAuthAuthorization: mocks.clearOAuthAuthorization,
    replaceOAuthAuthorization: mocks.replaceOAuthAuthorization,
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

import {
  markOAuthReauthorizationRequired,
  persistOAuthTokens,
  replaceOAuthAccountAuthorization,
} from '$lib/store/accounts';

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
    mocks.clearOAuthAuthorization.mockResolvedValue(true);
    mocks.replaceOAuthAuthorization.mockResolvedValue(undefined);
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

  it('clears an invalid grant only after the database marker is durable', async () => {
    const persistence = Promise.withResolvers<boolean>();
    mocks.clearOAuthAuthorization.mockReturnValueOnce(persistence.promise);

    const result = markOAuthReauthorizationRequired('account-1', 'old-refresh-token');
    await vi.waitFor(() => expect(mocks.clearOAuthAuthorization).toHaveBeenCalledTimes(1));
    expect(mocks.save).not.toHaveBeenCalled();

    persistence.resolve(true);
    await expect(result).resolves.toBe(true);
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accounts: [
          expect.objectContaining({
            caldav: expect.objectContaining({
              password: '',
              refreshToken: undefined,
              tokenExpiry: undefined,
            }),
          }),
        ],
      }),
    );
  });

  it('does not publish a stale authorization clear', async () => {
    mocks.clearOAuthAuthorization.mockResolvedValueOnce(false);

    await expect(markOAuthReauthorizationRequired('account-1', 'old-refresh-token')).resolves.toBe(
      false,
    );
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('persists a replacement grant before publishing it', async () => {
    const persistence = Promise.withResolvers<void>();
    mocks.replaceOAuthAuthorization.mockReturnValueOnce(persistence.promise);

    const result = replaceOAuthAccountAuthorization('account-1', tokens);
    await vi.waitFor(() => expect(mocks.replaceOAuthAuthorization).toHaveBeenCalledTimes(1));
    expect(mocks.save).not.toHaveBeenCalled();

    persistence.resolve();
    await expect(result).resolves.toEqual(
      expect.objectContaining({
        caldav: expect.objectContaining({ refreshToken: 'new-refresh-token' }),
      }),
    );
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });

  it('does not publish a replacement grant when persistence fails', async () => {
    mocks.replaceOAuthAuthorization.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(replaceOAuthAccountAuthorization('account-1', tokens)).rejects.toThrow(
      'database unavailable',
    );
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
