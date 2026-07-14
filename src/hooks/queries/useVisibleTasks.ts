import { useMemo } from 'react';
import { DEFAULT_SORT_CONFIG } from '$constants';
import { useFilteredTasks } from '$hooks/queries/useTasks';
import { useUIState } from '$hooks/queries/useUIState';
import { getSortedTasks } from '$lib/store/filters';
import { getChildTasks } from '$lib/store/tasks';
import type { Task } from '$types';
import type { SortConfig } from '$types/sort';
import type { UIState } from '$types/store';
import { flattenTasks } from '$utils/sortable';

interface VisibleTasksOptions {
  activeView: UIState['activeView'];
  filteredTasks: Task[];
  showCompletedTasks: boolean;
  sortConfig: SortConfig;
}

export const getVisibleTasks = ({
  activeView,
  filteredTasks,
  showCompletedTasks,
  sortConfig,
}: VisibleTasksOptions) => {
  const visibleTaskUids = new Set(filteredTasks.map((task) => task.uid));
  const topLevelTasks = filteredTasks.filter(
    (task) => !task.parentUid || !visibleTaskUids.has(task.parentUid),
  );
  const sortedTopLevel = getSortedTasks(topLevelTasks, sortConfig);

  const getFilteredChildTasks = (parentUid: string) => {
    const children = getChildTasks(
      parentUid,
      activeView === 'recently-deleted' ? 'deleted' : 'active',
    );
    if (!showCompletedTasks) {
      return children.filter((task) => task.status !== 'completed' && task.status !== 'cancelled');
    }
    return children;
  };

  return flattenTasks(sortedTopLevel, getFilteredChildTasks, (tasks) =>
    getSortedTasks(tasks, sortConfig),
  );
};

export const useVisibleTasks = () => {
  const { data: uiState } = useUIState();
  const { data: filteredTasks = [] } = useFilteredTasks();

  const sortConfig = uiState?.sortConfig ?? DEFAULT_SORT_CONFIG;
  const showCompletedTasks = uiState?.showCompletedTasks ?? true;
  const activeView = uiState?.activeView ?? 'tasks';

  return useMemo(() => {
    return getVisibleTasks({ activeView, filteredTasks, showCompletedTasks, sortConfig });
  }, [activeView, filteredTasks, showCompletedTasks, sortConfig]);
};
