import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Connection } from '$lib/caldav/connection';
import type { Account } from '$types/account';
import { makeCalendar } from '../../fixtures';

const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  replaceBearerToken: vi.fn(),
  refreshOAuthAccountToken: vi.fn(),
  getAccountById: vi.fn(),
  fetchTasks: vi.fn(),
}));

vi.mock('$lib/caldav/connection', () => ({
  connect: vi.fn(),
  connectWithBearer: vi.fn(),
  disconnect: vi.fn(),
  getConnection: mocks.getConnection,
  isConnected: vi.fn(),
  reconnect: vi.fn(),
  replaceBearerToken: mocks.replaceBearerToken,
}));

vi.mock('$lib/auth/refresh', () => ({
  OAuthReauthorizationRequiredError: class extends Error {
    readonly accountId: string;
    constructor(accountId: string, message: string) {
      super(message);
      this.name = 'OAuthReauthorizationRequiredError';
      this.accountId = accountId;
    }
  },
  refreshOAuthAccountToken: mocks.refreshOAuthAccountToken,
}));

vi.mock('$lib/store/accounts', () => ({
  getAccountById: mocks.getAccountById,
}));

vi.mock('$lib/caldav/calendars', () => ({
  calendarExists: vi.fn(),
  createCalendar: vi.fn(),
  deleteCalendar: vi.fn(),
  discoverCalendars: vi.fn(),
  fetchCalendars: vi.fn(),
  probeVtodoCalendarCreation: vi.fn(),
  updateCalendar: vi.fn(),
}));

vi.mock('$lib/caldav/tasks', () => ({
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  fetchTasks: mocks.fetchTasks,
  syncCalendar: vi.fn(),
  updateTask: vi.fn(),
}));

import { CalDAVClient } from '$lib/caldav';
import { DetailedError } from '$lib/http';

const makeConnection = (bearerToken?: string): Connection => ({
  serverUrl: 'https://caldav.fastmail.com',
  principalUrl: 'https://caldav.fastmail.com/dav/principals/user/user@example.com/',
  calendarHome: 'https://caldav.fastmail.com/dav/calendars/user/user@example.com/',
  serverType: 'fastmail',
  credentials: {
    username: 'user@example.com',
    password: '',
    ...(bearerToken ? { bearerToken } : {}),
  },
});

const makeAccount = (accessToken = 'old-access-token'): Account => ({
  id: 'account-1',
  name: 'Fastmail',
  calendars: [],
  isActive: true,
  sortOrder: 100,
  caldav: {
    serverUrl: 'https://caldav.fastmail.com',
    username: 'user@example.com',
    password: accessToken,
    serverType: 'fastmail',
    authType: 'oauth',
    refreshToken: 'current-refresh-token',
    tokenExpiry: '2026-10-19T22:00:00.000Z',
  },
});

const unauthorized = () =>
  new DetailedError('Authentication failed. Check your credentials.', 'HTTP 401', 401);

describe('CalDAVClient OAuth recovery', () => {
  const calendar = makeCalendar({ accountId: 'account-1' });
  const oldConnection = makeConnection('old-access-token');
  const newConnection = makeConnection('new-access-token');

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConnection.mockReturnValue(oldConnection);
    mocks.getAccountById.mockReturnValue(makeAccount());
    mocks.refreshOAuthAccountToken.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      tokenExpiry: '2026-10-19T23:00:00.000Z',
    });
    mocks.replaceBearerToken.mockReturnValue(newConnection);
  });

  it('refreshes after a bearer 401 and retries the operation once', async () => {
    mocks.fetchTasks.mockRejectedValueOnce(unauthorized()).mockResolvedValueOnce([]);
    const client = CalDAVClient.getForAccount('account-1');

    await expect(client.fetchTasks(calendar)).resolves.toEqual([]);

    expect(mocks.refreshOAuthAccountToken).toHaveBeenCalledWith(
      'account-1',
      'current-refresh-token',
    );
    expect(mocks.replaceBearerToken).toHaveBeenCalledWith('account-1', 'new-access-token');
    expect(mocks.fetchTasks).toHaveBeenNthCalledWith(1, oldConnection, 'account-1', calendar);
    expect(mocks.fetchTasks).toHaveBeenNthCalledWith(2, newConnection, 'account-1', calendar);
  });

  it('does not loop when the retried operation also returns 401', async () => {
    mocks.fetchTasks.mockRejectedValue(unauthorized());
    const client = CalDAVClient.getForAccount('account-1');

    await expect(client.fetchTasks(calendar)).rejects.toMatchObject({ status: 401 });
    expect(mocks.fetchTasks).toHaveBeenCalledTimes(2);
    expect(mocks.refreshOAuthAccountToken).toHaveBeenCalledTimes(1);
  });

  it('adopts tokens already refreshed by another operation', async () => {
    mocks.getAccountById.mockReturnValue(makeAccount('new-access-token'));
    mocks.fetchTasks.mockRejectedValueOnce(unauthorized()).mockResolvedValueOnce([]);
    const client = CalDAVClient.getForAccount('account-1');

    await expect(client.fetchTasks(calendar)).resolves.toEqual([]);

    expect(mocks.refreshOAuthAccountToken).not.toHaveBeenCalled();
    expect(mocks.replaceBearerToken).toHaveBeenCalledWith('account-1', 'new-access-token');
  });

  it('does not refresh basic-auth connections', async () => {
    mocks.getConnection.mockReturnValue(makeConnection());
    mocks.fetchTasks.mockRejectedValueOnce(unauthorized());
    const client = CalDAVClient.getForAccount('account-1');

    await expect(client.fetchTasks(calendar)).rejects.toMatchObject({ status: 401 });
    expect(mocks.refreshOAuthAccountToken).not.toHaveBeenCalled();
    expect(mocks.fetchTasks).toHaveBeenCalledTimes(1);
  });

  it('does not refresh non-401 failures', async () => {
    mocks.fetchTasks.mockRejectedValueOnce(new DetailedError('Access forbidden.', 'HTTP 403', 403));
    const client = CalDAVClient.getForAccount('account-1');

    await expect(client.fetchTasks(calendar)).rejects.toMatchObject({ status: 403 });
    expect(mocks.refreshOAuthAccountToken).not.toHaveBeenCalled();
    expect(mocks.fetchTasks).toHaveBeenCalledTimes(1);
  });

  it('requires reauthorization instead of retrying a cleared refresh token', async () => {
    const account = makeAccount();
    if (account.caldav) account.caldav.refreshToken = undefined;
    mocks.getAccountById.mockReturnValue(account);
    mocks.fetchTasks.mockRejectedValueOnce(unauthorized());
    const client = CalDAVClient.getForAccount('account-1');

    await expect(client.fetchTasks(calendar)).rejects.toMatchObject({
      name: 'OAuthReauthorizationRequiredError',
      accountId: 'account-1',
    });
    expect(mocks.refreshOAuthAccountToken).not.toHaveBeenCalled();
    expect(mocks.fetchTasks).toHaveBeenCalledTimes(1);
  });
});
