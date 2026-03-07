/**
 * UI state operations
 */

import * as db from '$lib/database';
import { loggers } from '$lib/logger';
import { loadDataStore, saveDataStore } from '$lib/store';
import type { UIState } from '$lib/store/types';
import type { SortConfig } from '$types/index';

const log = loggers.taskData;

export const getUIState = (): UIState => {
  return loadDataStore().ui;
};

export const setActiveAccount = (id: string | null) => {
  const data = loadDataStore();

  // Persist to SQLite
  db.setActiveAccount(id).catch((e) => log.error('Failed to persist active account:', e));

  saveDataStore({
    ...data,
    ui: { ...data.ui, activeAccountId: id, activeCalendarId: null },
  });
};

export const setActiveCalendar = (id: string | null) => {
  const data = loadDataStore();

  // Persist to SQLite
  db.setActiveCalendar(id).catch((e) => log.error('Failed to persist active calendar:', e));

  saveDataStore({
    ...data,
    ui: {
      ...data.ui,
      activeCalendarId: id,
      activeTagId: null,
      selectedTaskId: null,
      isEditorOpen: false,
    },
  });
};

export const setActiveTag = (id: string | null) => {
  const data = loadDataStore();

  // Persist to SQLite
  db.setActiveTag(id).catch((e) => log.error('Failed to persist active tag:', e));

  saveDataStore({
    ...data,
    ui: {
      ...data.ui,
      activeTagId: id,
      activeCalendarId: null,
      selectedTaskId: null,
      isEditorOpen: false,
    },
  });
};

export const setAllTasksView = () => {
  const data = loadDataStore();

  // Persist to SQLite
  db.setAllTasksView().catch((e) => log.error('Failed to persist all tasks view:', e));

  saveDataStore({
    ...data,
    ui: {
      ...data.ui,
      activeCalendarId: null,
      activeTagId: null,
      selectedTaskId: null,
      isEditorOpen: false,
    },
  });
};

export const setSelectedTask = (id: string | null) => {
  const data = loadDataStore();

  // Persist to SQLite
  db.setSelectedTask(id).catch((e) => log.error('Failed to persist selected task:', e));

  saveDataStore({
    ...data,
    ui: {
      ...data.ui,
      selectedTaskId: id,
      isEditorOpen: id !== null,
    },
  });
};

export const setEditorOpen = (open: boolean) => {
  const data = loadDataStore();

  // Persist to SQLite
  db.setEditorOpen(open).catch((e) => log.error('Failed to persist editor open:', e));

  saveDataStore({
    ...data,
    ui: {
      ...data.ui,
      isEditorOpen: open,
      selectedTaskId: open ? data.ui.selectedTaskId : null,
    },
  });
};

export const setSearchQuery = (query: string) => {
  const data = loadDataStore();

  // Persist to SQLite
  db.setSearchQuery(query).catch((e) => log.error('Failed to persist search query:', e));

  saveDataStore({
    ...data,
    ui: { ...data.ui, searchQuery: query },
  });
};

export const setSortConfig = (config: SortConfig) => {
  const data = loadDataStore();

  // Persist to SQLite
  db.setSortConfig(config).catch((e) => log.error('Failed to persist sort config:', e));

  saveDataStore({
    ...data,
    ui: { ...data.ui, sortConfig: config },
  });
};

export const setShowCompletedTasks = (show: boolean) => {
  const data = loadDataStore();

  // Persist to SQLite
  db.setShowCompletedTasks(show).catch((e) => log.error('Failed to persist show completed:', e));

  saveDataStore({
    ...data,
    ui: { ...data.ui, showCompletedTasks: show },
  });
};

export const setShowUnstartedTasks = (show: boolean) => {
  const data = loadDataStore();

  // Persist to SQLite
  db.setShowUnstartedTasks(show).catch((e) => log.error('Failed to persist show unstarted:', e));

  saveDataStore({
    ...data,
    ui: { ...data.ui, showUnstartedTasks: show },
  });
};
