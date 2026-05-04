/**
 * TanStack Query hooks for tags
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '$lib/queryClient';
import { dataStore } from '$lib/store';
import { moveItem } from '$lib/store/reorder';
import { reorderTags } from '$lib/store/reorder/tags';
import { createTag, deleteTag, getAllTags, getTagById, updateTag } from '$lib/store/tags';
import { getTasksByTag } from '$lib/store/tasks';
import type { Tag } from '$types';

/**
 * Hook to get all tags
 */
export const useTags = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return dataStore.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    });
  }, [queryClient]);

  return useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: () => getAllTags(),
    staleTime: Infinity,
  });
};

/**
 * Hook to get a single tag by ID
 */
export const useTag = (id: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return dataStore.subscribe(() => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tags.byId(id) });
      }
    });
  }, [queryClient, id]);

  return useQuery({
    queryKey: queryKeys.tags.byId(id || ''),
    queryFn: () => (id ? getTagById(id) : undefined),
    enabled: !!id,
    staleTime: Infinity,
  });
};

/**
 * Hook to get tasks by tag
 */
export const useTasksByTag = (tagId: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return dataStore.subscribe(() => {
      if (tagId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byTag(tagId) });
      }
    });
  }, [queryClient, tagId]);

  return useQuery({
    queryKey: queryKeys.tasks.byTag(tagId || ''),
    queryFn: () => (tagId ? getTasksByTag(tagId) : []),
    enabled: !!tagId,
    staleTime: Infinity,
  });
};

/**
 * Hook to create a tag
 */
export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagInput: Partial<Tag>) => {
      return Promise.resolve(createTag(tagInput));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
  });
};

/**
 * Hook to update a tag
 */
export const useUpdateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Tag> }) => {
      return Promise.resolve(updateTag(id, updates));
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.byId(id) });
    },
  });
};

/**
 * Hook to reorder tags (manual sort mode)
 */
export const useReorderTags = () => {
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: ({ activeId, overId }: { activeId: string; overId: string }) => {
      queryClient.setQueryData<Tag[]>(queryKeys.tags.all, (tags) => {
        if (!tags) return tags;
        return moveItem(tags, activeId, overId) ?? tags;
      });
    },
    mutationFn: ({ activeId, overId }: { activeId: string; overId: string }) => {
      reorderTags(activeId, overId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
  });
};

/**
 * Hook to delete a tag
 */
export const useDeleteTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      deleteTag(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};
