import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SORT_CONFIG } from '$constants';
import { reorderTaskList, reorderTasks } from '$lib/store/reorder/tasks';
import type { FlattenedTask } from '$types/store/tasks';
import type { Task } from '$types/task/model';
import { flattenTasks } from '$utils/sortable';
import { makeTask } from '../../fixtures';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  addPendingDeletion: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$lib/store', () => ({ dataStore: { load: mocks.load, save: mocks.save } }));
vi.mock('$lib/database', () => ({ db: { addPendingDeletion: mocks.addPendingDeletion } }));

const makeOrderedTask = (id: string, sortOrder: number, overrides: Partial<Task> = {}) =>
  makeTask({
    id,
    uid: `${id}-uid`,
    title: id,
    sortOrder,
    ...overrides,
  });

const flatten = (tasks: Task[]): FlattenedTask[] => {
  const topLevelTasks = tasks.filter((task) => !task.parentUid);
  return flattenTasks(
    [...topLevelTasks].sort((a, b) => a.sortOrder - b.sortOrder),
    (parentUid) => tasks.filter((task) => task.parentUid === parentUid),
    (items) => [...items].sort((a, b) => a.sortOrder - b.sortOrder),
  );
};

describe('reorderTaskList', () => {
  it('lets a task be reordered after nesting and moving it back to root', () => {
    const taskA = makeOrderedTask('a', 100);
    const taskB = makeOrderedTask('b', 200);
    const taskC = makeOrderedTask('c', 300);
    const tasks = [taskA, taskB, taskC];

    const nested = reorderTaskList(
      tasks,
      taskC.id,
      taskC.id,
      flatten(tasks),
      DEFAULT_SORT_CONFIG,
      1,
    );

    expect(nested?.find((task) => task.id === taskC.id)?.parentUid).toBe(taskB.uid);

    const unnested = reorderTaskList(
      nested ?? [],
      taskC.id,
      taskC.id,
      flatten(nested ?? []),
      DEFAULT_SORT_CONFIG,
      0,
    );

    expect(unnested?.find((task) => task.id === taskC.id)?.parentUid).toBeUndefined();

    const movedBelowC = reorderTaskList(
      unnested ?? [],
      taskB.id,
      taskC.id,
      flatten(unnested ?? []),
      DEFAULT_SORT_CONFIG,
      0,
    );

    expect(flatten(movedBelowC ?? []).map((task) => task.id)).toEqual(['a', 'c', 'b']);
  });

  it('clears the old CalDAV address when nesting into another calendar', () => {
    const parent = makeOrderedTask('parent', 100, {
      calendarId: 'destination',
      accountId: 'destination-account',
    });
    const moved = makeOrderedTask('moved', 200, {
      calendarId: 'source',
      accountId: 'source-account',
      href: '/source/moved.ics',
      etag: 'source-etag',
      synced: true,
    });
    const tasks = [parent, moved];

    const reordered = reorderTaskList(
      tasks,
      moved.id,
      moved.id,
      flatten(tasks),
      DEFAULT_SORT_CONFIG,
      1,
    );

    expect(reordered?.find((task) => task.id === moved.id)).toMatchObject({
      calendarId: 'destination',
      accountId: 'destination-account',
      href: undefined,
      etag: undefined,
      synced: false,
    });
  });

  it('queues deletion of the old resource when dragging into another calendar', () => {
    const parent = makeOrderedTask('parent', 100, {
      calendarId: 'destination',
      accountId: 'destination-account',
    });
    const moved = makeOrderedTask('moved', 200, {
      calendarId: 'source',
      accountId: 'source-account',
      href: '/source/moved.ics',
      etag: 'source-etag',
      synced: true,
    });
    const tasks = [parent, moved];
    mocks.load.mockReturnValue({
      tasks,
      pendingDeletions: [],
      ui: { sortConfig: DEFAULT_SORT_CONFIG },
    });

    reorderTasks(moved.id, moved.id, flatten(tasks), 1);

    expect(mocks.addPendingDeletion).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: moved.uid,
        href: '/source/moved.ics',
        accountId: 'source-account',
        calendarId: 'source',
        etag: 'source-etag',
      }),
    );
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingDeletions: [expect.objectContaining({ uid: moved.uid })],
      }),
    );
  });
});
