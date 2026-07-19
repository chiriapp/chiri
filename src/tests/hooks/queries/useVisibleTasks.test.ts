import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '$types';
import type { UIState } from '$types/store';
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

vi.mock('$utils/recurrence', () => ({
  getNextOccurrence: vi.fn(),
  parseRRule: vi.fn(() => ({})),
}));

import { getVisibleTasks } from '$hooks/queries/useVisibleTasks';
import { dataStore, defaultDataStore, defaultUIState } from '$lib/store';
import { getFilteredTasks } from '$lib/store/filters';

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
});
