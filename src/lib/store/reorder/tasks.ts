import { dataStore } from '$lib/store';
import { getSortedTasks } from '$lib/store/filters';
import type { Task } from '$types';
import type { FlattenedTask } from '$types/store';

type TaskUpdate = {
  sortOrder: number;
  parentUid: string | undefined;
  calendarId?: string;
  accountId?: string;
};

const findNewParentUid = (
  flattenedItems: FlattenedTask[],
  activeId: string,
  activeIndex: number,
  overIndex: number,
  effectiveIndent: number,
): string | undefined => {
  if (effectiveIndent === 0) return undefined;

  const searchStart =
    activeIndex === overIndex
      ? activeIndex - 1
      : activeIndex < overIndex
        ? overIndex
        : overIndex - 1;

  for (let i = searchStart; i >= 0; i--) {
    const candidate = flattenedItems[i];
    if (candidate.id === activeId) continue;
    if (candidate.depth === effectiveIndent - 1) return candidate.uid;
    if (candidate.depth < effectiveIndent - 1) break;
  }

  // Fallback: find nearest ancestor shallower than the target indent
  const fallbackStart = (activeIndex === overIndex ? activeIndex : overIndex) - 1;
  for (let i = fallbackStart; i >= 0; i--) {
    const candidate = flattenedItems[i];
    if (candidate.id === activeId) continue;
    if (candidate.depth < effectiveIndent) return candidate.uid;
  }

  return undefined;
};

const getDescendantIds = (flattenedItems: FlattenedTask[], activeId: string): Set<string> => {
  const ids = new Set<string>();
  for (const item of flattenedItems) {
    if (item.ancestorIds.includes(activeId)) ids.add(item.id);
  }
  return ids;
};

/**
 * Search backwards from a starting index to find the insert position among siblings
 */
const searchForInsertPosition = (
  flattenedItems: FlattenedTask[],
  startIndex: number,
  activeId: string,
  newParentUid: string | undefined,
  sortedSiblings: Task[],
  descendantIds: Set<string>,
  isMovingDown: boolean,
): number => {
  for (let i = startIndex; i >= 0; i--) {
    const item = flattenedItems[i];
    if (item.id === activeId || descendantIds.has(item.id)) continue;

    if (item.parentUid === newParentUid) {
      const siblingIndex = sortedSiblings.findIndex((s) => s.id === item.id);
      if (siblingIndex !== -1) {
        return isMovingDown ? siblingIndex + 1 : siblingIndex;
      }
    } else if (item.uid === newParentUid) {
      return 0; // insert at beginning of parent's children
    }
  }
  return 0;
};

const findInsertIndex = (
  flattenedItems: FlattenedTask[],
  activeId: string,
  activeIndex: number,
  overIndex: number,
  newParentUid: string | undefined,
  sortedSiblings: Task[],
  descendantIds: Set<string>,
  activeItem: FlattenedTask,
  isReindent: boolean,
): number => {
  const isMovingDown = activeIndex < overIndex;

  // For re-indent without moving (parent changed), search from overIndex - 1
  const shouldUseReindentSearch = isReindent && activeItem.parentUid !== newParentUid;
  const searchStart = shouldUseReindentSearch ? overIndex - 1 : overIndex;
  const effectiveIsMovingDown = shouldUseReindentSearch ? true : isMovingDown;

  return searchForInsertPosition(
    flattenedItems,
    searchStart,
    activeId,
    newParentUid,
    sortedSiblings,
    descendantIds,
    effectiveIsMovingDown,
  );
};

const getCalendarInheritance = (
  tasks: Task[],
  newParentUid: string | undefined,
  activeTask: Task,
): { calendarId?: string; accountId?: string } => {
  if (!newParentUid || newParentUid === activeTask.parentUid) return {};
  const parentTask = tasks.find((t) => t.uid === newParentUid);
  if (!parentTask || parentTask.calendarId === activeTask.calendarId) return {};
  return { calendarId: parentTask.calendarId, accountId: parentTask.accountId };
};

const getAllDescendantIds = (tasks: Task[], parentUid: string): string[] => {
  const children = tasks.filter((t) => t.parentUid === parentUid);
  return children.flatMap((c) => [c.id, ...getAllDescendantIds(tasks, c.uid)]);
};

const buildSortOrderUpdates = (
  tasks: Task[],
  newOrder: Task[],
  activeId: string,
  activeTaskUid: string,
  newParentUid: string | undefined,
  inheritance: { calendarId?: string; accountId?: string },
): Map<string, TaskUpdate> => {
  const updates = new Map<string, TaskUpdate>();

  for (const [index, task] of newOrder.entries()) {
    updates.set(task.id, {
      sortOrder: (index + 1) * 100,
      parentUid: task.id === activeId ? newParentUid : task.parentUid,
      ...(task.id === activeId ? inheritance : {}),
    });
  }

  if (inheritance.calendarId) {
    for (const id of getAllDescendantIds(tasks, activeTaskUid)) {
      const existing = updates.get(id);
      if (existing) {
        existing.calendarId = inheritance.calendarId;
        existing.accountId = inheritance.accountId;
      } else {
        const task = tasks.find((t) => t.id === id);
        if (task) {
          updates.set(id, { sortOrder: task.sortOrder, parentUid: task.parentUid, ...inheritance });
        }
      }
    }
  }

  return updates;
};

const applyUpdates = (tasks: Task[], updates: Map<string, TaskUpdate>): Task[] => {
  return tasks.map((task) => {
    const update = updates.get(task.id);
    if (!update) return task;
    return {
      ...task,
      sortOrder: update.sortOrder,
      parentUid: update.parentUid,
      ...(update.calendarId && { calendarId: update.calendarId }),
      ...(update.accountId && { accountId: update.accountId }),
      synced: false,
      modifiedAt: new Date(),
    };
  });
};

export const reorderTasks = (
  activeId: string,
  overId: string,
  flattenedItems: FlattenedTask[],
  targetIndent?: number,
) => {
  const data = dataStore.load();
  const tasks = data.tasks;
  const activeTask = tasks.find((t) => t.id === activeId);
  const overTask = tasks.find((t) => t.id === overId);

  if (!activeTask || !overTask) return;

  const activeIndex = flattenedItems.findIndex((t) => t.id === activeId);
  const overIndex = flattenedItems.findIndex((t) => t.id === overId);

  if (activeIndex === -1 || overIndex === -1) return;

  const overItem = flattenedItems[overIndex];
  const activeItem = flattenedItems[activeIndex];

  if (overItem.ancestorIds.includes(activeId)) return;

  const effectiveIndent = targetIndent ?? overItem.depth;
  const newParentUid = findNewParentUid(
    flattenedItems,
    activeId,
    activeIndex,
    overIndex,
    effectiveIndent,
  );
  const descendantIds = getDescendantIds(flattenedItems, activeId);

  const siblings = tasks.filter(
    (t) => t.parentUid === newParentUid && t.id !== activeId && !descendantIds.has(t.id),
  );
  const sortedSiblings = getSortedTasks(siblings, data.ui.sortConfig);

  const insertIndex = findInsertIndex(
    flattenedItems,
    activeId,
    activeIndex,
    overIndex,
    newParentUid,
    sortedSiblings,
    descendantIds,
    activeItem,
    activeId === overId,
  );

  const newOrder = [...sortedSiblings];
  newOrder.splice(Math.min(insertIndex, newOrder.length), 0, activeTask);

  const inheritance = getCalendarInheritance(tasks, newParentUid, activeTask);
  const updates = buildSortOrderUpdates(
    tasks,
    newOrder,
    activeId,
    activeTask.uid,
    newParentUid,
    inheritance,
  );

  dataStore.save({ ...data, tasks: applyUpdates(tasks, updates) });
};
