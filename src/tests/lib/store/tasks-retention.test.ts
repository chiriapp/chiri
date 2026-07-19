import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '$types';
import { makeTask } from '../../fixtures';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    deleteExpiredRecentlyDeletedTasks: vi.fn(() => Promise.resolve(0)),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

vi.mock('$lib/database', () => ({
  db: mockDb,
}));

vi.mock('$context/settingsContext', () => ({
  settingsStore: {
    getState: vi.fn(() => ({
      autoEmptyRecentlyDeleted: true,
      recentlyDeletedRetentionDays: 30,
    })),
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

import { dataStore, defaultDataStore, defaultUIState } from '$lib/store';
import { deleteExpiredRecentlyDeletedTasks } from '$lib/store/tasks';

const seedStore = (tasks: Task[], selectedTaskId: string | null = null) => {
  dataStore.save({
    ...defaultDataStore,
    tasks,
    ui: { ...defaultUIState, selectedTaskId },
  });
};

describe('deleteExpiredRecentlyDeletedTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedStore([]);
  });

  it('removes expired deleted tasks and clears the selected task', () => {
    const now = new Date('2026-05-31T12:00:00.000Z');
    const expired = makeTask({
      id: 'expired',
      uid: 'expired-uid',
      deletedAt: new Date('2026-05-01T12:00:00.000Z'),
    });
    const fresh = makeTask({
      id: 'fresh',
      uid: 'fresh-uid',
      deletedAt: new Date('2026-05-20T12:00:00.000Z'),
    });

    seedStore([expired, fresh], expired.id);

    expect(deleteExpiredRecentlyDeletedTasks(now)).toBe(1);
    expect(mockDb.deleteExpiredRecentlyDeletedTasks).toHaveBeenCalledWith(now, 30);
    expect(dataStore.load().tasks.map((task) => task.id)).toEqual(['fresh']);
    expect(dataStore.load().ui.selectedTaskId).toBeNull();
  });

  it('preserves children that have not expired yet', () => {
    const now = new Date('2026-05-31T12:00:00.000Z');
    const parent = makeTask({
      id: 'parent',
      uid: 'parent-uid',
      deletedAt: new Date('2026-05-01T12:00:00.000Z'),
    });
    const child = makeTask({
      id: 'child',
      uid: 'child-uid',
      parentUid: parent.uid,
      deletedAt: new Date('2026-05-20T12:00:00.000Z'),
    });

    seedStore([parent, child]);

    expect(deleteExpiredRecentlyDeletedTasks(now)).toBe(1);
    expect(dataStore.load().tasks).toMatchObject([{ id: 'child', parentUid: undefined }]);
  });

  it('does nothing when no deleted tasks are expired', () => {
    const now = new Date('2026-05-31T12:00:00.000Z');
    const task = makeTask({
      id: 'fresh',
      uid: 'fresh-uid',
      deletedAt: new Date('2026-05-20T12:00:00.000Z'),
    });

    seedStore([task]);

    expect(deleteExpiredRecentlyDeletedTasks(now)).toBe(0);
    expect(mockDb.deleteExpiredRecentlyDeletedTasks).not.toHaveBeenCalled();
    expect(dataStore.load().tasks).toEqual([task]);
  });
});
