import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UIState } from '$types/store/state';
import type { Task } from '$types/task/model';
import { makeTask } from '../../fixtures';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    subscribe: vi.fn(() => vi.fn()),
  },
}));

vi.mock('$lib/database', () => ({
  db: mockDb,
}));

vi.mock('$context/settingsContext', () => ({
  settingsStore: {
    getState: vi.fn(() => ({})),
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

import { getVisibleTaskGroups, getVisibleTasks } from '$hooks/queries/useVisibleTasks';
import { dataStore, defaultDataStore, defaultUIState } from '$lib/store';
import { getFilteredTasks } from '$lib/store/tasks';

const seedStore = (tasks: Task[], activeView: UIState['activeView']) => {
  dataStore.save({
    ...defaultDataStore,
    tasks,
    ui: { ...defaultUIState, activeView },
  });
};

const getVisibleIds = (activeView: UIState['activeView']) =>
  getVisibleTasks({
    activeView,
    filteredTasks: getFilteredTasks(),
    showCompletedTasks: true,
    moveCompletedTasksToBottom: false,
    sortConfig: defaultUIState.sortConfig,
  }).map((task) => ({ id: task.id, depth: task.depth }));

describe('getVisibleTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedStore([], 'tasks');
  });

  it('promotes a deleted subtask when its active parent is hidden from Recently Deleted', () => {
    const parent = makeTask({ id: 'parent', uid: 'parent-uid', sortOrder: 100 });
    const child = makeTask({
      id: 'child',
      uid: 'child-uid',
      parentUid: parent.uid,
      deletedAt: new Date('2025-02-01T00:00:00.000Z'),
      sortOrder: 200,
    });
    seedStore([parent, child], 'recently-deleted');

    expect(getVisibleIds('recently-deleted')).toEqual([{ id: 'child', depth: 0 }]);
  });

  it('indexes child-title search matches without rescanning the task array per task', () => {
    const parent = makeTask({ id: 'parent', uid: 'parent-uid', title: 'Project' });
    const matchingChild = makeTask({
      id: 'matching-child',
      uid: 'matching-child-uid',
      parentUid: parent.uid,
      title: 'Needle task',
    });
    const unrelated = Array.from({ length: 100 }, (_, index) =>
      makeTask({ id: `other-${index}`, uid: `other-uid-${index}`, title: `Other ${index}` }),
    );
    const tasks = [parent, matchingChild, ...unrelated];
    seedStore(tasks, 'tasks');
    dataStore.save({
      ...dataStore.load(),
      ui: { ...dataStore.load().ui, searchQuery: 'needle' },
    });
    const taskArrayFilter = vi.spyOn(tasks, 'filter');

    const filteredTasks = getFilteredTasks();

    expect(filteredTasks.map((task) => task.id)).toEqual(['parent', 'matching-child']);
    expect(taskArrayFilter).toHaveBeenCalledOnce();
  });

  it('keeps deleted subtasks nested when their deleted parent is visible', () => {
    const deletedAt = new Date('2025-02-01T00:00:00.000Z');
    const parent = makeTask({ id: 'parent', uid: 'parent-uid', deletedAt, sortOrder: 100 });
    const child = makeTask({
      id: 'child',
      uid: 'child-uid',
      parentUid: parent.uid,
      deletedAt,
      sortOrder: 200,
    });
    seedStore([parent, child], 'recently-deleted');

    expect(getVisibleIds('recently-deleted')).toEqual([
      { id: 'parent', depth: 0 },
      { id: 'child', depth: 1 },
    ]);
  });

  it('promotes a restored subtask when its parent is still deleted', () => {
    const parent = makeTask({
      id: 'parent',
      uid: 'parent-uid',
      deletedAt: new Date('2025-02-01T00:00:00.000Z'),
      sortOrder: 100,
    });
    const child = makeTask({
      id: 'child',
      uid: 'child-uid',
      parentUid: parent.uid,
      sortOrder: 200,
    });
    seedStore([parent, child], 'tasks');

    expect(getVisibleIds('tasks')).toEqual([{ id: 'child', depth: 0 }]);
  });

  it('moves completed and cancelled tasks to the bottom while preserving their sort order', () => {
    const completed = makeTask({
      id: 'completed',
      uid: 'completed-uid',
      status: 'completed',
      completed: true,
      sortOrder: 100,
    });
    const active = makeTask({ id: 'active', uid: 'active-uid', sortOrder: 200 });
    const cancelled = makeTask({
      id: 'cancelled',
      uid: 'cancelled-uid',
      status: 'cancelled',
      sortOrder: 300,
    });
    seedStore([completed, active, cancelled], 'tasks');

    const visibleTasks = getVisibleTasks({
      activeView: 'tasks',
      filteredTasks: getFilteredTasks(),
      showCompletedTasks: true,
      moveCompletedTasksToBottom: true,
      sortConfig: defaultUIState.sortConfig,
    });

    expect(visibleTasks.map((task) => task.id)).toEqual(['active', 'completed', 'cancelled']);
  });

  it('groups root task trees without separating subtasks', () => {
    const parent = makeTask({
      id: 'parent',
      uid: 'parent-uid',
      status: 'needs-action',
      sortOrder: 100,
    });
    const completedChild = makeTask({
      id: 'completed-child',
      uid: 'completed-child-uid',
      parentUid: parent.uid,
      status: 'completed',
      completed: true,
      sortOrder: 100,
    });
    const inProgress = makeTask({
      id: 'in-progress',
      uid: 'in-progress-uid',
      status: 'in-process',
      sortOrder: 200,
    });
    seedStore([parent, completedChild, inProgress], 'tasks');

    const groups = getVisibleTaskGroups({
      activeView: 'tasks',
      filteredTasks: getFilteredTasks(),
      showCompletedTasks: true,
      moveCompletedTasksToBottom: false,
      sortConfig: defaultUIState.sortConfig,
      taskGroupConfig: { mode: 'status', direction: 'asc' },
    });

    expect(
      groups.map((group) => ({ label: group.label, taskIds: group.tasks.map((task) => task.id) })),
    ).toEqual([
      { label: 'Needs Action', taskIds: ['parent', 'completed-child'] },
      { label: 'In Process', taskIds: ['in-progress'] },
    ]);
    expect(groups[0]?.tasks[1]?.depth).toBe(1);
  });

  it('uses logical due-date group ordering', () => {
    const overdue = makeTask({
      id: 'overdue',
      dueDate: new Date('2020-01-01T00:00:00.000Z'),
      sortOrder: 100,
    });
    const noDueDate = makeTask({ id: 'no-due-date', dueDate: undefined, sortOrder: 200 });
    seedStore([noDueDate, overdue], 'tasks');

    const groups = getVisibleTaskGroups({
      activeView: 'tasks',
      filteredTasks: getFilteredTasks(),
      showCompletedTasks: true,
      moveCompletedTasksToBottom: false,
      sortConfig: defaultUIState.sortConfig,
      taskGroupConfig: { mode: 'due-date', direction: 'asc' },
    });

    expect(groups.map((group) => group.label)).toEqual(['Overdue', 'No Due Date']);
  });

  it('puts completed root trees in a default-collapsed final section when grouped', () => {
    const active = makeTask({ id: 'active', uid: 'active-uid', sortOrder: 100 });
    const completed = makeTask({
      id: 'completed',
      uid: 'completed-uid',
      status: 'completed',
      completed: true,
      sortOrder: 200,
    });
    seedStore([completed, active], 'tasks');

    const groups = getVisibleTaskGroups({
      activeView: 'tasks',
      filteredTasks: getFilteredTasks(),
      showCompletedTasks: true,
      moveCompletedTasksToBottom: true,
      sortConfig: defaultUIState.sortConfig,
      taskGroupConfig: { mode: 'priority', direction: 'asc' },
    });

    expect(groups.map((group) => group.label)).toEqual(['No Priority', 'Completed']);
    expect(groups[1]).toMatchObject({
      defaultCollapsed: true,
      label: 'Completed',
      tasks: [{ id: 'completed' }],
    });
  });

  it('reverses ordinary group order while keeping the completed section last', () => {
    const high = makeTask({ id: 'high', uid: 'high-uid', priority: 'high', sortOrder: 100 });
    const low = makeTask({ id: 'low', uid: 'low-uid', priority: 'low', sortOrder: 200 });
    const completed = makeTask({
      id: 'completed',
      uid: 'completed-uid',
      status: 'completed',
      completed: true,
      sortOrder: 300,
    });
    const cancelled = makeTask({
      id: 'cancelled',
      uid: 'cancelled-uid',
      status: 'cancelled',
      sortOrder: 400,
    });
    seedStore([high, low, completed, cancelled], 'tasks');

    const groups = getVisibleTaskGroups({
      activeView: 'tasks',
      filteredTasks: getFilteredTasks(),
      showCompletedTasks: true,
      moveCompletedTasksToBottom: true,
      sortConfig: defaultUIState.sortConfig,
      taskGroupConfig: { mode: 'priority', direction: 'desc' },
    });

    expect(groups.map((group) => group.label)).toEqual([
      'Low Priority',
      'High Priority',
      'Completed & Cancelled',
    ]);
  });
});
