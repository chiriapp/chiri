/**
 * TanStack Query hooks for UI state
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  DEFAULT_ACCOUNT_SORT_CONFIG,
  DEFAULT_CALENDAR_SORT_CONFIG,
  DEFAULT_SORT_CONFIG,
  DEFAULT_TAG_SORT_CONFIG,
} from '$constants';
import { dataStore } from '$lib/store';
import {
  getUIState,
  setAccountSortConfig,
  setActiveAccount,
  setActiveCalendar,
  setActiveTag,
  setAllTasksView,
  setCalendarSortConfig,
  setEditorOpen,
  setSearchQuery,
  setSelectedTask,
  setShowCompletedTasks,
  setShowUnstartedTasks,
  setSortConfig,
  setTagSortConfig,
} from '$lib/store/ui';
import type { AccountSortConfig, CalendarSortConfig, SortConfig, TagSortConfig } from '$types';

/**
 * Hook to get the full UI state
 */
export const useUIState = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return dataStore.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
    });
  }, [queryClient]);

  return useQuery({
    queryKey: ['uiState'],
    queryFn: () => getUIState(),
    staleTime: Infinity,
  });
};

/**
 * Hook to get active calendar ID
 */
export const useActiveCalendarId = () => {
  const { data: uiState } = useUIState();
  return uiState?.activeCalendarId ?? null;
};

/**
 * Hook to get active tag ID
 */
export const useActiveTagId = () => {
  const { data: uiState } = useUIState();
  return uiState?.activeTagId ?? null;
};

/**
 * Hook to get active account ID
 */
export const useActiveAccountId = () => {
  const { data: uiState } = useUIState();
  return uiState?.activeAccountId ?? null;
};

/**
 * Hook to get selected task ID
 */
export const useSelectedTaskId = () => {
  const { data: uiState } = useUIState();
  return uiState?.selectedTaskId ?? null;
};

/**
 * Hook to get editor open state
 */
export const useIsEditorOpen = () => {
  const { data: uiState } = useUIState();
  return uiState?.isEditorOpen ?? false;
};

/**
 * Hook to get search query
 */
export const useSearchQuery = () => {
  const { data: uiState } = useUIState();
  return uiState?.searchQuery ?? '';
};

/**
 * Hook to get sort config
 */
export const useSortConfig = () => {
  const { data: uiState } = useUIState();
  return uiState?.sortConfig ?? DEFAULT_SORT_CONFIG;
};

/**
 * Hook to get account sort config
 */
export const useAccountSortConfig = () => {
  const { data: uiState } = useUIState();
  return uiState?.accountSortConfig ?? DEFAULT_ACCOUNT_SORT_CONFIG;
};

/**
 * Hook to set account sort config
 */
export const useSetAccountSortConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: AccountSortConfig) => {
      setAccountSortConfig(config);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
    },
  });
};

/**
 * Hook to get calendar sort config
 */
export const useCalendarSortConfig = () => {
  const { data: uiState } = useUIState();
  return uiState?.calendarSortConfig ?? DEFAULT_CALENDAR_SORT_CONFIG;
};

/**
 * Hook to get show completed tasks setting
 */
export const useShowCompletedTasks = () => {
  const { data: uiState } = useUIState();
  return uiState?.showCompletedTasks ?? true;
};

/**
 * Hook to set active account
 */
export const useSetActiveAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | null) => {
      setActiveAccount(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
    },
  });
};

/**
 * Hook to set active calendar
 */
export const useSetActiveCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | null) => {
      setActiveCalendar(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
      queryClient.invalidateQueries({ queryKey: ['filteredTasks'] });
    },
  });
};

/**
 * Hook to set active tag
 */
export const useSetActiveTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | null) => {
      setActiveTag(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
      queryClient.invalidateQueries({ queryKey: ['filteredTasks'] });
    },
  });
};

/**
 * Hook to set all tasks view
 */
export const useSetAllTasksView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      setAllTasksView();
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
      queryClient.invalidateQueries({ queryKey: ['filteredTasks'] });
    },
  });
};

/**
 * Hook to set selected task
 */
export const useSetSelectedTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | null) => {
      setSelectedTask(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
    },
  });
};

/**
 * Hook to set editor open state
 */
export const useSetEditorOpen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (open: boolean) => {
      setEditorOpen(open);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
    },
  });
};

/**
 * Hook to set search query
 */
export const useSetSearchQuery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (query: string) => {
      setSearchQuery(query);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
      queryClient.invalidateQueries({ queryKey: ['filteredTasks'] });
    },
  });
};

/**
 * Hook to set sort config
 */
export const useSetSortConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: SortConfig) => {
      setSortConfig(config);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
    },
  });
};

/**
 * Hook to set calendar sort config
 */
export const useSetCalendarSortConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: CalendarSortConfig) => {
      setCalendarSortConfig(config);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
    },
  });
};

/**
 * Hook to get tag sort config
 */
export const useTagSortConfig = () => {
  const { data: uiState } = useUIState();
  return uiState?.tagSortConfig ?? DEFAULT_TAG_SORT_CONFIG;
};

/**
 * Hook to set tag sort config
 */
export const useSetTagSortConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: TagSortConfig) => {
      setTagSortConfig(config);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
    },
  });
};

/**
 * Hook to set show completed tasks
 */
export const useSetShowCompletedTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (show: boolean) => {
      setShowCompletedTasks(show);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
      queryClient.invalidateQueries({ queryKey: ['filteredTasks'] });
    },
  });
};

/**
 * Hook to set show unstarted tasks
 */
export const useSetShowUnstartedTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (show: boolean) => {
      setShowUnstartedTasks(show);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uiState'] });
      queryClient.invalidateQueries({ queryKey: ['filteredTasks'] });
    },
  });
};
