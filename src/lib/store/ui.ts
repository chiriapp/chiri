/**
 * UI state operations
 */

import { db } from '$lib/database';
import { loggers } from '$lib/logger';
import { dataStore } from '$lib/store';
import type {
  AccountSortConfig,
  CalendarSortConfig,
  SortConfig,
  TagSortConfig,
  TaskGroupConfig,
} from '$types/sort';
import type { DataStore } from '$types/store/state';

const log = loggers.dataStore;
const SEARCH_QUERY_PERSIST_DELAY_MS = 250;
const SELECTED_TASK_PERSIST_DELAY_MS = 250;
let searchQueryPersistTimer: ReturnType<typeof setTimeout> | null = null;
let selectedTaskPersistTimer: ReturnType<typeof setTimeout> | null = null;
let selectedTaskIdSource: DataStore['tasks'] | null = null;
let selectedTaskIds = new Set<string>();

const hasTaskId = (tasks: DataStore['tasks'], id: string) => {
  if (selectedTaskIdSource !== tasks) {
    selectedTaskIdSource = tasks;
    selectedTaskIds = new Set(tasks.map((task) => task.id));
  }
  return selectedTaskIds.has(id);
};

const scheduleSelectedTaskPersistence = (id: string | null) => {
  if (selectedTaskPersistTimer) clearTimeout(selectedTaskPersistTimer);
  selectedTaskPersistTimer = setTimeout(() => {
    selectedTaskPersistTimer = null;
    const ui = dataStore.load().ui;
    if (ui.selectedTaskId !== id || ui.isEditorOpen !== (id !== null)) return;
    db.setSelectedTask(id, { notify: false }).catch((e) =>
      log.error('Failed to persist selected task:', e),
    );
  }, SELECTED_TASK_PERSIST_DELAY_MS);
};

export const getUIState = () => {
  return dataStore.load().ui;
};

export const setActiveAccount = (id: string | null) => {
  const data = dataStore.load();

  // validate that the account exists before setting it
  if (id !== null) {
    const accountExists = data.accounts.some((account) => account.id === id);
    if (!accountExists) {
      log.warn('Attempted to set non-existent account as active, ignoring', { accountId: id });
      return;
    }
  }

  db.setActiveAccount(id).catch((e) => log.error('Failed to persist active account:', e));

  dataStore.save({
    ...data,
    ui: {
      ...data.ui,
      activeView: 'tasks',
      activeAccountId: id,
      activeCalendarId: null,
      activeFilterId: null,
      activeTagId: null,
    },
  });
};

export const setActiveCalendar = (id: string | null) => {
  const data = dataStore.load();

  // validate that the calendar exists before setting it
  if (id !== null) {
    const calendarExists = data.accounts.some((account) =>
      account.calendars.some((calendar) => calendar.id === id),
    );
    if (!calendarExists) {
      log.warn('Attempted to set non-existent calendar as selected, ignoring', { calendarId: id });
      return;
    }
  }

  db.setActiveCalendar(id).catch((e) => log.error('Failed to persist selected calendar:', e));

  dataStore.save({
    ...data,
    ui: {
      ...data.ui,
      activeView: 'tasks',
      activeCalendarId: id,
      activeTagId: null,
      activeFilterId: null,
      selectedTaskId: null,
      isEditorOpen: false,
    },
  });
};

export const setActiveTag = (id: string | null) => {
  const data = dataStore.load();

  // validate that the tag exists before setting it
  if (id !== null) {
    const tagExists = data.tags.some((tag) => tag.id === id);
    if (!tagExists) {
      log.warn('Attempted to set non-existent tag as active, ignoring', { tagId: id });
      return;
    }
  }

  db.setActiveTag(id).catch((e) => log.error('Failed to persist active tag:', e));

  dataStore.save({
    ...data,
    ui: {
      ...data.ui,
      activeView: 'tasks',
      activeTagId: id,
      activeCalendarId: null,
      activeFilterId: null,
      selectedTaskId: null,
      isEditorOpen: false,
    },
  });
};

export const setActiveFilter = (id: string | null) => {
  const data = dataStore.load();

  if (id !== null) {
    const filterExists = data.filters.some((filter) => filter.id === id);
    if (!filterExists) {
      log.warn('Attempted to set non-existent filter as active, ignoring', { filterId: id });
      return;
    }
  }

  db.setActiveFilter(id).catch((e) => log.error('Failed to persist active filter:', e));

  dataStore.save({
    ...data,
    ui: {
      ...data.ui,
      activeView: 'filter',
      activeAccountId: null,
      activeFilterId: id,
      activeCalendarId: null,
      activeTagId: null,
      selectedTaskId: null,
      isEditorOpen: false,
    },
  });
};

export const setAllTasksView = () => {
  const data = dataStore.load();

  db.setAllTasksView().catch((e) => log.error('Failed to persist all tasks view:', e));

  dataStore.save({
    ...data,
    ui: {
      ...data.ui,
      activeView: 'tasks',
      activeAccountId: null,
      activeCalendarId: null,
      activeTagId: null,
      activeFilterId: null,
      selectedTaskId: null,
      isEditorOpen: false,
    },
  });
};

export const setRecentlyDeletedView = () => {
  const data = dataStore.load();

  db.setRecentlyDeletedView().catch((e) =>
    log.error('Failed to persist recently deleted view:', e),
  );

  dataStore.save({
    ...data,
    ui: {
      ...data.ui,
      activeView: 'recently-deleted',
      activeAccountId: null,
      activeCalendarId: null,
      activeTagId: null,
      activeFilterId: null,
      selectedTaskId: null,
      isEditorOpen: false,
    },
  });
};

export const setSelectedTask = (id: string | null) => {
  const data = dataStore.load();

  // validate that the task exists before setting it
  if (id !== null) {
    const taskExists = hasTaskId(data.tasks, id);
    if (!taskExists) {
      log.warn('Attempted to set non-existent task as selected, ignoring', { taskId: id });
      return;
    }
  }

  scheduleSelectedTaskPersistence(id);

  dataStore.save({
    ...data,
    ui: {
      ...data.ui,
      selectedTaskId: id,
      isEditorOpen: id !== null,
    },
  });
};

export const setEditorOpen = (open: boolean) => {
  const data = dataStore.load();

  db.setEditorOpen(open).catch((e) => log.error('Failed to persist editor open:', e));

  dataStore.save({
    ...data,
    ui: {
      ...data.ui,
      isEditorOpen: open,
      selectedTaskId: open ? data.ui.selectedTaskId : null,
    },
  });
};

export const setSearchQuery = (query: string) => {
  const data = dataStore.load();

  if (searchQueryPersistTimer) clearTimeout(searchQueryPersistTimer);
  searchQueryPersistTimer = setTimeout(() => {
    searchQueryPersistTimer = null;
    db.setSearchQuery(query, { notify: false }).catch((e) =>
      log.error('Failed to persist search query:', e),
    );
  }, SEARCH_QUERY_PERSIST_DELAY_MS);

  dataStore.save({
    ...data,
    ui: { ...data.ui, searchQuery: query },
  });
};

export const setSortConfig = (config: SortConfig) => {
  const data = dataStore.load();

  db.setSortConfig(config).catch((e) => log.error('Failed to persist sort config:', e));

  dataStore.save({
    ...data,
    ui: { ...data.ui, sortConfig: config },
  });
};

export const setTaskGroupConfig = (config: TaskGroupConfig) => {
  const data = dataStore.load();

  db.setTaskGroupConfig(config).catch((e) => log.error('Failed to persist task group config:', e));

  dataStore.save({
    ...data,
    ui: { ...data.ui, taskGroupConfig: config },
  });
};

export const setAccountSortConfig = (config: AccountSortConfig) => {
  const data = dataStore.load();

  db.setAccountSortConfig(config).catch((e) =>
    log.error('Failed to persist account sort config:', e),
  );

  dataStore.save({
    ...data,
    ui: { ...data.ui, accountSortConfig: config },
  });
};

export const setCalendarSortConfig = (config: CalendarSortConfig) => {
  const data = dataStore.load();

  db.setCalendarSortConfig(config).catch((e) =>
    log.error('Failed to persist calendar sort config:', e),
  );

  dataStore.save({
    ...data,
    ui: { ...data.ui, calendarSortConfig: config },
  });
};

export const setTagSortConfig = (config: TagSortConfig) => {
  const data = dataStore.load();

  db.setTagSortConfig(config).catch((e) => log.error('Failed to persist tag sort config:', e));

  dataStore.save({
    ...data,
    ui: { ...data.ui, tagSortConfig: config },
  });
};

export const setShowCompletedTasks = (show: boolean) => {
  const data = dataStore.load();

  db.setShowCompletedTasks(show).catch((e) => log.error('Failed to persist show completed:', e));

  dataStore.save({
    ...data,
    ui: { ...data.ui, showCompletedTasks: show },
  });
};

export const setMoveCompletedTasksToBottom = (moveToBottom: boolean) => {
  const data = dataStore.load();

  db.setMoveCompletedTasksToBottom(moveToBottom).catch((e) =>
    log.error('Failed to persist completed task placement:', e),
  );

  dataStore.save({
    ...data,
    ui: { ...data.ui, moveCompletedTasksToBottom: moveToBottom },
  });
};

export const setShowUnstartedTasks = (show: boolean) => {
  const data = dataStore.load();

  db.setShowUnstartedTasks(show).catch((e) => log.error('Failed to persist show unstarted:', e));

  dataStore.save({
    ...data,
    ui: { ...data.ui, showUnstartedTasks: show },
  });
};
