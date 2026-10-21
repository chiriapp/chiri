import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalDAVTaskObject, TaskWithCalDAVObject } from '$lib/caldav/types';
import type { Task } from '$types/task/model';
import { makeCalendar, makeTask } from '../../fixtures';

/**
 * tests for `syncCalendarTasks`. the orchestrator that stitches the CalDAV
 * layer to the local store. verifies the four-step flow:
 *   0. processPendingDeletions (DELETE on server, clear only after confirmation)
 *   1. pushUnsyncedTasks (createTask / updateTask, mark synced)
 *   2. fetchTasks
 *   3. createTask locally for new remote, updateTask for changed, removeLocalTask for gone
 */

// vi.mock factories hoist. set up mock refs via vi.hoisted
const mocks = vi.hoisted(() => ({
  // CalDAV client (mocked at the class level)
  clientCreateTask: vi.fn(),
  clientUpdateTask: vi.fn(),
  clientDeleteTask: vi.fn(),
  clientFetchTasks: vi.fn(),
  clientFetchCalendars: vi.fn(),
  clientCalendarExists: vi.fn(),
  isConnected: vi.fn(() => true),
  reconnect: vi.fn(),

  // store accessors
  getAllAccounts: vi.fn(),
  getUIState: vi.fn(() => ({
    activeCalendarId: null,
    calendarSortConfig: { mode: 'manual' },
  })),
  setAllTasksView: vi.fn(),
  getTasksByCalendar: vi.fn(),
  getAllTasks: vi.fn(),
  localCreateTask: vi.fn(),
  localCreateTasks: vi.fn().mockResolvedValue([]),
  localUpdateTask: vi.fn(),
  replaceTasksFromSync: vi.fn().mockResolvedValue([]),
  removeLocalTask: vi.fn(),
  localAddCalendar: vi.fn(),
  localDeleteCalendar: vi.fn(),
  localUpdateCalendar: vi.fn(),
  disablePushForCalendar: vi.fn(),
  emit: vi.fn(),

  // DB / dataStore
  pendingDeletions: [] as Array<{
    uid: string;
    href: string;
    accountId: string;
    calendarId: string;
  }>,
  clearPendingDeletion: vi.fn().mockResolvedValue(undefined),
  markPendingDeletionAttempt: vi.fn().mockResolvedValue(undefined),
  addPendingDeletion: vi.fn().mockResolvedValue(undefined),
  getCalDAVTaskObjectByUid: vi.fn().mockResolvedValue(undefined),
  getCalDAVTaskObjectsByCalendar: vi.fn().mockResolvedValue([]),
  upsertCalDAVTaskObject: vi.fn().mockResolvedValue(undefined),
  upsertCalDAVTaskObjects: vi.fn().mockResolvedValue([]),
  removeCalDAVTaskObjectByUid: vi.fn().mockResolvedValue(undefined),
  beginBatch: vi.fn(),
  endBatch: vi.fn(),
}));

vi.mock('$lib/caldav', () => ({
  CalDAVClient: {
    isConnected: mocks.isConnected,
    reconnect: mocks.reconnect,
    getForAccount: vi.fn(() => ({
      createTask: mocks.clientCreateTask,
      updateTask: mocks.clientUpdateTask,
      deleteTask: mocks.clientDeleteTask,
      fetchTasks: mocks.clientFetchTasks,
      fetchCalendars: mocks.clientFetchCalendars,
      calendarExists: mocks.clientCalendarExists,
    })),
  },
}));

vi.mock('$lib/caldav/setup', () => ({
  getCalDAVErrorInfo: () => ({ hint: 'Reconnect the account.' }),
}));

vi.mock('$lib/store/accounts', () => ({
  getAllAccounts: mocks.getAllAccounts,
  getAccountById: vi.fn(),
}));

vi.mock('$lib/store/tasks', () => ({
  getAllTasks: mocks.getAllTasks,
  getTasksByCalendar: mocks.getTasksByCalendar,
  createTask: mocks.localCreateTask,
  createTasks: mocks.localCreateTasks,
  updateTask: mocks.localUpdateTask,
  replaceTasksFromSync: mocks.replaceTasksFromSync,
  removeLocalTask: mocks.removeLocalTask,
}));

vi.mock('$lib/store/calendars', () => ({
  addCalendar: mocks.localAddCalendar,
  deleteCalendar: mocks.localDeleteCalendar,
  updateCalendar: mocks.localUpdateCalendar,
}));

vi.mock('$lib/store/tags', () => ({
  createTag: vi.fn(),
  getAllTags: vi.fn(() => []),
  updateTag: vi.fn(),
}));

vi.mock('$lib/store/ui', () => ({
  getUIState: mocks.getUIState,
  setAllTasksView: mocks.setAllTasksView,
}));

vi.mock('$lib/store', () => ({
  dataStore: {
    load: vi.fn(() => ({ pendingDeletions: mocks.pendingDeletions })),
    save: vi.fn(),
    beginBatch: mocks.beginBatch,
    endBatch: mocks.endBatch,
  },
}));

vi.mock('$lib/database', () => ({
  db: {
    clearPendingDeletion: mocks.clearPendingDeletion,
    markPendingDeletionAttempt: mocks.markPendingDeletionAttempt,
    addPendingDeletion: mocks.addPendingDeletion,
    getCalDAVTaskObjectByUid: mocks.getCalDAVTaskObjectByUid,
    getCalDAVTaskObjectsByCalendar: mocks.getCalDAVTaskObjectsByCalendar,
    upsertCalDAVTaskObject: mocks.upsertCalDAVTaskObject,
    upsertCalDAVTaskObjects: mocks.upsertCalDAVTaskObjects,
    removeCalDAVTaskObjectByUid: mocks.removeCalDAVTaskObjectByUid,
  },
}));

vi.mock('$context/settingsContext', () => ({
  settingsStore: { getState: vi.fn(() => ({})) },
}));

vi.mock('$lib/toastManager', () => ({
  toastManager: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('$lib/push', () => ({
  disablePushForCalendar: mocks.disablePushForCalendar,
}));

vi.mock('@tauri-apps/api/event', () => ({ emit: mocks.emit }));

vi.mock('$lib/auth/refresh', () => {
  class OAuthReauthorizationRequiredError extends Error {
    constructor(
      readonly accountId: string,
      message: string,
    ) {
      super(message);
      this.name = 'OAuthReauthorizationRequiredError';
    }
  }
  return {
    OAuthReauthorizationRequiredError,
    isOAuthReauthorizationRequiredError: (error: unknown) =>
      error instanceof OAuthReauthorizationRequiredError,
  };
});

vi.mock('$utils/color/scheme', () => ({
  getColorSchemeColorPresets: vi.fn(() => ['#ef4444']),
}));

vi.mock('$constants/menu', () => ({ MENU_EVENTS: { EDIT_ACCOUNT: 'menu:edit-account' } }));

vi.mock('$lib/queryClient', () => ({
  queryKeys: {
    tasks: { all: ['tasks'] },
    accounts: { all: ['accounts'] },
    tags: { all: ['tags'] },
  },
}));

vi.mock('$lib/http', () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

vi.mock('$utils/color/tag', () => ({
  generateTagColor: vi.fn(() => '#000'),
}));

vi.mock('$utils/color/theme', () => ({
  resolveEffectiveTheme: vi.fn(() => 'light'),
}));

import { OAuthReauthorizationRequiredError } from '$lib/auth/refresh';
import { taskToVTodo } from '$lib/ical/vtodo';
// import AFTER mocks are set up
import { reconnectAccounts, syncCalendarsForAccount, syncCalendarTasks } from '$lib/store/sync';
import { toastManager } from '$lib/toastManager';

const testCalendar = makeCalendar({
  id: 'cal-1',
  url: 'https://server/calendars/test/',
  displayName: 'Test',
  accountId: 'acct-1',
});

const testAccount = {
  id: 'acct-1',
  name: 'Test Account',
  calendars: [testCalendar],
  caldav: {
    serverUrl: 'https://server/',
    username: 'user',
    password: 'pass',
    serverType: 'generic' as const,
    authType: 'basic' as const,
  },
};

const testOAuthAccount = {
  ...testAccount,
  caldav: {
    ...testAccount.caldav,
    password: 'expired-access-token',
    serverType: 'fastmail' as const,
    authType: 'oauth' as const,
    refreshToken: 'refresh-token',
    tokenExpiry: new Date(Date.now() - 1000).toISOString(),
  },
};

const queryClient = { invalidateQueries: vi.fn() } as unknown as Parameters<
  typeof syncCalendarTasks
>[1];

const noopSetSyncing = () => {};

describe('reconnectAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isConnected.mockReturnValue(true);
    mocks.getAllAccounts.mockReturnValue([testOAuthAccount]);
  });

  it('keeps using a connected Fastmail account when its access token is expired', async () => {
    const failedAccountIds = await reconnectAccounts();

    expect(mocks.reconnect).not.toHaveBeenCalled();
    expect(failedAccountIds.size).toBe(0);
  });

  it('still reconnects connected non-Fastmail OAuth accounts when their token is expired', async () => {
    const stalwartAccount = {
      ...testOAuthAccount,
      caldav: { ...testOAuthAccount.caldav, serverType: 'stalwart' as const },
    };
    mocks.getAllAccounts.mockReturnValueOnce([stalwartAccount]);

    const failedAccountIds = await reconnectAccounts();

    expect(mocks.reconnect).toHaveBeenCalledWith(stalwartAccount);
    expect(failedAccountIds.size).toBe(0);
  });

  it('does not reconnect connected basic-auth accounts', async () => {
    mocks.getAllAccounts.mockReturnValueOnce([testAccount]);

    await reconnectAccounts();

    expect(mocks.reconnect).not.toHaveBeenCalled();
  });

  it('offers Fastmail reauthorization when its grant is no longer usable', async () => {
    const fastmailAccount = {
      ...testOAuthAccount,
      caldav: { ...testOAuthAccount.caldav, serverType: 'fastmail' as const },
    };
    mocks.getAllAccounts.mockReturnValueOnce([fastmailAccount]);
    mocks.isConnected.mockReturnValueOnce(false);
    mocks.reconnect.mockRejectedValueOnce(
      new OAuthReauthorizationRequiredError(
        fastmailAccount.id,
        'This authorization has been revoked.',
      ),
    );

    await reconnectAccounts();

    const toastOptions = vi.mocked(toastManager.error).mock.calls[0]?.[2];
    expect(toastOptions).toMatchObject({
      action: { label: 'Reconnect Fastmail' },
      closeButton: true,
      duration: Number.POSITIVE_INFINITY,
    });
    toastOptions?.action?.onClick();
    expect(mocks.emit).toHaveBeenCalledWith('menu:edit-account', {
      accountId: fastmailAccount.id,
      reauthorize: true,
    });
  });
});

describe('syncCalendarsForAccount', () => {
  const workCalendar = makeCalendar({
    id: 'cal-work',
    url: 'https://server/calendars/work/',
    displayName: 'Work',
    accountId: 'acct-1',
  });
  const homeCalendar = makeCalendar({
    id: 'cal-home',
    url: 'https://server/calendars/home/',
    displayName: 'Home',
    accountId: 'acct-1',
  });
  const accountWithCalendars = {
    ...testAccount,
    calendars: [workCalendar, homeCalendar],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllAccounts.mockReturnValue([accountWithCalendars]);
    mocks.getUIState.mockReturnValue({
      activeCalendarId: null,
      calendarSortConfig: { mode: 'manual' },
    });
    mocks.isConnected.mockReturnValue(true);
    mocks.clientFetchCalendars.mockResolvedValue([]);
    mocks.clientCalendarExists.mockResolvedValue(false);
    mocks.getTasksByCalendar.mockReturnValue([]);
    mocks.disablePushForCalendar.mockResolvedValue(undefined);
  });

  it('removes local calendars when an empty server listing is confirmed by direct PROPFIND', async () => {
    mocks.getTasksByCalendar.mockImplementation((calendarId: string) =>
      calendarId === 'cal-work'
        ? [makeTask({ id: 'task-work', calendarId, accountId: 'acct-1', synced: true })]
        : [],
    );

    const result = await syncCalendarsForAccount('acct-1', queryClient);

    expect(mocks.clientCalendarExists).toHaveBeenCalledWith(workCalendar.url);
    expect(mocks.clientCalendarExists).toHaveBeenCalledWith(homeCalendar.url);
    expect(mocks.removeLocalTask).toHaveBeenCalledWith('task-work');
    expect(mocks.localDeleteCalendar).toHaveBeenCalledWith('acct-1', 'cal-work');
    expect(mocks.localDeleteCalendar).toHaveBeenCalledWith('acct-1', 'cal-home');
    expect(result).toEqual([]);
  });

  it('preserves local calendars when an empty server listing is contradicted by direct PROPFIND', async () => {
    mocks.clientCalendarExists.mockResolvedValue(true);

    const result = await syncCalendarsForAccount('acct-1', queryClient);

    expect(mocks.clientCalendarExists).toHaveBeenCalledTimes(2);
    expect(mocks.localDeleteCalendar).not.toHaveBeenCalled();
    expect(mocks.removeLocalTask).not.toHaveBeenCalled();
    expect(result).toEqual([workCalendar, homeCalendar]);
  });

  it('preserves local calendars when direct deletion verification fails', async () => {
    mocks.clientCalendarExists.mockRejectedValue(new Error('server unreachable'));

    await syncCalendarsForAccount('acct-1', queryClient);

    expect(mocks.localDeleteCalendar).not.toHaveBeenCalled();
    expect(mocks.removeLocalTask).not.toHaveBeenCalled();
  });
});

describe('syncCalendarTasks orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pendingDeletions = [];
    mocks.getAllTasks.mockReturnValue([]);
    mocks.getAllAccounts.mockReturnValue([testAccount]);
    mocks.isConnected.mockReturnValue(true);
  });

  it('does nothing and bails if the calendar is not found in any account', async () => {
    mocks.getAllAccounts.mockReturnValueOnce([]);

    await syncCalendarTasks('missing-cal', queryClient, noopSetSyncing);

    expect(mocks.clientFetchTasks).not.toHaveBeenCalled();
    expect(mocks.localCreateTask).not.toHaveBeenCalled();
  });

  it('reconnects automatically if not connected', async () => {
    mocks.isConnected.mockReturnValueOnce(false);
    mocks.getTasksByCalendar.mockReturnValue([]);
    mocks.clientFetchTasks.mockResolvedValueOnce([]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.reconnect).toHaveBeenCalledWith(testAccount);
  });

  it('does not reconnect a connected Fastmail account based on token expiry', async () => {
    mocks.getAllAccounts.mockReturnValue([testOAuthAccount]);
    mocks.getTasksByCalendar.mockReturnValue([]);
    mocks.clientFetchTasks.mockResolvedValueOnce([]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.reconnect).not.toHaveBeenCalled();
  });

  it('step 0: processes pending deletions BEFORE pushing local changes', async () => {
    const callOrder: string[] = [];
    mocks.pendingDeletions = [
      { uid: 'pending-1', href: '/c/pending-1.ics', accountId: 'acct-1', calendarId: 'cal-1' },
    ];
    mocks.clientDeleteTask.mockImplementation(async () => {
      callOrder.push('delete');
      return true;
    });
    mocks.clientCreateTask.mockImplementation(async () => {
      callOrder.push('create');
      return { href: '/c/new.ics', etag: 'e' };
    });
    mocks.getTasksByCalendar.mockReturnValue([
      makeTask({ id: 'local-new', uid: 'new', calendarId: 'cal-1', synced: false }),
    ]);
    mocks.clientFetchTasks.mockResolvedValueOnce([]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(callOrder).toEqual(['delete', 'create']);
    expect(mocks.clientDeleteTask).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'pending-1', href: '/c/pending-1.ics' }),
    );
  });

  it('step 0: keeps pending deletion queued when the server DELETE throws', async () => {
    mocks.pendingDeletions = [
      { uid: 'doomed', href: '/c/x.ics', accountId: 'acct-1', calendarId: 'cal-1' },
    ];
    mocks.clientDeleteTask.mockRejectedValueOnce(new Error('server unreachable'));
    mocks.getTasksByCalendar.mockReturnValue([]);
    mocks.clientFetchTasks.mockResolvedValueOnce([]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.clearPendingDeletion).not.toHaveBeenCalled();
    expect(mocks.markPendingDeletionAttempt).toHaveBeenCalledWith(
      'doomed',
      expect.stringContaining('server unreachable'),
    );
  });

  it('step 0: keeps pending deletion queued when the server rejects the DELETE', async () => {
    mocks.pendingDeletions = [
      { uid: 'doomed', href: '/c/x.ics', accountId: 'acct-1', calendarId: 'cal-1' },
    ];
    mocks.clientDeleteTask.mockResolvedValueOnce(false);
    mocks.getTasksByCalendar.mockReturnValue([]);
    mocks.clientFetchTasks.mockResolvedValueOnce([]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.clearPendingDeletion).not.toHaveBeenCalled();
    expect(mocks.markPendingDeletionAttempt).toHaveBeenCalledWith(
      'doomed',
      expect.stringContaining('/c/x.ics'),
    );
  });

  it('step 1: pushes unsynced new tasks via createTask, marks them synced afterwards', async () => {
    const unsynced = makeTask({
      id: 'local-1',
      uid: 'new-uid',
      calendarId: 'cal-1',
      synced: false,
      href: undefined,
    });
    mocks.getTasksByCalendar.mockReturnValue([unsynced]);
    mocks.clientCreateTask.mockResolvedValueOnce({ href: '/c/new-uid.ics', etag: 'e1' });
    mocks.clientFetchTasks.mockResolvedValueOnce([]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.clientCreateTask).toHaveBeenCalledWith(testCalendar, unsynced);
    expect(mocks.localUpdateTask).toHaveBeenCalledWith('local-1', {
      href: '/c/new-uid.ics',
      etag: 'e1',
      synced: true,
    });
  });

  it('step 1: pushes unsynced existing tasks (with href) via updateTask', async () => {
    const unsynced = makeTask({
      id: 'local-2',
      uid: 'existing-uid',
      calendarId: 'cal-1',
      synced: false,
      href: '/c/existing-uid.ics',
      etag: 'old-etag',
    });
    mocks.getTasksByCalendar.mockReturnValue([unsynced]);
    mocks.clientUpdateTask.mockResolvedValueOnce({ etag: 'new-etag' });
    mocks.clientFetchTasks.mockResolvedValueOnce([]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.clientUpdateTask).toHaveBeenCalledWith(unsynced);
    expect(mocks.clientCreateTask).not.toHaveBeenCalled();
    expect(mocks.localUpdateTask).toHaveBeenCalledWith('local-2', {
      etag: 'new-etag',
      synced: true,
    });
  });

  it('step 1: repairs a dragged task whose href still belongs to another calendar', async () => {
    const moved = makeTask({
      id: 'moved-task',
      uid: 'moved-uid',
      accountId: 'acct-1',
      calendarId: 'cal-1',
      synced: false,
      href: '/old-calendar/moved.ics',
      etag: 'old-etag',
    });
    mocks.getTasksByCalendar.mockReturnValue([moved]);
    mocks.getCalDAVTaskObjectByUid.mockResolvedValueOnce({
      taskUid: moved.uid,
      accountId: 'old-account',
      calendarId: 'old-calendar',
      href: '/old-calendar/moved.ics',
      etag: 'old-etag',
      vtodo: taskToVTodo(moved),
      lastSyncAt: new Date(),
    });
    mocks.localUpdateTask.mockImplementationOnce((id: string, updates: Partial<Task>) => ({
      ...moved,
      ...updates,
      id,
    }));
    mocks.clientCreateTask.mockResolvedValueOnce({ href: '/cal-1/moved.ics', etag: 'new-etag' });
    mocks.clientFetchTasks.mockResolvedValueOnce([]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.addPendingDeletion).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: moved.uid,
        accountId: 'old-account',
        calendarId: 'old-calendar',
        href: '/old-calendar/moved.ics',
      }),
    );
    expect(mocks.clientUpdateTask).not.toHaveBeenCalled();
    expect(mocks.clientCreateTask).toHaveBeenCalledWith(
      testCalendar,
      expect.objectContaining({ uid: moved.uid, href: undefined, etag: undefined }),
    );
  });

  it('step 1: DOES NOT mark task as synced when push returns null (server failure)', async () => {
    const unsynced = makeTask({
      id: 'local-3',
      uid: 'fail-uid',
      calendarId: 'cal-1',
      synced: false,
    });
    mocks.getTasksByCalendar.mockReturnValue([unsynced]);
    mocks.clientCreateTask.mockResolvedValueOnce(null); // CalDAV layer returned null
    mocks.clientFetchTasks.mockResolvedValueOnce([]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.localUpdateTask).not.toHaveBeenCalled();
    // task stays unsynced; will retry next pass
  });

  it('returns early without removing local tasks when fetchTasks returns null', async () => {
    // critical: a server fetch failure must NOT cause us to think the calendar
    // is empty and locally delete every synced task
    const synced = makeTask({
      id: 'local-keep',
      uid: 'keep',
      calendarId: 'cal-1',
      synced: true,
      href: '/c/keep.ics',
    });
    mocks.getTasksByCalendar.mockReturnValue([synced]);
    mocks.clientFetchTasks.mockResolvedValueOnce(null);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.removeLocalTask).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it('step 3: creates locally for remote tasks not in local set', async () => {
    mocks.getTasksByCalendar.mockReturnValue([]); // empty local
    const remote = makeTask({ uid: 'remote-only', calendarId: 'cal-1', etag: 'r-etag' });
    mocks.clientFetchTasks.mockResolvedValueOnce([remote]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.localCreateTasks).toHaveBeenCalledWith(
      [expect.objectContaining({ uid: 'remote-only' })],
      { source: 'remote' },
    );
  });

  it('step 3: skips a remote UID that already exists in another local calendar', async () => {
    const moved = makeTask({
      id: 'moved-local',
      uid: 'shared-moved-uid',
      accountId: 'destination-account',
      calendarId: 'destination-calendar',
      href: '/cal-1/shared-moved-uid.ics',
      etag: 'old-etag',
      synced: false,
    });
    const remote = makeTask({
      uid: moved.uid,
      accountId: 'acct-1',
      calendarId: 'cal-1',
      href: '/cal-1/shared-moved-uid.ics',
      etag: 'remote-etag',
    });
    mocks.getTasksByCalendar.mockReturnValue([]);
    mocks.getAllTasks.mockReturnValue([moved]);
    mocks.clientFetchTasks.mockResolvedValueOnce([remote]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.localCreateTasks).toHaveBeenCalledWith([], { source: 'remote' });
    expect(mocks.addPendingDeletion).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: moved.uid,
        accountId: 'acct-1',
        calendarId: 'cal-1',
        href: '/cal-1/shared-moved-uid.ics',
      }),
    );
    expect(mocks.localUpdateTask).toHaveBeenCalledWith(moved.id, {
      href: undefined,
      etag: undefined,
      synced: false,
    });
  });

  it('step 3: updates locally when remote etag differs from local synced etag', async () => {
    const local = makeTask({
      id: 'local-x',
      uid: 'shared',
      calendarId: 'cal-1',
      synced: true,
      etag: 'old',
    });
    const remote = makeTask({
      uid: 'shared',
      calendarId: 'cal-1',
      etag: 'new',
      title: 'Modified',
    });
    mocks.getTasksByCalendar.mockReturnValue([local]);
    mocks.clientFetchTasks.mockResolvedValueOnce([remote]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.replaceTasksFromSync).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'local-x', synced: true, title: 'Modified' }),
    ]);
  });

  it('step 3: preserves local changes when push failed (local stays unsynced)', async () => {
    // scenario: user has local pending edits (synced=false, has href). step 1
    // attempts the push but the server rejects it (returns null). step 3 then
    // sees a remote task with a different etag. the orchestrator MUST NOT
    // overwrite the unsynced local task with the remote version. that would
    // silently lose the user's pending edits
    const local = makeTask({
      id: 'local-y',
      uid: 'conflict',
      calendarId: 'cal-1',
      synced: false,
      href: '/c/conflict.ics',
      etag: 'old',
    });
    const remote = makeTask({ uid: 'conflict', calendarId: 'cal-1', etag: 'new' });
    mocks.getTasksByCalendar.mockReturnValue([local]);
    mocks.clientUpdateTask.mockResolvedValueOnce(null); // push fails
    mocks.clientFetchTasks.mockResolvedValueOnce([remote]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    // step 1 attempted the push
    expect(mocks.clientUpdateTask).toHaveBeenCalledWith(local);
    // step 1 did NOT mark synced (push returned null)
    // step 3 did NOT overwrite the local task with the remote version
    expect(mocks.localUpdateTask).not.toHaveBeenCalled();
    expect(mocks.replaceTasksFromSync).toHaveBeenCalledWith([]);
  });

  it('step 3: merges remote changes into untouched local fields using the last baseline', async () => {
    const baseline = makeTask({
      id: 'baseline-id',
      uid: 'shared',
      title: 'Base title',
      description: 'Base description',
      href: 'https://server/cal/shared.ics',
      etag: 'base-etag',
      calendarId: 'cal-1',
      accountId: 'acct-1',
      synced: true,
    });
    const local = makeTask({
      id: 'local-id',
      uid: 'shared',
      title: 'Local title',
      description: 'Base description',
      href: 'https://server/cal/shared.ics',
      etag: 'base-etag',
      calendarId: 'cal-1',
      accountId: 'acct-1',
      synced: false,
      modifiedAt: new Date('2026-06-03T10:00:00.000Z'),
    });
    const remote = makeTask({
      id: 'remote-id',
      uid: 'shared',
      title: 'Base title',
      description: 'Remote description',
      href: 'https://server/cal/shared.ics',
      etag: 'remote-etag',
      calendarId: 'cal-1',
      accountId: 'acct-1',
      synced: true,
    });
    const remoteObject: CalDAVTaskObject = {
      taskUid: 'shared',
      accountId: 'acct-1',
      calendarId: 'cal-1',
      href: 'https://server/cal/shared.ics',
      etag: 'remote-etag',
      vtodo: taskToVTodo(remote),
      lastSyncAt: new Date('2026-06-03T10:01:00.000Z'),
    };

    mocks.getTasksByCalendar.mockReturnValue([local]);
    mocks.clientUpdateTask.mockResolvedValueOnce(null);
    mocks.clientFetchTasks.mockResolvedValueOnce([
      { ...remote, caldavObject: remoteObject } satisfies TaskWithCalDAVObject,
    ]);
    mocks.getCalDAVTaskObjectsByCalendar.mockResolvedValueOnce([
      {
        taskUid: 'shared',
        accountId: 'acct-1',
        calendarId: 'cal-1',
        href: 'https://server/cal/shared.ics',
        etag: 'base-etag',
        vtodo: taskToVTodo(baseline),
        lastSyncAt: new Date('2026-06-03T09:00:00.000Z'),
      } satisfies CalDAVTaskObject,
    ]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    const replacement = mocks.replaceTasksFromSync.mock.calls[0]?.[0]?.[0];
    expect(replacement).toMatchObject({
      id: 'local-id',
      title: 'Local title',
      description: 'Remote description',
      href: 'https://server/cal/shared.ics',
      etag: 'remote-etag',
      synced: false,
      modifiedAt: local.modifiedAt,
    });
    expect(mocks.upsertCalDAVTaskObjects).toHaveBeenCalledWith([remoteObject], { notify: false });
  });

  it('batches a large existing-task reconciliation into one store and baseline write', async () => {
    const localTasks = Array.from({ length: 500 }, (_, index) =>
      makeTask({
        id: `local-${index}`,
        uid: `shared-${index}`,
        calendarId: 'cal-1',
        synced: true,
        etag: `old-${index}`,
      }),
    );
    const remoteTasks = localTasks.map((localTask, index) => {
      const remoteTask = makeTask({
        ...localTask,
        id: `remote-${index}`,
        title: `Remote ${index}`,
        etag: `new-${index}`,
      });
      return {
        ...remoteTask,
        caldavObject: {
          taskUid: remoteTask.uid,
          accountId: remoteTask.accountId,
          calendarId: remoteTask.calendarId,
          href: `/cal/${remoteTask.uid}.ics`,
          etag: remoteTask.etag,
          vtodo: taskToVTodo(remoteTask),
          lastSyncAt: new Date(),
        },
      } satisfies TaskWithCalDAVObject;
    });
    mocks.getTasksByCalendar.mockReturnValue(localTasks);
    mocks.clientFetchTasks.mockResolvedValueOnce(remoteTasks);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.localUpdateTask).not.toHaveBeenCalled();
    expect(mocks.replaceTasksFromSync).toHaveBeenCalledTimes(1);
    expect(mocks.replaceTasksFromSync.mock.calls[0]?.[0]).toHaveLength(500);
    expect(mocks.upsertCalDAVTaskObjects).toHaveBeenCalledTimes(1);
    expect(mocks.upsertCalDAVTaskObjects.mock.calls[0]?.[0]).toHaveLength(500);
    expect(mocks.beginBatch).toHaveBeenCalledTimes(1);
    expect(mocks.endBatch).toHaveBeenCalledTimes(1);
  });

  it('step 4: removes locally when synced local task missing from server', async () => {
    const gone = makeTask({
      id: 'local-gone',
      uid: 'gone',
      calendarId: 'cal-1',
      synced: true,
      href: '/c/gone.ics',
    });
    mocks.getTasksByCalendar.mockReturnValue([gone]);
    mocks.clientFetchTasks.mockResolvedValueOnce([]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.removeLocalTask).toHaveBeenCalledWith('local-gone');
  });

  it('step 4: does NOT remove unsynced local tasks even when missing from server', async () => {
    // brand-new local task that hasn't synced yet. Server doesn't know about it
    // must be preserved, not deleted as "missing remotely"
    const fresh = makeTask({
      id: 'local-fresh',
      uid: 'fresh',
      calendarId: 'cal-1',
      synced: false,
    });
    mocks.getTasksByCalendar.mockReturnValueOnce([fresh]).mockReturnValueOnce([fresh]);
    mocks.clientFetchTasks.mockResolvedValueOnce([]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.removeLocalTask).not.toHaveBeenCalled();
  });

  it('invalidates query keys after a successful sync', async () => {
    mocks.getTasksByCalendar.mockReturnValue([]);
    mocks.clientFetchTasks.mockResolvedValueOnce([]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['accounts'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tags'] });
  });

  it('always clears the syncing-calendar indicator, even on failure', async () => {
    const setSyncingCalls: (string | null)[] = [];
    const setSyncing = (v: string | null) => setSyncingCalls.push(v);
    mocks.getTasksByCalendar.mockReturnValue([]);
    mocks.clientFetchTasks.mockRejectedValueOnce(new Error('boom'));

    await expect(syncCalendarTasks('cal-1', queryClient, setSyncing)).rejects.toThrow();

    expect(setSyncingCalls).toEqual(['cal-1', null]);
  });
});

// pushTaskToServer + removeTaskFromServer. single-task entry points used by
// the UI for optimistic-write flows (create, complete, delete)

import { pushTaskToServer, removeTaskFromServer } from '$lib/store/sync';

describe('pushTaskToServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllAccounts.mockReturnValue([testAccount]);
    mocks.isConnected.mockReturnValue(true);
  });

  it('does nothing if account is not found', async () => {
    mocks.getAllAccounts.mockReturnValueOnce([]);
    const task = makeTask({ accountId: 'acct-1', calendarId: 'cal-1' });

    await pushTaskToServer(task, queryClient);

    expect(mocks.clientCreateTask).not.toHaveBeenCalled();
    expect(mocks.clientUpdateTask).not.toHaveBeenCalled();
  });

  it('does nothing if calendar is not found in the account', async () => {
    const task = makeTask({ accountId: 'acct-1', calendarId: 'nonexistent' });

    await pushTaskToServer(task, queryClient);

    expect(mocks.clientCreateTask).not.toHaveBeenCalled();
  });

  it('uses createTask for new tasks (no href) and marks synced with href+etag', async () => {
    const task = makeTask({
      id: 'local-1',
      uid: 'new',
      accountId: 'acct-1',
      calendarId: 'cal-1',
      href: undefined,
    });
    mocks.clientCreateTask.mockResolvedValueOnce({ href: '/c/new.ics', etag: 'e1' });

    await pushTaskToServer(task, queryClient);

    expect(mocks.clientCreateTask).toHaveBeenCalledWith(testCalendar, task);
    expect(mocks.localUpdateTask).toHaveBeenCalledWith('local-1', {
      href: '/c/new.ics',
      etag: 'e1',
      synced: true,
    });
  });

  it('uses updateTask for existing tasks (with href) and refreshes etag', async () => {
    const task = makeTask({
      id: 'local-2',
      accountId: 'acct-1',
      calendarId: 'cal-1',
      href: '/c/existing.ics',
      etag: 'old',
    });
    mocks.clientUpdateTask.mockResolvedValueOnce({ etag: 'new' });

    await pushTaskToServer(task, queryClient);

    expect(mocks.clientUpdateTask).toHaveBeenCalledWith(task);
    expect(mocks.localUpdateTask).toHaveBeenCalledWith('local-2', {
      etag: 'new',
      synced: true,
    });
  });

  it('does NOT mark synced when push returns null (server failure)', async () => {
    const task = makeTask({
      id: 'local-3',
      accountId: 'acct-1',
      calendarId: 'cal-1',
      href: undefined,
    });
    mocks.clientCreateTask.mockResolvedValueOnce(null);

    await pushTaskToServer(task, queryClient);

    expect(mocks.localUpdateTask).not.toHaveBeenCalled();
  });

  it('reconnects if not connected before pushing', async () => {
    mocks.isConnected.mockReturnValueOnce(false);
    mocks.clientCreateTask.mockResolvedValueOnce({ href: '/x', etag: 'e' });
    const task = makeTask({ accountId: 'acct-1', calendarId: 'cal-1', href: undefined });

    await pushTaskToServer(task, queryClient);

    expect(mocks.reconnect).toHaveBeenCalledWith(testAccount);
  });
});

describe('removeTaskFromServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllAccounts.mockReturnValue([testAccount]);
    mocks.isConnected.mockReturnValue(true);
  });

  it('returns true immediately for tasks never pushed (no href), nothing to delete', async () => {
    const task = makeTask({ accountId: 'acct-1', calendarId: 'cal-1', href: undefined });

    expect(await removeTaskFromServer(task)).toBe(true);
    expect(mocks.clientDeleteTask).not.toHaveBeenCalled();
  });

  it('returns false if account is not found', async () => {
    mocks.getAllAccounts.mockReturnValueOnce([]);
    const task = makeTask({ accountId: 'acct-1', calendarId: 'cal-1', href: '/c/x.ics' });

    expect(await removeTaskFromServer(task)).toBe(false);
    expect(mocks.clientDeleteTask).not.toHaveBeenCalled();
  });

  it('calls client.deleteTask and forwards its boolean result', async () => {
    const task = makeTask({
      accountId: 'acct-1',
      calendarId: 'cal-1',
      href: '/c/x.ics',
      etag: 'e',
    });
    mocks.clientDeleteTask.mockResolvedValueOnce(true);

    expect(await removeTaskFromServer(task)).toBe(true);
    expect(mocks.clientDeleteTask).toHaveBeenCalledWith(task);
  });

  it('returns false when client.deleteTask returns false (e.g. 412 etag mismatch)', async () => {
    const task = makeTask({ accountId: 'acct-1', calendarId: 'cal-1', href: '/c/x.ics' });
    mocks.clientDeleteTask.mockResolvedValueOnce(false);

    expect(await removeTaskFromServer(task)).toBe(false);
  });

  it('reconnects if not connected', async () => {
    mocks.isConnected.mockReturnValueOnce(false);
    mocks.clientDeleteTask.mockResolvedValueOnce(true);
    const task = makeTask({ accountId: 'acct-1', calendarId: 'cal-1', href: '/c/x.ics' });

    await removeTaskFromServer(task);

    expect(mocks.reconnect).toHaveBeenCalledWith(testAccount);
  });
});
