/**
 * TanStack Query hooks for UI state
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  DEFAULT_ACCOUNT_SORT_CONFIG,
  DEFAULT_CALENDAR_SORT_CONFIG,
  DEFAULT_SORT_CONFIG,
  DEFAULT_TAG_SORT_CONFIG,
  DEFAULT_TASK_GROUP_CONFIG,
} from '$constants';
import { queryKeys } from '$lib/queryClient';
import { dataStore } from '$lib/store';
import {
  getUIState,
  setAccountSortConfig,
  setActiveAccount,
  setActiveCalendar,
  setActiveFilter,
  setActiveTag,
  setAllTasksView,
  setCalendarSortConfig,
  setEditorOpen,
  setMoveCompletedTasksToBottom,
  setRecentlyDeletedView,
  setSearchQuery,
  setSelectedTask,
  setShowCompletedTasks,
  setShowUnstartedTasks,
  setSortConfig,
  setTagSortConfig,
  setTaskGroupConfig,
} from '$lib/store/ui';
import type {
  AccountSortConfig,
  CalendarSortConfig,
  SortConfig,
  TagSortConfig,
  TaskGroupConfig,
} from '$types/sort';

export type TaskEditorFocusField = 'progress';

type SetSelectedTaskInput =
  | string
  | null
  | { id: string | null; focusTitle?: boolean; focusEditorField?: TaskEditorFocusField };

let pendingTitleAutofocusTaskId: string | null = null;
let pendingTaskListScrollTaskId: string | null = null;
let pendingEditorFocus: { taskId: string; field: TaskEditorFocusField } | null = null;
let editorFocusRequestVersion = 0;
const editorFocusListeners = new Set<() => void>();

export const requestSelectedTaskTitleAutofocus = (taskId: string) => {
  pendingTitleAutofocusTaskId = taskId;
};

export const consumeSelectedTaskTitleAutofocus = (taskId: string) => {
  if (pendingTitleAutofocusTaskId !== taskId) return false;
  pendingTitleAutofocusTaskId = null;
  return true;
};

export const consumeSelectedTaskListScroll = (taskId: string) => {
  if (pendingTaskListScrollTaskId !== taskId) return false;
  pendingTaskListScrollTaskId = null;
  return true;
};

export const consumeSelectedTaskEditorFocus = (taskId: string) => {
  if (pendingEditorFocus?.taskId !== taskId) return null;
  const field = pendingEditorFocus.field;
  pendingEditorFocus = null;
  return field;
};

export const subscribeToTaskEditorFocus = (listener: () => void) => {
  editorFocusListeners.add(listener);
  return () => {
    editorFocusListeners.delete(listener);
  };
};

export const getTaskEditorFocusRequestVersion = () => editorFocusRequestVersion;

const subscribeToUIState = (listener: () => void) =>
  dataStore.subscribe(listener, (data) => data.ui);

/**
 * hook to get the full UI state
 */
export const useUIState = () => {
  const data = useSyncExternalStore(subscribeToUIState, getUIState, getUIState);
  return { data };
};

/**
 * hook to get selected calendar ID
 */
export const useActiveCalendarId = () => {
  const { data: uiState } = useUIState();
  return uiState?.activeCalendarId ?? null;
};

/**
 * hook to get active tag ID
 */
export const useActiveTagId = () => {
  const { data: uiState } = useUIState();
  return uiState?.activeTagId ?? null;
};

/**
 * hook to get active filter ID
 */
export const useActiveFilterId = () => {
  const { data: uiState } = useUIState();
  return uiState?.activeFilterId ?? null;
};

/**
 * hook to get active account ID
 */
export const useActiveAccountId = () => {
  const { data: uiState } = useUIState();
  return uiState?.activeAccountId ?? null;
};

/**
 * hook to get selected task ID
 */
export const useSelectedTaskId = () => {
  const { data: uiState } = useUIState();
  return uiState?.selectedTaskId ?? null;
};

/**
 * hook to get editor open state
 */
export const useIsEditorOpen = () => {
  const { data: uiState } = useUIState();
  return uiState?.isEditorOpen ?? false;
};

/**
 * hook to get search query
 */
export const useSearchQuery = () => {
  const { data: uiState } = useUIState();
  return uiState?.searchQuery ?? '';
};

/**
 * hook to get sort config
 */
export const useSortConfig = () => {
  const { data: uiState } = useUIState();
  return uiState?.sortConfig ?? DEFAULT_SORT_CONFIG;
};

export const useTaskGroupConfig = () => {
  const { data: uiState } = useUIState();
  return uiState?.taskGroupConfig ?? DEFAULT_TASK_GROUP_CONFIG;
};

/**
 * hook to get account sort config
 */
export const useAccountSortConfig = () => {
  const { data: uiState } = useUIState();
  return uiState?.accountSortConfig ?? DEFAULT_ACCOUNT_SORT_CONFIG;
};

/**
 * hook to set account sort config
 */
export const useSetAccountSortConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: AccountSortConfig) => {
      setAccountSortConfig(config);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
    },
  });
};

/**
 * hook to get calendar sort config
 */
export const useCalendarSortConfig = () => {
  const { data: uiState } = useUIState();
  return uiState?.calendarSortConfig ?? DEFAULT_CALENDAR_SORT_CONFIG;
};

/**
 * hook to get show completed tasks setting
 */
export const useShowCompletedTasks = () => {
  const { data: uiState } = useUIState();
  return uiState?.showCompletedTasks ?? true;
};

/**
 * hook to set active account
 */
export const useSetActiveAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | null) => {
      setActiveAccount(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
    },
  });
};

/**
 * hook to set selected calendar
 */
export const useSetActiveCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | null) => {
      setActiveCalendar(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.filteredTasks });
    },
  });
};

/**
 * hook to set active tag
 */
export const useSetActiveTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | null) => {
      setActiveTag(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.filteredTasks });
    },
  });
};

/**
 * hook to set active filter
 */
export const useSetActiveFilter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | null) => {
      setActiveFilter(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.filteredTasks });
    },
  });
};

/**
 * hook to set all tasks view
 */
export const useSetAllTasksView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      setAllTasksView();
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.filteredTasks });
    },
  });
};

/**
 * hook to set recently deleted view
 */
export const useSetRecentlyDeletedView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      setRecentlyDeletedView();
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.filteredTasks });
    },
  });
};

/**
 * hook to set selected task
 */
export const useSetSelectedTask = () => {
  const mutate = useCallback((input: SetSelectedTaskInput) => {
    const id = typeof input === 'object' && input !== null ? input.id : input;
    const focusTitle =
      typeof input === 'object' && input !== null ? (input.focusTitle ?? false) : false;
    const focusEditorField =
      typeof input === 'object' && input !== null ? input.focusEditorField : undefined;

    pendingTitleAutofocusTaskId = focusTitle && id !== null ? id : null;
    pendingTaskListScrollTaskId = focusTitle && id !== null ? id : null;
    pendingEditorFocus =
      focusEditorField && id !== null ? { taskId: id, field: focusEditorField } : null;
    if (pendingEditorFocus) {
      editorFocusRequestVersion += 1;
      for (const listener of editorFocusListeners) listener();
    }
    setSelectedTask(id);
  }, []);

  return useMemo(() => ({ mutate }), [mutate]);
};

/**
 * hook to set editor open state
 */
export const useSetEditorOpen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (open: boolean) => {
      if (!open) {
        pendingTitleAutofocusTaskId = null;
        pendingTaskListScrollTaskId = null;
        pendingEditorFocus = null;
      }
      setEditorOpen(open);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
    },
  });
};

/**
 * hook to set search query
 */
export const useSetSearchQuery = () => {
  return useMutation({
    mutationFn: (query: string) => {
      setSearchQuery(query);
      return Promise.resolve();
    },
  });
};

/**
 * hook to set sort config
 */
export const useSetSortConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: SortConfig) => {
      setSortConfig(config);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
    },
  });
};

export const useSetTaskGroupConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: TaskGroupConfig) => {
      setTaskGroupConfig(config);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
    },
  });
};

/**
 * hook to set calendar sort config
 */
export const useSetCalendarSortConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: CalendarSortConfig) => {
      setCalendarSortConfig(config);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
    },
  });
};

/**
 * hook to get tag sort config
 */
export const useTagSortConfig = () => {
  const { data: uiState } = useUIState();
  return uiState?.tagSortConfig ?? DEFAULT_TAG_SORT_CONFIG;
};

/**
 * hook to set tag sort config
 */
export const useSetTagSortConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: TagSortConfig) => {
      setTagSortConfig(config);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
    },
  });
};

/**
 * hook to set show completed tasks
 */
export const useSetShowCompletedTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (show: boolean) => {
      setShowCompletedTasks(show);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.filteredTasks });
    },
  });
};

/**
 * hook to set whether completed tasks appear after active tasks
 */
export const useSetMoveCompletedTasksToBottom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (moveToBottom: boolean) => {
      setMoveCompletedTasksToBottom(moveToBottom);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
    },
  });
};

/**
 * hook to set show unstarted tasks
 */
export const useSetShowUnstartedTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (show: boolean) => {
      setShowUnstartedTasks(show);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uiState.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.filteredTasks });
    },
  });
};
