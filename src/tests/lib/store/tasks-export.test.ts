import { describe, expect, it, vi } from 'vitest';
import { dataStore } from '$lib/store';
import { exportTaskAndChildren, getAllDescendants } from '$lib/store/tasks';
import type { Task } from '$types';
import type { DataStore, UIState } from '$types/store';
import { makeTask } from '../../fixtures';

vi.mock('$lib/store', () => ({
  dataStore: { load: vi.fn(), save: vi.fn() },
}));

const mockTasks = (tasks: Task[]) => {
  vi.mocked(dataStore.load).mockReturnValue({
    tasks,
    tags: [],
    filters: [],
    accounts: [],
    pendingDeletions: [],
    ui: {} as UIState,
  } as DataStore);
};

describe('getAllDescendants', () => {
  it('returns all descendants by default', () => {
    const parent = makeTask({ id: 'parent', uid: 'parent-uid' });
    const child = makeTask({ id: 'child', uid: 'child-uid', parentUid: parent.uid });
    const grandchild = makeTask({ id: 'grandchild', uid: 'grandchild-uid', parentUid: child.uid });
    mockTasks([parent, child, grandchild]);

    const result = getAllDescendants(parent.uid);

    expect(result).toEqual([child, grandchild]);
  });

  it('excludes deleted descendants when filter is active', () => {
    const parent = makeTask({ id: 'parent', uid: 'parent-uid' });
    const activeChild = makeTask({
      id: 'active-child',
      uid: 'active-child-uid',
      parentUid: parent.uid,
    });
    const deletedChild = makeTask({
      id: 'deleted-child',
      uid: 'deleted-child-uid',
      parentUid: parent.uid,
      deletedAt: new Date('2025-07-01T00:00:00.000Z'),
    });
    mockTasks([parent, activeChild, deletedChild]);

    const result = getAllDescendants(parent.uid, 'active');

    expect(result).toEqual([activeChild]);
  });

  it('returns only deleted descendants when filter is deleted', () => {
    const parent = makeTask({ id: 'parent', uid: 'parent-uid' });
    const activeChild = makeTask({
      id: 'active-child',
      uid: 'active-child-uid',
      parentUid: parent.uid,
    });
    const deletedChild = makeTask({
      id: 'deleted-child',
      uid: 'deleted-child-uid',
      parentUid: parent.uid,
      deletedAt: new Date('2025-07-01T00:00:00.000Z'),
    });
    mockTasks([parent, activeChild, deletedChild]);

    const result = getAllDescendants(parent.uid, 'deleted');

    expect(result).toEqual([deletedChild]);
  });

  it('skips deleted branches when filter is active', () => {
    const parent = makeTask({ id: 'parent', uid: 'parent-uid' });
    const deletedChild = makeTask({
      id: 'deleted-child',
      uid: 'deleted-child-uid',
      parentUid: parent.uid,
      deletedAt: new Date('2025-07-01T00:00:00.000Z'),
    });
    const grandchild = makeTask({
      id: 'grandchild',
      uid: 'grandchild-uid',
      parentUid: deletedChild.uid,
    });
    mockTasks([parent, deletedChild, grandchild]);

    const result = getAllDescendants(parent.uid, 'active');

    expect(result).toEqual([]);
  });
});

describe('exportTaskAndChildren', () => {
  it('returns the task and active descendants', () => {
    const parent = makeTask({ id: 'parent', uid: 'parent-uid' });
    const activeChild = makeTask({
      id: 'active-child',
      uid: 'active-child-uid',
      parentUid: parent.uid,
    });
    const deletedChild = makeTask({
      id: 'deleted-child',
      uid: 'deleted-child-uid',
      parentUid: parent.uid,
      deletedAt: new Date('2025-07-01T00:00:00.000Z'),
    });
    mockTasks([parent, activeChild, deletedChild]);

    const result = exportTaskAndChildren(parent.id);

    expect(result).not.toBeNull();
    expect(result!.task).toEqual(parent);
    expect(result!.descendants).toEqual([activeChild]);
  });

  it('returns null when the task does not exist', () => {
    mockTasks([]);

    const result = exportTaskAndChildren('missing');

    expect(result).toBeNull();
  });
});
