import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '$types/account';

const mocks = vi.hoisted(() => ({
  deleteAccount: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  revokeFastmailAuthorization: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock('$lib/auth/fastmail', () => ({
  revokeFastmailAuthorization: mocks.revokeFastmailAuthorization,
}));

vi.mock('$lib/auth/nextcloud', () => ({
  deleteAppPassword: vi.fn(),
}));

vi.mock('$lib/database', () => ({
  db: { deleteAccount: mocks.deleteAccount },
}));

vi.mock('$lib/logger', () => ({
  loggers: {
    dataStore: { error: vi.fn(), info: mocks.logInfo, warn: mocks.logWarn },
  },
}));

vi.mock('$lib/store', () => ({
  dataStore: { load: mocks.load, save: mocks.save },
}));

import { deleteAccount } from '$lib/store/accounts';

const account: Account = {
  id: 'fastmail-account',
  name: 'Fastmail',
  calendars: [],
  isActive: true,
  sortOrder: 100,
  caldav: {
    serverUrl: 'https://caldav.fastmail.com',
    username: 'user@example.com',
    password: 'access-token',
    serverType: 'fastmail',
    authType: 'oauth',
    refreshToken: 'refresh-token',
    tokenExpiry: '2026-10-19T00:00:00.000Z',
  },
};

const makeData = () => ({
  accounts: [account],
  tasks: [],
  tags: [],
  filters: [],
  pendingDeletions: [],
  ui: {
    activeAccountId: account.id,
    activeCalendarId: null,
    activeTagId: null,
  },
});

describe('deleteAccount Fastmail revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.load.mockReturnValue(makeData());
    mocks.deleteAccount.mockResolvedValue(undefined);
    mocks.revokeFastmailAuthorization.mockResolvedValue(undefined);
  });

  it('starts remote revocation without delaying local deletion', () => {
    const revocation = Promise.withResolvers<void>();
    mocks.revokeFastmailAuthorization.mockReturnValueOnce(revocation.promise);

    deleteAccount(account.id);

    expect(mocks.revokeFastmailAuthorization).toHaveBeenCalledWith({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(mocks.deleteAccount).toHaveBeenCalledWith(account.id);
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accounts: [],
        tasks: [],
        ui: expect.objectContaining({ activeAccountId: null }),
      }),
    );

    revocation.resolve();
  });

  it('keeps the account deleted when remote revocation fails', async () => {
    const error = new Error('network unavailable');
    mocks.revokeFastmailAuthorization.mockRejectedValueOnce(error);

    deleteAccount(account.id);

    await vi.waitFor(() =>
      expect(mocks.logWarn).toHaveBeenCalledWith('Failed to revoke Fastmail authorization:', error),
    );
    expect(mocks.deleteAccount).toHaveBeenCalledWith(account.id);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ accounts: [] }));
  });
});
