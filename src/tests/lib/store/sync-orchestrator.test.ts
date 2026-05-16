import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCalendar, makeTask } from '../../fixtures';

/**
 * Tests for `syncCalendarTasks` — the orchestrator that stitches the CalDAV
 * layer to the local store. Verifies the four-step flow:
 *   0. processPendingDeletions (DELETE on server, clear from DB)
 *   1. pushUnsyncedTasks (createTask / updateTask, mark synced)
 *   2. fetchTasks
 *   3. createTask locally for new remote, updateTask for changed, removeLocalTask for gone
 */

// vi.mock factories hoist — set up mock refs via vi.hoisted.
const mocks = vi.hoisted(() => ({
  // CalDAV client (mocked at the class level)
  clientCreateTask: vi.fn(),
  clientUpdateTask: vi.fn(),
  clientDeleteTask: vi.fn(),
  clientFetchTasks: vi.fn(),
  isConnected: vi.fn(() => true),
  reconnect: vi.fn(),

  // Store accessors
  getAllAccounts: vi.fn(),
  getTasksByCalendar: vi.fn(),
  localCreateTask: vi.fn(),
  localUpdateTask: vi.fn(),
  removeLocalTask: vi.fn(),

  // DB / dataStore
  pendingDeletions: [] as Array<{
    uid: string;
    href: string;
    accountId: string;
    calendarId: string;
  }>,
  clearPendingDeletion: vi.fn().mockResolvedValue(undefined),
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
    })),
  },
}));

vi.mock('$lib/store/accounts', () => ({
  getAllAccounts: mocks.getAllAccounts,
  getAccountById: vi.fn(),
}));

vi.mock('$lib/store/tasks', () => ({
  getTasksByCalendar: mocks.getTasksByCalendar,
  createTask: mocks.localCreateTask,
  updateTask: mocks.localUpdateTask,
  removeLocalTask: mocks.removeLocalTask,
}));

vi.mock('$lib/store/calendars', () => ({
  addCalendar: vi.fn(),
  deleteCalendar: vi.fn(),
  updateCalendar: vi.fn(),
}));

vi.mock('$lib/store/tags', () => ({
  createTag: vi.fn(),
  getAllTags: vi.fn(() => []),
  updateTag: vi.fn(),
}));

vi.mock('$lib/store/ui', () => ({
  getUIState: vi.fn(() => ({})),
  setAllTasksView: vi.fn(),
}));

vi.mock('$lib/store', () => ({
  dataStore: {
    load: vi.fn(() => ({ pendingDeletions: mocks.pendingDeletions })),
    save: vi.fn(),
  },
}));

vi.mock('$lib/database', () => ({
  db: {
    clearPendingDeletion: mocks.clearPendingDeletion,
  },
}));

vi.mock('$context/settingsContext', () => ({
  settingsStore: { getState: vi.fn(() => ({})) },
}));

vi.mock('$hooks/ui/useToast', () => ({
  toastManager: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@tauri-apps/api/event', () => ({ emit: vi.fn() }));

vi.mock('$constants/colorSchemes', () => ({
  getColorSchemeColorPresets: vi.fn(() => ['#ef4444']),
}));

vi.mock('$constants/menu', () => ({ MENU_EVENTS: {} }));

vi.mock('$lib/queryClient', () => ({
  queryKeys: {
    tasks: { all: ['tasks'] },
    accounts: { all: ['accounts'] },
    tags: { all: ['tags'] },
  },
}));

vi.mock('$lib/tauri-http', () => ({ getErrorMessage: (e: unknown) => String(e) }));

vi.mock('$utils/color', () => ({
  generateTagColor: vi.fn(() => '#000'),
  resolveEffectiveTheme: vi.fn(() => 'light'),
}));

// Import AFTER mocks are set up.
import { syncCalendarTasks } from '$lib/store/sync';

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
};

const queryClient = { invalidateQueries: vi.fn() } as unknown as Parameters<
  typeof syncCalendarTasks
>[1];

const noopSetSyncing = () => {};

describe('syncCalendarTasks orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pendingDeletions = [];
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

  it('step 0: clears pending deletion even if the server DELETE fails', async () => {
    // Critical: if we kept retrying a deletion that the server can't process
    // (e.g. already deleted, 404), we'd loop forever. Always clear.
    mocks.pendingDeletions = [
      { uid: 'doomed', href: '/c/x.ics', accountId: 'acct-1', calendarId: 'cal-1' },
    ];
    mocks.clientDeleteTask.mockRejectedValueOnce(new Error('server unreachable'));
    mocks.getTasksByCalendar.mockReturnValue([]);
    mocks.clientFetchTasks.mockResolvedValueOnce([]);

    await syncCalendarTasks('cal-1', queryClient, noopSetSyncing);

    expect(mocks.clearPendingDeletion).toHaveBeenCalledWith('doomed');
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
    // Critical: a server fetch failure must NOT cause us to think the calendar
    // is empty and locally delete every synced task.
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

    expect(mocks.localCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'remote-only' }),
    );
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

    expect(mocks.localUpdateTask).toHaveBeenCalledWith(
      'local-x',
      expect.objectContaining({ id: 'local-x', synced: true, title: 'Modified' }),
    );
  });

  it('step 3: preserves local changes when push failed (local stays unsynced)', async () => {
    // Scenario: user has local pending edits (synced=false, has href). Step 1
    // attempts the push but the server rejects it (returns null). Step 3 then
    // sees a remote task with a different etag. The orchestrator MUST NOT
    // overwrite the unsynced local task with the remote version — that would
    // silently lose the user's pending edits.
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
    // Brand-new local task that hasn't synced yet. Server doesn't know about it.
    // Must be preserved, not deleted as "missing remotely".
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

// ---------------------------------------------------------------------------
// pushTaskToServer + removeTaskFromServer — single-task entry points used by
// the UI for optimistic-write flows (create, complete, delete).
// ---------------------------------------------------------------------------

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

  it('returns true immediately for tasks never pushed (no href) — nothing to delete', async () => {
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
