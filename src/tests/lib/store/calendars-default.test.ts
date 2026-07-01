import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, Calendar, Task } from '$types';
import type { DataStore, PendingDeletion } from '$types/store';
import { makeTask } from '../../fixtures';

const {
  mockAddCalendar,
  mockDeleteCalendar,
  mockGetSettingsState,
  mockSetDefaultCalendarIdAutomatically,
} = vi.hoisted(() => ({
  mockAddCalendar: vi.fn().mockResolvedValue(undefined),
  mockDeleteCalendar: vi.fn().mockResolvedValue(undefined),
  mockGetSettingsState: vi.fn(),
  mockSetDefaultCalendarIdAutomatically: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

vi.mock('$lib/database', () => ({
  db: {
    addCalendar: mockAddCalendar,
    deleteCalendar: mockDeleteCalendar,
  },
}));

vi.mock('$context/settingsContext', () => ({
  settingsStore: {
    getState: mockGetSettingsState,
    setDefaultCalendarIdAutomatically: mockSetDefaultCalendarIdAutomatically,
  },
}));

import { DEFAULT_CALENDAR_NAME } from '$constants';
import { dataStore, defaultDataStore, defaultUIState } from '$lib/store';
import { addCalendar, deleteCalendar } from '$lib/store/calendars';

const localCalendar: Calendar = {
  id: 'local-calendar',
  accountId: 'local-account',
  displayName: DEFAULT_CALENDAR_NAME,
  url: 'local://local-calendar',
  sortOrder: 100,
};

const localAccount: Account = {
  id: 'local-account',
  name: 'Local',
  calendars: [localCalendar],
  isActive: true,
  sortOrder: 100,
  caldav: null,
};

const remoteAccount: Account = {
  id: 'remote-account',
  name: 'RustiCal',
  calendars: [],
  isActive: true,
  sortOrder: 200,
  caldav: {
    serverUrl: 'https://example.invalid/caldav/',
    username: 'chloe',
    password: 'secret',
    serverType: 'rustical',
    authType: 'basic',
  },
};

const seedStore = (
  accounts: Account[],
  tasks: Task[] = [],
  pendingDeletions: PendingDeletion[] = [],
) => {
  dataStore.save({
    ...defaultDataStore,
    accounts,
    tasks,
    pendingDeletions,
    ui: defaultUIState,
  } satisfies DataStore);
};

describe('addCalendar default task calendar adoption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettingsState.mockReturnValue({
      defaultCalendarId: null,
      defaultCalendarIdManuallyChanged: false,
      preferCalDAVCalendarForNewTasks: true,
    });
    seedStore([localAccount, remoteAccount]);
  });

  it('uses the first remote task calendar as the default for untouched settings', async () => {
    await addCalendar('remote-account', {
      id: 'remote-calendar',
      displayName: 'Work',
      url: 'https://example.invalid/caldav/work/',
      supportedComponents: ['VTODO'],
    });

    expect(mockSetDefaultCalendarIdAutomatically).toHaveBeenCalledWith('remote-calendar');
  });

  it('moves the default off the built-in local calendar when settings are untouched', async () => {
    mockGetSettingsState.mockReturnValue({
      defaultCalendarId: 'local-calendar',
      defaultCalendarIdManuallyChanged: false,
      preferCalDAVCalendarForNewTasks: true,
    });

    await addCalendar('remote-account', {
      id: 'remote-calendar',
      displayName: 'Work',
      url: 'https://example.invalid/caldav/work/',
      supportedComponents: ['VTODO'],
    });

    expect(mockSetDefaultCalendarIdAutomatically).toHaveBeenCalledWith('remote-calendar');
  });

  it('respects manually selected task defaults', async () => {
    mockGetSettingsState.mockReturnValue({
      defaultCalendarId: 'local-calendar',
      defaultCalendarIdManuallyChanged: true,
      preferCalDAVCalendarForNewTasks: true,
    });

    await addCalendar('remote-account', {
      id: 'remote-calendar',
      displayName: 'Work',
      url: 'https://example.invalid/caldav/work/',
      supportedComponents: ['VTODO'],
    });

    expect(mockSetDefaultCalendarIdAutomatically).not.toHaveBeenCalled();
  });

  it('does not change the task default when CalDAV preference is off', async () => {
    mockGetSettingsState.mockReturnValue({
      defaultCalendarId: null,
      defaultCalendarIdManuallyChanged: false,
      preferCalDAVCalendarForNewTasks: false,
    });

    await addCalendar('remote-account', {
      id: 'remote-calendar',
      displayName: 'Work',
      url: 'https://example.invalid/caldav/work/',
      supportedComponents: ['VTODO'],
    });

    expect(mockSetDefaultCalendarIdAutomatically).not.toHaveBeenCalled();
  });
});

describe('deleteCalendar tombstone lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettingsState.mockReturnValue({
      defaultCalendarId: null,
      defaultCalendarIdManuallyChanged: false,
      preferCalDAVCalendarForNewTasks: false,
    });
  });

  it('removes calendar tasks and clears matching pending deletions without queuing tombstones', () => {
    const calendarToDelete: Calendar = {
      ...localCalendar,
      id: 'remote-calendar',
      accountId: 'remote-account',
      url: 'https://example.invalid/caldav/work/',
    };
    const otherCalendar: Calendar = {
      ...localCalendar,
      id: 'other-calendar',
      accountId: 'remote-account',
      url: 'https://example.invalid/caldav/personal/',
    };
    const account: Account = {
      ...remoteAccount,
      calendars: [calendarToDelete, otherCalendar],
    };
    const deletedCalendarTask = makeTask({
      id: 'task-delete',
      uid: 'uid-delete',
      accountId: 'remote-account',
      calendarId: 'remote-calendar',
      href: 'https://example.invalid/caldav/work/uid-delete.ics',
      etag: 'old-etag',
    });
    const keptTask = makeTask({
      id: 'task-keep',
      uid: 'uid-keep',
      accountId: 'remote-account',
      calendarId: 'other-calendar',
      href: 'https://example.invalid/caldav/personal/uid-keep.ics',
    });
    const staleDeletedCalendarTombstone: PendingDeletion = {
      uid: 'stale-delete',
      href: 'https://example.invalid/caldav/work/stale-delete.ics',
      accountId: 'remote-account',
      calendarId: 'remote-calendar',
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const otherCalendarTombstone: PendingDeletion = {
      uid: 'stale-keep',
      href: 'https://example.invalid/caldav/personal/stale-keep.ics',
      accountId: 'remote-account',
      calendarId: 'other-calendar',
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    seedStore(
      [account],
      [deletedCalendarTask, keptTask],
      [staleDeletedCalendarTombstone, otherCalendarTombstone],
    );

    deleteCalendar('remote-account', 'remote-calendar');

    expect(mockDeleteCalendar).toHaveBeenCalledWith('remote-account', 'remote-calendar');
    expect(dataStore.load().tasks).toEqual([keptTask]);
    expect(dataStore.load().pendingDeletions).toEqual([otherCalendarTombstone]);
  });
});
