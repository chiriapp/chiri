import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SORT_CONFIG } from '$constants';
import { reorderTaskList } from '$lib/store/reorder/tasks';
import type { Task } from '$types';
import type { FlattenedTask } from '$types/store';
import { flattenTasks } from '$utils/sortable';
import { makeTask } from '../../fixtures';

vi.mock('$lib/store', () => ({
  dataStore: { load: vi.fn(), save: vi.fn() },
}));

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
});
