/**
 * TanStack Query hooks for UI state
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { subscribeToDataChanges } from '$lib/store';
import {
  getUIState,
  setActiveAccount,
  setActiveCalendar,
  setActiveTag,
  setAllTasksView,
  setEditorOpen,
  setSearchQuery,
  setSelectedTask,
  setShowCompletedTasks,
  setShowUnstartedTasks,
  setSortConfig,
} from '$lib/store/ui';
import type { SortConfig } from '$types/index';
import { DEFAULT_SORT_CONFIG } from '$utils/constants';

/**
 * Hook to get the full UI state
 */
export const useUIState = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToDataChanges(() => {
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
