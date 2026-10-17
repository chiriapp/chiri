import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAccountDraft } from '$lib/account/draft';
import { discoverAccountCalendars, fetchTasksForCalendar } from '$lib/account/setup';
import {
  type AccountConnectionInfo,
  type ConnectWithCertHandling,
  runConnectionTest,
} from '$lib/account/test';
import { CalDAVClient } from '$lib/caldav';
import type { Account, AccountDraft } from '$types/account';
import type { Calendar } from '$types/calendar';
import { makeTask } from '../../fixtures';

const { mockCreateTasks, mockEnsureTagExists, mockUpsertCalDAVTaskObjects } = vi.hoisted(() => ({
  mockCreateTasks: vi.fn().mockResolvedValue([]),
  mockEnsureTagExists: vi.fn((name: string) => `tag-${name}`),
  mockUpsertCalDAVTaskObjects: vi.fn().mockResolvedValue([]),
}));

vi.mock('$lib/database', () => ({
  db: { upsertCalDAVTaskObjects: mockUpsertCalDAVTaskObjects },
}));

vi.mock('$lib/store/sync', () => ({
  ensureTagExists: mockEnsureTagExists,
}));

vi.mock('$lib/store/tasks', () => ({
  createTasks: mockCreateTasks,
}));

const draft: AccountDraft = {
  name: 'Example',
  icon: 'user',
  emoji: '',
  serverUrl: 'https://caldav.example.com',
  username: 'alice',
  password: 'secret',
  serverType: 'generic',
  calendarHomeUrl: '',
  principalUrl: '',
  acceptInvalidCerts: false,
};

const calendar: Calendar = {
  id: 'calendar-1',
  displayName: 'Tasks',
  url: 'https://caldav.example.com/tasks/',
  accountId: 'account-1',
  sortOrder: 0,
  supportedComponents: ['VTODO'],
};

const diagnostics = {
  calendarCollectionCount: 1,
  includedCalendarCount: 1,
  explicitVtodoCalendarCount: 1,
  assumedCompatibleCalendarCount: 0,
  nonVtodoCalendarCount: 0,
  nonVtodoCalendarNames: [],
};

const connectionInfo = {
  calendarHome: 'https://caldav.example.com/calendars/alice/',
} as AccountConnectionInfo;

const makeConnect = () => {
  const connect = vi.fn() as unknown as ConnectWithCertHandling;
  vi.mocked(connect).mockResolvedValue(connectionInfo);
  return connect;
};

const makeAccount = (): Account =>
  ({
    id: 'account-1',
    name: 'Existing account',
    calendars: [],
    isActive: true,
    sortOrder: 0,
    caldav: {
      serverUrl: 'https://old.example.com',
      username: 'old-user',
      password: 'old-secret',
      serverType: 'generic',
      authType: 'basic',
    },
  }) as Account;

describe('createAccountDraft', () => {
  it('prefers imported settings while preserving account defaults', () => {
    const result = createAccountDraft(makeAccount(), {
      accountName: 'Imported account',
      serverUrl: 'https://imported.example.com',
      username: 'imported-user',
      serverType: 'nextcloud',
    });

    expect(result).toMatchObject({
      name: 'Imported account',
      serverUrl: 'https://imported.example.com',
      username: 'imported-user',
      serverType: 'nextcloud',
      password: '',
    });
    expect(result.icon).toBe('user');
  });

  it('does not copy an existing password into the editable draft', () => {
    expect(createAccountDraft(makeAccount()).password).toBe('');
  });
});

describe('fetchTasksForCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTasks.mockResolvedValue([]);
    mockEnsureTagExists.mockImplementation((name: string) => `tag-${name}`);
  });

  it('imports all fetched tasks as one batch and maps category tags', async () => {
    const taskObject = {
      taskUid: 'uid-1',
      accountId: 'account-1',
      calendarId: 'calendar-1',
      href: '/tasks/uid-1.ics',
      etag: 'etag-1',
      vtodo: 'BEGIN:VTODO\nUID:uid-1\nEND:VTODO',
      lastSyncAt: new Date('2026-10-15T00:00:00.000Z'),
    };
    const remoteTasks = [
      {
        ...makeTask({ id: 'remote-1', uid: 'uid-1', categoryId: 'work, errands' }),
        caldavObject: taskObject,
      },
      makeTask({ id: 'remote-2', uid: 'uid-2', categoryId: 'work' }),
    ];
    const client = {
      fetchTasks: vi.fn().mockResolvedValue(remoteTasks),
    } as unknown as CalDAVClient;
    vi.spyOn(CalDAVClient, 'getForAccount').mockReturnValue(client);

    await fetchTasksForCalendar('account-1', calendar);

    expect(mockCreateTasks).toHaveBeenCalledTimes(1);
    expect(mockCreateTasks).toHaveBeenCalledWith(
      [
        {
          ...makeTask({ id: 'remote-1', uid: 'uid-1', categoryId: 'work, errands' }),
          tags: ['tag-work', 'tag-errands'],
        },
        { ...remoteTasks[1], tags: ['tag-work'] },
      ],
      { source: 'remote' },
    );
    expect(mockUpsertCalDAVTaskObjects).toHaveBeenCalledWith([taskObject], { notify: false });
    expect(mockEnsureTagExists).toHaveBeenCalledTimes(3);
  });
});

describe('discoverAccountCalendars', () => {
  const client = {
    discoverCalendars: vi.fn(),
  } as unknown as CalDAVClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(CalDAVClient, 'getForAccount').mockReturnValue(client);
    vi.mocked(client.discoverCalendars).mockResolvedValue({ calendars: [calendar], diagnostics });
  });

  it('reuses a successful connection test without reconnecting', async () => {
    const connect = makeConnect();

    const result = await discoverAccountCalendars({
      draft,
      enforceVapid: false,
      effectivePassword: draft.password,
      testSuccess: true,
      testConnectionId: 'tested-connection',
      testedCalendars: [calendar],
      connectWithCertHandling: connect,
      validateServerUrlScheme: () => true,
      validatePrincipalUrl: () => true,
      confirmServerWarning: vi.fn().mockResolvedValue(true),
      confirmServerUrlWarning: vi.fn().mockResolvedValue(true),
    });

    expect(result).toEqual({
      testConnectionId: 'tested-connection',
      calendars: [calendar],
      serverUrl: draft.serverUrl,
      notice: null,
    });
    expect(connect).not.toHaveBeenCalled();
  });

  it('connects, confirms warnings, and discovers calendars for a new setup', async () => {
    const connect = makeConnect();
    const confirmServerWarning = vi.fn().mockResolvedValue(true);
    const confirmServerUrlWarning = vi.fn().mockResolvedValue(true);

    const result = await discoverAccountCalendars({
      draft,
      enforceVapid: false,
      effectivePassword: draft.password,
      testSuccess: false,
      testConnectionId: null,
      testedCalendars: [],
      connectWithCertHandling: connect,
      validateServerUrlScheme: () => true,
      validatePrincipalUrl: () => true,
      confirmServerWarning,
      confirmServerUrlWarning,
    });

    expect(result?.calendars).toEqual([calendar]);
    expect(result?.serverUrl).toBe(draft.serverUrl);
    expect(connect).toHaveBeenCalledWith(expect.any(String), draft.password, draft.serverUrl);
    expect(confirmServerUrlWarning).toHaveBeenCalledWith(draft.serverUrl);
    expect(confirmServerWarning).toHaveBeenCalledWith(connectionInfo.calendarHome);
  });
});

describe('runConnectionTest', () => {
  it('returns discovered calendars and a setup notice result', async () => {
    const client = {
      discoverCalendars: vi.fn().mockResolvedValue({ calendars: [calendar], diagnostics }),
    } as unknown as CalDAVClient;
    vi.spyOn(CalDAVClient, 'getForAccount').mockReturnValue(client);
    const connect = makeConnect();
    const assertActive = vi.fn();

    const result = await runConnectionTest({
      account: null,
      draft,
      enforceVapid: false,
      probeConnectionId: 'probe-1',
      context: { operationId: 'test-operation' },
      connect,
      validateServerUrlScheme: () => true,
      validatePrincipalUrl: () => true,
      confirmServerWarning: vi.fn().mockResolvedValue(true),
      confirmServerUrlWarning: vi.fn().mockResolvedValue(true),
      assertActive,
    });

    expect(result).toEqual({ calendars: [calendar], notice: null });
    expect(connect).toHaveBeenCalledWith('probe-1', draft.password, draft.serverUrl, {
      operationId: 'test-operation',
    });
    expect(assertActive).toHaveBeenCalledTimes(5);
  });
});
