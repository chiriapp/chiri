import { addDays, endOfDay, startOfDay, subDays } from 'date-fns';
import { dataStore } from '$lib/store';
import type { Priority, Task } from '$types';
import type { DateFilterField, Filter, FilterCriterion } from '$types/filter';
import type { SortConfig } from '$types/sort';

const priorityOrder: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

const matchesDeletionVisibility = (task: Task, activeView: string) => {
  return activeView === 'recently-deleted' ? !!task.deletedAt : !task.deletedAt;
};

const matchesActiveScope = (
  task: Task,
  activeView: string,
  activeTagId: string | null,
  activeCalendarId: string | null,
) => {
  if (activeView === 'recently-deleted') return true;
  if (activeTagId !== null) return (task.tags ?? []).includes(activeTagId);
  if (activeCalendarId !== null) return task.calendarId === activeCalendarId;
  return true;
};

const matchesSearchQuery = (task: Task, tasks: Task[], activeView: string, searchQuery: string) => {
  const query = searchQuery.toLowerCase();

  if (
    task.title.toLowerCase().includes(query) ||
    task.description.toLowerCase().includes(query) ||
    task.url?.toLowerCase().includes(query)
  ) {
    return true;
  }

  const childTasks = tasks.filter((candidate) => {
    if (candidate.parentUid !== task.uid) return false;
    return activeView === 'recently-deleted' ? !!candidate.deletedAt : !candidate.deletedAt;
  });

  return childTasks.some((child) => child.title.toLowerCase().includes(query));
};

export const getFilteredTasks = () => {
  const data = dataStore.load();
  const {
    activeView,
    searchQuery,
    showCompletedTasks,
    showUnstartedTasks,
    activeCalendarId,
    activeTagId,
    activeFilterId,
  } = data.ui;
  const activeFilter =
    activeView === 'filter' && activeFilterId
      ? data.filters.find((filter) => filter.id === activeFilterId)
      : undefined;
  const activeFilterControlsStatus = activeFilter?.criteria.some((c) => c.field === 'status');
  const activeFilterControlsStartDate = activeFilter?.criteria.some((c) => c.field === 'startDate');

  return data.tasks.filter((task) => {
    if (!matchesDeletionVisibility(task, activeView)) return false;
    if (!matchesActiveScope(task, activeView, activeTagId, activeCalendarId)) return false;

    if (activeFilter && !matchesFilter(task, activeFilter)) {
      return false;
    }

    // filter by completion status (completed and cancelled are both "done")
    if (
      !activeFilterControlsStatus &&
      !showCompletedTasks &&
      (task.status === 'completed' || task.status === 'cancelled')
    ) {
      return false;
    }

    // filter by start date (hide unstarted tasks with future start dates)
    if (!activeFilterControlsStartDate && !showUnstartedTasks && task.startDate) {
      if (new Date(task.startDate) > new Date()) {
        return false;
      }
    }

    // filter by search query
    if (searchQuery) return matchesSearchQuery(task, data.tasks, activeView, searchQuery);

    return true;
  });
};

const getDateValue = (task: Task, field: DateFilterField) => {
  switch (field) {
    case 'dueDate':
      return task.dueDate;
    case 'startDate':
      return task.startDate;
    case 'createdAt':
      return task.createdAt;
    case 'modifiedAt':
      return task.modifiedAt;
    case 'completedAt':
      return task.completedAt;
  }
};

const isSameDay = (date: Date, day: Date) => {
  const start = startOfDay(day);
  const end = endOfDay(day);
  return date >= start && date <= end;
};

const matchesDateCriterion = (
  task: Task,
  criterion: Extract<FilterCriterion, { field: DateFilterField }>,
) => {
  const date = getDateValue(task, criterion.field);
  const today = new Date();

  switch (criterion.op) {
    case 'exists':
      return date !== undefined;
    case 'empty':
      return date === undefined;
    case 'today':
      return date ? isSameDay(date, today) : false;
    case 'tomorrow':
      return date ? isSameDay(date, addDays(today, 1)) : false;
    case 'beforeToday':
      return date ? date < startOfDay(today) : false;
    case 'withinDays': {
      if (!date) return false;
      const days = criterion.value ?? 0;
      if (criterion.field === 'createdAt' || criterion.field === 'modifiedAt') {
        return date >= subDays(today, days) && date <= today;
      }
      return date >= startOfDay(today) && date <= endOfDay(addDays(today, days));
    }
  }
};

const valueListIncludes = <T extends string>(value: T | T[], candidate: T) => {
  return Array.isArray(value) ? value.includes(candidate) : value === candidate;
};

const matchesCriterion = (task: Task, criterion: FilterCriterion) => {
  switch (criterion.field) {
    case 'dueDate':
    case 'startDate':
    case 'createdAt':
    case 'modifiedAt':
    case 'completedAt':
      return matchesDateCriterion(task, criterion);

    case 'status':
      switch (criterion.op) {
        case 'is':
        case 'in':
          return valueListIncludes(criterion.value, task.status);
        case 'isNot':
        case 'notIn':
          return !valueListIncludes(criterion.value, task.status);
      }
      return false;

    case 'priority':
      switch (criterion.op) {
        case 'is':
        case 'in':
          return valueListIncludes(criterion.value, task.priority);
        case 'isNot':
        case 'notIn':
          return !valueListIncludes(criterion.value, task.priority);
      }
      return false;

    case 'tags': {
      const taskTags = task.tags ?? [];
      const filterTags = criterion.value ?? [];
      switch (criterion.op) {
        case 'empty':
          return taskTags.length === 0;
        case 'has':
          return filterTags.length > 0 && taskTags.includes(filterTags[0]);
        case 'hasAny':
          return filterTags.some((tagId) => taskTags.includes(tagId));
        case 'hasAll':
          return filterTags.every((tagId) => taskTags.includes(tagId));
      }
      return false;
    }

    case 'calendar':
      switch (criterion.op) {
        case 'is':
          return criterion.value[0] === task.calendarId;
        case 'isAnyOf':
          return criterion.value.includes(task.calendarId);
      }
      return false;

    case 'text': {
      const query = criterion.value.trim().toLowerCase();
      if (!query) return true;
      return (
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.url?.toLowerCase().includes(query) === true
      );
    }
  }
};

export const matchesFilter = (task: Task, filter: Filter) => {
  if (filter.criteria.length === 0) return true;
  if (filter.combinator === 'any') {
    return filter.criteria.some((criterion) => matchesCriterion(task, criterion));
  }
  return filter.criteria.every((criterion) => matchesCriterion(task, criterion));
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
