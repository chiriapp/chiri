import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, Calendar } from '$types';
import type { DataStore } from '$types/store';

const { mockAddCalendar, mockGetSettingsState, mockSetDefaultCalendarIdAutomatically } = vi.hoisted(
  () => ({
    mockAddCalendar: vi.fn().mockResolvedValue(undefined),
    mockGetSettingsState: vi.fn(),
    mockSetDefaultCalendarIdAutomatically: vi.fn(),
  }),
);

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

vi.mock('$lib/database', () => ({
  db: {
    addCalendar: mockAddCalendar,
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
import { addCalendar } from '$lib/store/calendars';

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

const seedStore = (accounts: Account[]) => {
  dataStore.save({
    ...defaultDataStore,
    accounts,
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
