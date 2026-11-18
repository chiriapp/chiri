import type { Connection } from '$lib/caldav/connection';
import type { Account } from '$types/account';
import type { Calendar } from '$types/calendar';
import type { FlattenedTask } from '$types/store/tasks';
import type { Task } from '$types/task/model';

/**
 * typed test fixture factories. use these instead of `{} as unknown as Task`
 * so that future required-field additions on the underlying types cause a
 * compile error in one place (here) rather than silently passing in every
 * test that happens not to touch the new field
 *
 * each factory accepts an `overrides` partial for the fields the test cares
 * about. all other required fields get reasonable defaults
 */

const EPOCH = Date.UTC(2025, 0, 1);

export const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'test-task-id',
  uid: 'test-uid',
  title: 'Test task',
  description: '',
  status: 'needs-action',
  completed: false,
  priority: 'none',
  createdAt: new Date(EPOCH),
  modifiedAt: new Date(EPOCH),
  sortOrder: 100,
  accountId: 'test-account',
  calendarId: 'test-calendar',
  synced: false,
  ...overrides,
});

export const makeCalendar = (overrides: Partial<Calendar> = {}): Calendar => ({
  id: 'test-calendar-id',
  displayName: 'Test Calendar',
  url: 'https://cal.example.com/calendars/default/',
  accountId: 'test-account',
  sortOrder: 100,
  ...overrides,
});

export const makeConnection = (overrides: Partial<Connection> = {}): Connection => ({
  serverUrl: 'https://cal.example.com',
  credentials: { username: 'user', password: 'pass' },
  principalUrl: 'https://cal.example.com/principals/user/',
  calendarHome: 'https://cal.example.com/calendars/user/',
  serverType: 'generic',
  ...overrides,
});

export const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'test-account',
  name: 'Test Account',
  calendars: [],
  isActive: true,
  sortOrder: 100,
  caldav: null,
  ...overrides,
});

export const makeFlattenedTask = (overrides: Partial<FlattenedTask> = {}): FlattenedTask => ({
  ...makeTask(),
  ancestorIds: [],
  depth: 0,
  ...overrides,
});
