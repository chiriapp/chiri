import type { Task } from '$types';
import type { FlattenedTask } from '$types/store';

/**
 * flatten a tree of tasks into a single array suitable for dnd-kit SortableContext
 * each task gets an `ancestorIds` array to track its position in the hierarchy
 */
export const flattenTasks = (
  tasks: Task[],
  getChildTasks: (parentUid: string) => Task[],
  getSortedTasks: (tasks: Task[]) => Task[],
  ancestorIds: string[] = [],
) => {
  const result: FlattenedTask[] = [];

  for (const task of tasks) {
    // add the current task with its ancestor info
    const flattenedTask: FlattenedTask = {
      ...task,
      ancestorIds,
      depth: ancestorIds.length,
    };
    result.push(flattenedTask);

    // if task has children and is not collapsed, recursively add them
    if (!task.isCollapsed) {
      const children = getChildTasks(task.uid);
      if (children.length > 0) {
        const sortedChildren = getSortedTasks(children);
        const childAncestorIds = [...ancestorIds, task.id];
        const flattenedChildren = flattenTasks(
          sortedChildren,
          getChildTasks,
          getSortedTasks,
          childAncestorIds,
        );
        result.push(...flattenedChildren);
      }
    }
  }

  return result;
};
