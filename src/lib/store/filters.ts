import { dataStore } from '$lib/store';
import type { Priority, SortConfig, Task } from '$types';

const priorityOrder: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

export const getFilteredTasks = () => {
  const data = dataStore.load();
  const { searchQuery, showCompletedTasks, showUnstartedTasks, activeCalendarId, activeTagId } =
    data.ui;

  return data.tasks.filter((task) => {
    // Filter by tag
    if (activeTagId !== null) {
      if (!(task.tags ?? []).includes(activeTagId)) {
        return false;
      }
    } else {
      // Filter by calendar (null means "All Tasks" view - show all)
      if (activeCalendarId !== null && task.calendarId !== activeCalendarId) {
        return false;
      }
    }

    // Filter by completion status (completed and cancelled are both "done")
    if (!showCompletedTasks && (task.status === 'completed' || task.status === 'cancelled')) {
      return false;
    }

    // Filter by start date (hide unstarted tasks with future start dates)
    if (!showUnstartedTasks && task.startDate) {
      if (new Date(task.startDate) > new Date()) {
        return false;
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      // Check task itself
      if (
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.url?.toLowerCase().includes(query)
      ) {
        return true;
      }
      // Check child tasks (subtasks)
      const childTasks = data.tasks.filter((t) => t.parentUid === task.uid);
      return childTasks.some((child) => child.title.toLowerCase().includes(query));
    }

    return true;
  });
};

export const getSortedTasks = (tasks: Task[], sortConfig?: SortConfig) => {
  const config = sortConfig ?? dataStore.load().ui.sortConfig;
  const { mode, direction } = config;
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...tasks].sort((a, b) => {
    switch (mode) {
      case 'manual':
      case 'smart':
        return (a.sortOrder - b.sortOrder) * multiplier;

      case 'due-date':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * multiplier;

      case 'start-date':
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return (new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) * multiplier;

      case 'priority':
        return (priorityOrder[a.priority] - priorityOrder[b.priority]) * multiplier;

      case 'title':
        return a.title.localeCompare(b.title) * multiplier;

      case 'modified':
        return (new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()) * multiplier;

      case 'created':
        return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * multiplier;

      default:
        return 0;
    }
  });
};
