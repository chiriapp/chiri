/**
 * TanStack Query hooks for tags
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '$lib/queryClient';
import { dataStore } from '$lib/store';
import { moveItem } from '$lib/store/reorder';
import { reorderTags } from '$lib/store/reorder/tags';
import { createTag, deleteTag, getAllTags, updateTag } from '$lib/store/tags';
import type { Tag } from '$types';

/**
 * hook to get all tags
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
 * hook to create a tag
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
 * hook to update a tag
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
 * hook to reorder tags (manual sort mode)
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
 * hook to delete a tag
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
