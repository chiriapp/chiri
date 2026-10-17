import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Filter } from '$types/filter';
import type { SettingsState } from '$types/settings/state';
import type { PendingDeletion } from '$types/store/sync';
import type { Task } from '$types/task/model';
import { makeTask } from '../../fixtures';

// vi.mock factories are hoisted; pre-create the mock fn refs via vi.hoisted
// so they're initialized before the mock factories run
const {
  mockAddPendingDeletion,
  mockAddPendingDeletions,
  mockCreateTasks,
  mockUpdateTask,
  mockUpsertTasks,
  mockGetSettingsState,
  mockSettingsState,
} = vi.hoisted(() => {
  const mockSettingsState: Partial<SettingsState> = {
    defaultCalendarId: null,
    defaultPriority: 'none',
    defaultStatus: 'needs-action',
    defaultPercentComplete: 0,
    defaultTags: [],
    defaultStartDate: 'none',
    defaultStartTime: null,
    defaultDueDate: 'none',
    defaultDueTime: null,
    defaultReminders: [],
    defaultRrule: undefined,
    defaultRepeatFrom: 0,
    defaultAllDayReminderHour: 9,
    allDayReminderNotificationsEnabled: true,
  };

  return {
    mockAddPendingDeletion: vi.fn().mockResolvedValue(undefined),
    mockAddPendingDeletions: vi.fn().mockResolvedValue(undefined),
    mockCreateTasks: vi.fn().mockResolvedValue(undefined),
    mockUpdateTask: vi.fn().mockResolvedValue(undefined),
    mockUpsertTasks: vi.fn().mockResolvedValue(undefined),
    mockGetSettingsState: vi.fn(() => mockSettingsState),
    mockSettingsState,
  };
});

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

vi.mock('$lib/database', () => ({
  db: {
    addPendingDeletion: mockAddPendingDeletion,
    addPendingDeletions: mockAddPendingDeletions,
    createTasks: mockCreateTasks,
    updateTask: mockUpdateTask,
    upsertTasks: mockUpsertTasks,
    subscribe: vi.fn(() => vi.fn()),
  },
}));

// settingsStore.getState() is called by task helpers. minimal defaults
vi.mock('$context/settingsContext', () => ({
  settingsStore: {
    getState: mockGetSettingsState,
  },
}));

vi.mock('$lib/toastManager', () => ({
  toastManager: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('$lib/ical/vtodo', () => ({
  toAppleEpoch: vi.fn((ms: number) => ms),
}));

vi.mock('$lib/task/recurrence', () => ({
  getNextOccurrence: vi.fn(),
  parseRRule: vi.fn(() => ({})),
}));

import { dataStore, defaultDataStore, defaultUIState } from '$lib/store';
import { addReminder, removeReminder, updateReminder } from '$lib/store/reminders';
import {
  addTagToTask,
  createTask,
  createTasks,
  removeTagFromTask,
  replaceTasksFromSync,
  updateTask,
  updateTasks,
} from '$lib/store/tasks';

afterEach(() => {
  vi.restoreAllMocks();
});

const seedStore = (tasks: Task[], pendingDeletions: PendingDeletion[] = []) => {
  dataStore.save({
    ...defaultDataStore,
    tasks,
    pendingDeletions,
    ui: defaultUIState,
  });
};

describe('createTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettingsState.mockReturnValue(mockSettingsState);
    seedStore([]);
  });

  it('persists and publishes a bulk task creation once', async () => {
    vi.spyOn(dataStore, 'getIsInitialized').mockReturnValue(true);
    const listener = vi.fn();
    const unsubscribe = dataStore.subscribe(listener);
    const taskData = [
      makeTask({ id: 'remote-1', uid: 'uid-1', sortOrder: 10, synced: true }),
      makeTask({ id: 'remote-2', uid: 'uid-2', sortOrder: 20, synced: true }),
    ];

    const createdTasks = await createTasks(taskData, { source: 'remote' });

    expect(createdTasks.map((task) => task.uid)).toEqual(['uid-1', 'uid-2']);
    expect(dataStore.load().tasks).toHaveLength(2);
    expect(mockCreateTasks).toHaveBeenCalledTimes(1);
    expect(mockCreateTasks).toHaveBeenCalledWith(createdTasks, { notify: false });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('does not publish tasks when bulk persistence fails', async () => {
    vi.spyOn(dataStore, 'getIsInitialized').mockReturnValue(true);
    mockCreateTasks.mockRejectedValueOnce(new Error('duplicate uid'));
    const listener = vi.fn();
    const unsubscribe = dataStore.subscribe(listener);

    await expect(
      createTasks([makeTask({ id: 'remote-1', uid: 'uid-1' })], { source: 'remote' }),
    ).rejects.toThrow('duplicate uid');

    expect(dataStore.load().tasks).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('preserves an edit made while bulk task creation is in flight', async () => {
    vi.spyOn(dataStore, 'getIsInitialized').mockReturnValue(true);
    const existingTask = makeTask({ id: 'existing', uid: 'existing-uid', title: 'Original title' });
    seedStore([existingTask]);

    let finishPersistence: (() => void) | undefined;
    mockCreateTasks.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishPersistence = resolve;
        }),
    );

    const creation = createTasks(
      [makeTask({ id: 'remote-1', uid: 'remote-uid-1', title: 'Remote task' })],
      { source: 'remote' },
    );
    await vi.waitFor(() => expect(mockCreateTasks).toHaveBeenCalledTimes(1));
    updateTask(existingTask.id, { title: 'Edited during persistence' });

    finishPersistence?.();
    await creation;

    expect(dataStore.load().tasks).toEqual([
      expect.objectContaining({ id: existingTask.id, title: 'Edited during persistence' }),
      expect.objectContaining({ id: 'remote-1', title: 'Remote task' }),
    ]);
  });
});

describe('replaceTasksFromSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedStore([]);
  });

  it('rebases a remote replacement onto an edit made while persistence is in flight', async () => {
    vi.spyOn(dataStore, 'getIsInitialized').mockReturnValue(true);
    const task = makeTask({
      id: 'task-1',
      uid: 'uid-1',
      title: 'Original title',
      priority: 'none',
      synced: true,
    });
    seedStore([task]);

    let finishPersistence: (() => void) | undefined;
    mockUpsertTasks.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishPersistence = resolve;
        }),
    );

    const replacement = {
      ...task,
      priority: 'high' as const,
      modifiedAt: new Date(task.modifiedAt.getTime() + 1_000),
    };
    const replacementOperation = replaceTasksFromSync([replacement]);
    await vi.waitFor(() => expect(mockUpsertTasks).toHaveBeenCalledTimes(1));
    updateTask(task.id, { title: 'Edited during persistence' });

    finishPersistence?.();
    await replacementOperation;

    expect(dataStore.load().tasks[0]).toEqual(
      expect.objectContaining({ title: 'Edited during persistence', priority: 'high' }),
    );
    expect(mockUpsertTasks).toHaveBeenCalledTimes(2);
    expect(mockUpsertTasks).toHaveBeenLastCalledWith(
      [expect.objectContaining({ title: 'Edited during persistence', priority: 'high' })],
      { notify: false },
    );
  });
});

describe('updateTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedStore([]);
  });

  it('persists and publishes a bulk task update once', async () => {
    vi.spyOn(dataStore, 'getIsInitialized').mockReturnValue(true);
    const tasks = [
      makeTask({ id: 'task-1', uid: 'uid-1', priority: 'none', synced: true }),
      makeTask({ id: 'task-2', uid: 'uid-2', priority: 'low', synced: true }),
    ];
    seedStore(tasks);
    const listener = vi.fn();
    const unsubscribe = dataStore.subscribe(listener);

    const updatedTasks = await updateTasks(
      tasks.map((task) => ({ id: task.id, updates: { priority: 'high' as const } })),
    );

    expect(updatedTasks).toHaveLength(2);
    expect(updatedTasks.every((task) => task.priority === 'high' && !task.synced)).toBe(true);
    expect(mockUpsertTasks).toHaveBeenCalledTimes(1);
    expect(mockUpsertTasks).toHaveBeenCalledWith(updatedTasks, { notify: false });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('batches pending deletions when tasks move between calendars', async () => {
    vi.spyOn(dataStore, 'getIsInitialized').mockReturnValue(true);
    const tasks = [
      makeTask({
        id: 'task-1',
        uid: 'uid-1',
        href: '/personal/task-1.ics',
        calendarId: 'personal',
      }),
      makeTask({
        id: 'task-2',
        uid: 'uid-2',
        href: '/personal/task-2.ics',
        calendarId: 'personal',
      }),
    ];
    seedStore(tasks);

    const updatedTasks = await updateTasks(
      tasks.map((task) => ({ id: task.id, updates: { calendarId: 'work' } })),
    );

    expect(mockAddPendingDeletions).toHaveBeenCalledTimes(1);
    expect(mockAddPendingDeletions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ uid: 'uid-1', href: '/personal/task-1.ics' }),
        expect.objectContaining({ uid: 'uid-2', href: '/personal/task-2.ics' }),
      ]),
      { notify: false },
    );
    expect(updatedTasks.every((task) => !task.href && !task.etag)).toBe(true);
    expect(dataStore.load().pendingDeletions).toHaveLength(2);
  });

  it('preserves an edit made while bulk persistence is in flight', async () => {
    vi.spyOn(dataStore, 'getIsInitialized').mockReturnValue(true);
    const task = makeTask({
      id: 'task-1',
      uid: 'uid-1',
      title: 'Original title',
      priority: 'none',
      synced: true,
    });
    seedStore([task]);

    let finishPersistence: (() => void) | undefined;
    mockUpsertTasks.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishPersistence = resolve;
        }),
    );

    const bulkUpdate = updateTasks([{ id: task.id, updates: { priority: 'high' as const } }]);
    await vi.waitFor(() => expect(mockUpsertTasks).toHaveBeenCalledTimes(1));

    updateTask(task.id, { title: 'Edited during persistence' });
    expect(dataStore.load().tasks[0]?.title).toBe('Edited during persistence');

    finishPersistence?.();
    await bulkUpdate;

    expect(dataStore.load().tasks[0]).toEqual(
      expect.objectContaining({
        title: 'Edited during persistence',
        priority: 'high',
      }),
    );
    expect(mockUpsertTasks).toHaveBeenCalledTimes(2);
    expect(mockUpsertTasks).toHaveBeenLastCalledWith(
      [expect.objectContaining({ title: 'Edited during persistence', priority: 'high' })],
      { notify: false },
    );
  });
});

/**
 * regression coverage for the calendar-move issue. moving a synced task to a
 * different calendar previously silently kept it in the old calendar (or worse,
 * lost it after multiple syncs). CalDAV addresses tasks by URL, so the only
 * way to "move" is delete-from-old + create-in-new
 */
describe('updateTask: calendar move detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettingsState.mockReturnValue(mockSettingsState);
    seedStore([]);
  });

  it('queues a pending deletion and clears href/etag when a synced task is moved to a new calendar', () => {
    const task = makeTask({
      id: 'task-1',
      uid: 'uid-1',
      href: '/caldav/personal/task.ics',
      etag: 'abc123',
      calendarId: 'personal',
      accountId: 'account-1',
      synced: true,
    });
    seedStore([task]);

    const result = updateTask('task-1', { calendarId: 'work' });

    expect(mockAddPendingDeletion).toHaveBeenCalledOnce();
    expect(mockAddPendingDeletion).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'uid-1',
        href: '/caldav/personal/task.ics',
        accountId: 'account-1',
        calendarId: 'personal',
        etag: 'abc123',
        deletedAt: expect.any(Date),
      }),
    );

    expect(result?.href).toBeUndefined();
    expect(result?.etag).toBeUndefined();
    expect(result?.calendarId).toBe('work');
  });

  it('adds the deletion to the in-memory pendingDeletions list', () => {
    const task = makeTask({
      id: 'task-1',
      uid: 'uid-1',
      href: '/caldav/personal/task.ics',
      calendarId: 'personal',
      accountId: 'account-1',
      synced: true,
    });
    seedStore([task]);

    updateTask('task-1', { calendarId: 'work' });

    const { pendingDeletions } = dataStore.load();
    expect(pendingDeletions).toHaveLength(1);
    expect(pendingDeletions[0]).toMatchObject({
      uid: 'uid-1',
      href: '/caldav/personal/task.ics',
      accountId: 'account-1',
      calendarId: 'personal',
    });
  });

  it('does not queue a pending deletion when calendarId is unchanged', () => {
    const task = makeTask({
      id: 'task-1',
      href: '/caldav/personal/task.ics',
      calendarId: 'personal',
    });
    seedStore([task]);

    updateTask('task-1', { calendarId: 'personal', title: 'Updated title' });

    expect(mockAddPendingDeletion).not.toHaveBeenCalled();
    expect(dataStore.load().pendingDeletions).toHaveLength(0);
  });

  it('does not queue a pending deletion when the task has no href (never synced)', () => {
    const task = makeTask({
      id: 'task-1',
      href: undefined,
      etag: undefined,
      calendarId: 'personal',
    });
    seedStore([task]);

    updateTask('task-1', { calendarId: 'work' });

    expect(mockAddPendingDeletion).not.toHaveBeenCalled();
    expect(dataStore.load().pendingDeletions).toHaveLength(0);
  });

  it('does not queue a pending deletion when calendarId is not in updates', () => {
    const task = makeTask({
      id: 'task-1',
      href: '/caldav/personal/task.ics',
      calendarId: 'personal',
    });
    seedStore([task]);

    updateTask('task-1', { title: 'New title' });

    expect(mockAddPendingDeletion).not.toHaveBeenCalled();
    expect(dataStore.load().pendingDeletions).toHaveLength(0);

    // href must remain intact so subsequent syncs still work
    const stored = dataStore.load().tasks.find((t) => t.id === 'task-1');
    expect(stored?.href).toBe('/caldav/personal/task.ics');
  });

  it('preserves existing pending deletions when adding a new one', () => {
    const existing: PendingDeletion = {
      uid: 'other-uid',
      href: '/caldav/work/other.ics',
      accountId: 'account-1',
      calendarId: 'work',
    };
    const task = makeTask({
      id: 'task-1',
      uid: 'uid-1',
      href: '/caldav/personal/task.ics',
      calendarId: 'personal',
    });
    seedStore([task], [existing]);

    updateTask('task-1', { calendarId: 'work' });

    const { pendingDeletions } = dataStore.load();
    expect(pendingDeletions).toHaveLength(2);
    expect(pendingDeletions[0]).toEqual(existing);
    expect(pendingDeletions[1].uid).toBe('uid-1');
  });

  it('captures the OLD calendarId in the pending deletion, not the new one', () => {
    const task = makeTask({
      id: 'task-1',
      uid: 'uid-1',
      calendarId: 'personal',
      accountId: 'my-account',
      href: '/caldav/personal/task.ics',
    });
    seedStore([task]);

    updateTask('task-1', { calendarId: 'archive' });

    const deletion = mockAddPendingDeletion.mock.calls[0][0] as PendingDeletion;
    expect(deletion.calendarId).toBe('personal');
    expect(deletion.accountId).toBe('my-account');
    expect(deletion.href).toBe('/caldav/personal/task.ics');
  });

  it('marks the task as unsynced after a calendar move so next sync pushes it', () => {
    const task = makeTask({
      id: 'task-1',
      href: '/caldav/personal/task.ics',
      synced: true,
    });
    seedStore([task]);

    const result = updateTask('task-1', { calendarId: 'work' });

    expect(result?.synced).toBe(false);
  });

  it('returns undefined when the task id does not exist', () => {
    seedStore([]);

    const result = updateTask('nonexistent-id', { calendarId: 'work' });

    expect(result).toBeUndefined();
    expect(mockAddPendingDeletion).not.toHaveBeenCalled();
  });

  it('moving A → B → A within one tick queues two deletions (one per move)', () => {
    // documents current behavior: a second move (back to original calendar)
    // does NOT queue a deletion because step 1 cleared the href. this means
    // rapid back-and-forth moves can lose intermediate state. relies on the
    // next sync to reconcile
    const task = makeTask({
      id: 'task-1',
      uid: 'uid-1',
      href: '/caldav/personal/task.ics',
      calendarId: 'personal',
    });
    seedStore([task]);

    updateTask('task-1', { calendarId: 'work' });
    updateTask('task-1', { calendarId: 'personal' });

    // only the first move queued a deletion (href was non-null then)
    expect(mockAddPendingDeletion).toHaveBeenCalledOnce();
    const stored = dataStore.load().tasks.find((t) => t.id === 'task-1');
    expect(stored?.href).toBeUndefined();
    expect(stored?.calendarId).toBe('personal');
  });
});

describe('task mutation helpers: persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettingsState.mockReturnValue(mockSettingsState);
    seedStore([]);
  });

  it('persists tag additions through updateTask', () => {
    const task = makeTask({ id: 'task-1', uid: 'uid-1', tags: ['existing'] });
    seedStore([task]);

    const result = addTagToTask('task-1', 'new-tag');

    expect(result?.tags).toEqual(['existing', 'new-tag']);
    expect(mockUpdateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        tags: ['existing', 'new-tag'],
        synced: false,
      }),
    );
  });

  it('persists tag removals through updateTask', () => {
    const task = makeTask({ id: 'task-1', uid: 'uid-1', tags: ['keep', 'remove'] });
    seedStore([task]);

    const result = removeTagFromTask('task-1', 'remove');

    expect(result?.tags).toEqual(['keep']);
    expect(mockUpdateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        tags: ['keep'],
        synced: false,
      }),
    );
  });

  it('persists reminder additions through updateTask', () => {
    const trigger = new Date('2026-06-03T10:00:00.000Z');
    const task = makeTask({ id: 'task-1', uid: 'uid-1', reminders: [] });
    seedStore([task]);

    const result = addReminder('task-1', trigger);

    expect(result?.reminders).toEqual([expect.objectContaining({ trigger })]);
    expect(mockUpdateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        reminders: [expect.objectContaining({ trigger })],
        synced: false,
      }),
    );
  });

  it('persists reminder removals through updateTask', () => {
    const task = makeTask({
      id: 'task-1',
      uid: 'uid-1',
      reminders: [
        { id: 'keep', trigger: new Date('2026-06-03T10:00:00.000Z') },
        { id: 'remove', trigger: new Date('2026-06-03T11:00:00.000Z') },
      ],
    });
    seedStore([task]);

    const result = removeReminder('task-1', 'remove');

    expect(result?.reminders).toEqual([
      { id: 'keep', trigger: new Date('2026-06-03T10:00:00.000Z') },
    ]);
    expect(mockUpdateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        reminders: [{ id: 'keep', trigger: new Date('2026-06-03T10:00:00.000Z') }],
        synced: false,
      }),
    );
  });

  it('persists reminder updates through updateTask', () => {
    const trigger = new Date('2026-06-03T12:00:00.000Z');
    const task = makeTask({
      id: 'task-1',
      uid: 'uid-1',
      reminders: [{ id: 'reminder-1', trigger: new Date('2026-06-03T10:00:00.000Z') }],
    });
    seedStore([task]);

    const result = updateReminder('task-1', 'reminder-1', trigger);

    expect(result?.reminders).toEqual([{ id: 'reminder-1', trigger }]);
    expect(mockUpdateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        reminders: [{ id: 'reminder-1', trigger }],
        synced: false,
      }),
    );
  });
});

describe('createTask: all-day reminder notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettingsState.mockReturnValue({
      ...mockSettingsState,
      defaultDueDate: 'today',
      defaultReminders: ['at-due'],
    });
    seedStore([]);
  });

  it('adds default reminders to all-day tasks when enabled', () => {
    const task = createTask({ title: 'All-day task' });

    expect(task.dueDateAllDay).toBe(true);
    expect(task.reminders).toHaveLength(1);
    expect(task.reminders?.[0].trigger.getHours()).toBe(9);
  });

  it('skips default reminders for all-day tasks when disabled', () => {
    mockGetSettingsState.mockReturnValue({
      ...mockSettingsState,
      defaultDueDate: 'today',
      defaultReminders: ['at-due'],
      allDayReminderNotificationsEnabled: false,
    });

    const task = createTask({ title: 'Quiet all-day task' });

    expect(task.dueDateAllDay).toBe(true);
    expect(task.reminders).toBeUndefined();
  });

  it('still adds default reminders to timed tasks when all-day reminders are disabled', () => {
    mockGetSettingsState.mockReturnValue({
      ...mockSettingsState,
      defaultReminders: ['at-due'],
      allDayReminderNotificationsEnabled: false,
    });
    const dueDate = new Date(2025, 0, 15, 14, 30);

    const task = createTask({
      title: 'Timed task',
      dueDate,
      dueDateAllDay: false,
    });

    expect(task.dueDateAllDay).toBe(false);
    expect(task.reminders).toHaveLength(1);
    expect(task.reminders?.[0].trigger).toEqual(dueDate);
  });
});

describe('createTask: tag source handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedStore([]);
  });

  it('applies the active tag to user-created tasks', () => {
    const activeTag = { id: 'tag-b', name: 'tag-b', color: '#fff', sortOrder: 0 };
    dataStore.save({
      ...defaultDataStore,
      tags: [activeTag],
      ui: { ...defaultUIState, activeTagId: activeTag.id },
    });

    const task = createTask({ title: 'User task' });

    expect(task.tags).toEqual(['tag-b']);
  });

  it('preserves remote tags while a tag view is active', () => {
    dataStore.save({
      ...defaultDataStore,
      ui: { ...defaultUIState, activeTagId: 'tag-b' },
    });

    const task = createTask(
      { title: 'Remote task', tags: ['tag-a'], synced: true },
      { source: 'remote' },
    );

    expect(task.tags).toEqual(['tag-a']);
  });

  it('does not apply active or default tags to an untagged remote task', () => {
    mockGetSettingsState.mockReturnValue({
      ...mockSettingsState,
      defaultTags: ['default-tag'],
    });
    dataStore.save({
      ...defaultDataStore,
      ui: { ...defaultUIState, activeTagId: 'tag-b' },
    });

    const task = createTask({ title: 'Untagged remote task', synced: true }, { source: 'remote' });

    expect(task.tags).toEqual([]);
  });
});

describe('createTask: selected task publication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedStore([]);
  });

  it('publishes the new task and its selection together', () => {
    const previousTask = makeTask({ id: 'previous-task', uid: 'previous-uid' });
    seedStore([previousTask], []);

    let publishedState: { taskIds: string[]; selectedTaskId: string | null } | undefined;
    const unsubscribe = dataStore.subscribe(() => {
      const state = dataStore.load();
      publishedState = {
        taskIds: state.tasks.map((task) => task.id),
        selectedTaskId: state.ui.selectedTaskId,
      };
    });

    const createdTask = createTask({ title: 'New task' }, { selectCreatedTask: true });

    unsubscribe();
    expect(publishedState).toEqual({
      taskIds: ['previous-task', createdTask.id],
      selectedTaskId: createdTask.id,
    });
  });
});

describe('createTask: active filter defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedStore([]);
  });

  it('applies a predefined priority to new tasks in a priority filter', () => {
    const highPriorityFilter: Filter = {
      id: 'filter-high-priority',
      presetId: 'high-priority',
      name: 'High Priority',
      combinator: 'all',
      criteria: [{ field: 'priority', op: 'is', value: 'high' }],
      sortOrder: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dataStore.save({
      ...defaultDataStore,
      filters: [highPriorityFilter],
      ui: { ...defaultUIState, activeView: 'filter', activeFilterId: highPriorityFilter.id },
    });

    expect(createTask({ title: 'Important task' }).priority).toBe('high');
    expect(createTask({ title: 'Explicitly low task', priority: 'low' }).priority).toBe('low');
  });

  it('applies a predefined status to new tasks in the in-progress filter', () => {
    const inProgressFilter: Filter = {
      id: 'filter-in-progress',
      presetId: 'in-progress',
      name: 'In Progress',
      combinator: 'all',
      criteria: [{ field: 'status', op: 'is', value: 'in-process' }],
      sortOrder: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dataStore.save({
      ...defaultDataStore,
      filters: [inProgressFilter],
      ui: { ...defaultUIState, activeView: 'filter', activeFilterId: inProgressFilter.id },
    });

    expect(createTask({ title: 'Started task' })).toMatchObject({
      status: 'in-process',
      completed: false,
      percentComplete: 1,
    });
  });

  it('clears the configured start-date default in the no-start-date filter', () => {
    mockGetSettingsState.mockReturnValue({
      ...mockSettingsState,
      defaultStartDate: 'today',
    });
    const noStartDateFilter: Filter = {
      id: 'filter-no-start-date',
      presetId: 'no-start-date',
      name: 'No Start Date',
      combinator: 'all',
      criteria: [{ field: 'startDate', op: 'empty' }],
      sortOrder: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dataStore.save({
      ...defaultDataStore,
      filters: [noStartDateFilter],
      ui: { ...defaultUIState, activeView: 'filter', activeFilterId: noStartDateFilter.id },
    });

    expect(createTask({ title: 'Unscheduled task' }).startDate).toBeUndefined();
  });
});

describe('createTask: default start/due times', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedStore([]);
  });

  it('applies default due time to the due date', () => {
    mockGetSettingsState.mockReturnValue({
      ...mockSettingsState,
      defaultDueDate: 'today',
      defaultDueTime: 17 * 60,
    });

    const task = createTask({ title: 'Task with due time' });

    expect(task.dueDateAllDay).toBe(false);
    expect(task.dueDate?.getHours()).toBe(17);
    expect(task.dueDate?.getMinutes()).toBe(0);
  });

  it('applies default start time to the start date', () => {
    mockGetSettingsState.mockReturnValue({
      ...mockSettingsState,
      defaultStartDate: 'today',
      defaultStartTime: 9 * 60,
    });

    const task = createTask({ title: 'Task with start time' });

    expect(task.startDateAllDay).toBe(false);
    expect(task.startDate?.getHours()).toBe(9);
    expect(task.startDate?.getMinutes()).toBe(0);
  });
});
