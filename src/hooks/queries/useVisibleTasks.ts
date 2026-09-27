import { useMemo } from 'react';
import { DEFAULT_SORT_CONFIG, DEFAULT_TASK_GROUP_CONFIG } from '$constants';
import { useFilteredTasks } from '$hooks/queries/useTasks';
import { useUIState } from '$hooks/queries/useUIState';
import { dataStore } from '$lib/store';
import { getEffectiveTaskGroupConfig, groupTasks, type TaskGroup } from '$lib/task/grouping';
import { sortTasks } from '$lib/task/sorting';
import type { SortConfig, TaskGroupConfig } from '$types/sort';
import type { UIState } from '$types/store/state';
import type { FlattenedTask } from '$types/store/tasks';
import type { Task } from '$types/task/model';
import { flattenTasks } from '$utils/sortable';

interface VisibleTasksOptions {
  activeView: UIState['activeView'];
  filteredTasks: Task[];
  showCompletedTasks: boolean;
  moveCompletedTasksToBottom: boolean;
  sortConfig: SortConfig;
  taskGroupConfig?: TaskGroupConfig;
  activeCalendarId?: string | null;
  calendarNames?: ReadonlyMap<string, string>;
}

export type VisibleTaskGroup = TaskGroup<FlattenedTask>;

export const getVisibleTaskGroups = ({
  activeView,
  filteredTasks,
  showCompletedTasks,
  moveCompletedTasksToBottom,
  sortConfig,
  taskGroupConfig = DEFAULT_TASK_GROUP_CONFIG,
  activeCalendarId,
  calendarNames,
}: VisibleTasksOptions) => {
  const visibleTaskUids = new Set(filteredTasks.map((task) => task.uid));
  const topLevelTasks = filteredTasks.filter(
    (task) => !task.parentUid || !visibleTaskUids.has(task.parentUid),
  );
  const sortedTopLevel = sortTasks(topLevelTasks, sortConfig, moveCompletedTasksToBottom);

  // build a children index once (O(n)) instead of scanning the whole task array
  // via getChildTasks for every top-level task (O(n^2)) on each render
  const childFilter = activeView === 'recently-deleted' ? 'deleted' : 'active';
  const childrenByParent = new Map<string, Task[]>();
  for (const task of dataStore.load().tasks) {
    if (!task.parentUid) continue;
    if (
      childFilter === 'active'
        ? !!task.deletedAt
        : childFilter === 'deleted'
          ? !task.deletedAt
          : false
    ) {
      continue;
    }
    const children = childrenByParent.get(task.parentUid);
    if (children) {
      children.push(task);
    } else {
      childrenByParent.set(task.parentUid, [task]);
    }
  }

  const getFilteredChildTasks = (parentUid: string) => {
    const children = childrenByParent.get(parentUid) ?? [];
    if (!showCompletedTasks) {
      return children.filter((task) => task.status !== 'completed' && task.status !== 'cancelled');
    }
    return children;
  };

  const effectiveTaskGroupConfig = getEffectiveTaskGroupConfig(taskGroupConfig, activeCalendarId);

  return groupTasks(
    sortedTopLevel,
    effectiveTaskGroupConfig.mode,
    calendarNames,
    moveCompletedTasksToBottom,
    effectiveTaskGroupConfig.direction,
  ).map((group) => ({
    ...group,
    tasks: flattenTasks(group.tasks, getFilteredChildTasks, (tasks) =>
      sortTasks(tasks, sortConfig, moveCompletedTasksToBottom),
    ),
  }));
};

export const getVisibleTasks = (options: VisibleTasksOptions) => {
  return getVisibleTaskGroups(options).flatMap((group) => group.tasks);
};

const getCalendarNames = () => {
  const calendarNames = new Map<string, string>();
  for (const account of dataStore.load().accounts) {
    for (const calendar of account.calendars) {
      calendarNames.set(calendar.id, calendar.displayName);
    }
  }
  return calendarNames;
};

export const useVisibleTaskGroups = () => {
  const { data: uiState } = useUIState();
  const { data: filteredTasks = [] } = useFilteredTasks();

  const sortConfig = uiState?.sortConfig ?? DEFAULT_SORT_CONFIG;
  const taskGroupConfig = uiState?.taskGroupConfig ?? DEFAULT_TASK_GROUP_CONFIG;
  const activeCalendarId = uiState?.activeCalendarId ?? null;
  const showCompletedTasks = uiState?.showCompletedTasks ?? true;
  const moveCompletedTasksToBottom = uiState?.moveCompletedTasksToBottom ?? false;
  const activeView = uiState?.activeView ?? 'tasks';

  return useMemo(() => {
    return getVisibleTaskGroups({
      activeView,
      filteredTasks,
      showCompletedTasks,
      moveCompletedTasksToBottom,
      sortConfig,
      taskGroupConfig,
      activeCalendarId,
      calendarNames: getCalendarNames(),
    });
  }, [
    activeView,
    filteredTasks,
    moveCompletedTasksToBottom,
    showCompletedTasks,
    sortConfig,
    taskGroupConfig,
    activeCalendarId,
  ]);
};

export const useVisibleTasks = () => {
  const groups = useVisibleTaskGroups();
  return useMemo(() => groups.flatMap((group) => group.tasks), [groups]);
};
