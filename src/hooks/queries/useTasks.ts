/**
 * TanStack Query hooks for tasks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { db } from '$lib/database';
import { queryKeys } from '$lib/queryClient';
import { dataStore } from '$lib/store';
import { getFilteredTasks, getSortedTasks } from '$lib/store/filters';
import { addReminder, removeReminder, updateReminder } from '$lib/store/reminders';
import { reorderTaskList, reorderTasks } from '$lib/store/reorder/tasks';
import {
  addTagToTask,
  type ChildTaskFilter,
  createTask,
  deleteTask,
  getAllTasks,
  getChildTasks,
  getTaskById,
  permanentlyDeleteTask,
  removeTagFromTask,
  restoreTask,
  toggleTaskComplete,
  updateTask,
} from '$lib/store/tasks';
import type { Task } from '$types';
import type { FlattenedTask } from '$types/store';

const dateTime = (date: Date | undefined) => date?.getTime();

const hasReorderPersistenceChange = (before: Task | undefined, after: Task) => {
  if (!before) return false;

  return (
    before.sortOrder !== after.sortOrder ||
    before.parentUid !== after.parentUid ||
    before.calendarId !== after.calendarId ||
    before.accountId !== after.accountId ||
    before.synced !== after.synced ||
    dateTime(before.modifiedAt) !== dateTime(after.modifiedAt)
  );
};

/**
 * hook to get sorted children of a task, reactive to any task store changes
 * uses a queryKey under queryKeys.tasks.all so it is invalidated alongside other task queries
 */
export const useChildTasks = (parentUid: string, filter: ChildTaskFilter = 'all') => {
  return useQuery({
    queryKey: [...queryKeys.tasks.all, 'children', parentUid, filter] as const,
    queryFn: () => getSortedTasks(getChildTasks(parentUid, filter)),
    staleTime: Infinity,
  });
};

/**
 * hook to get all tasks
 */
export const useTasks = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return dataStore.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    });
  }, [queryClient]);

  return useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: () => getAllTasks(),
    staleTime: Infinity, // Data is managed by our data layer
  });
};

/**
 * hook to get filtered tasks based on current UI state
 */
export const useFilteredTasks = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return dataStore.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['filteredTasks'] });
    });
  }, [queryClient]);

  return useQuery({
    queryKey: ['filteredTasks'],
    queryFn: () => getFilteredTasks(),
    staleTime: Infinity,
  });
};

/**
 * hook to create a task
 */
export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskInput: Partial<Task>) => {
      const task = createTask(taskInput);
      await db.logTaskChange(task.uid, 'created', null, task.title);
      if (task.parentUid) {
        await db.logTaskChange(task.parentUid, 'subtask', null, task.title);
      }
      return task;
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (newTask?.uid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', newTask.uid] });
      }
      if (newTask?.parentUid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', newTask.parentUid] });
      }
    },
  });
};

/**
 * hook to update a task
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const oldTask = getTaskById(id);
      const result = updateTask(id, updates);
      if (result && oldTask && updates.synced !== true) {
        await db.logHistoryForTaskUpdate(result.uid, oldTask, updates);
      }
      return result;
    },
    onSuccess: (updatedTask, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byId(id) });
      if (updatedTask?.uid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', updatedTask.uid] });
      }
    },
  });
};

/**
 * hook to update multiple tasks while preserving the normal task update side effects
 */
export const useBatchUpdateTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskUpdates: Array<{ id: string; updates: Partial<Task> }>) => {
      const updatedTasks: Task[] = [];

      for (const { id, updates } of taskUpdates) {
        const oldTask = getTaskById(id);
        const result = updateTask(id, updates);
        if (result && oldTask && updates.synced !== true) {
          await db.logHistoryForTaskUpdate(result.uid, oldTask, updates);
        }
        if (result) updatedTasks.push(result);
      }

      return updatedTasks;
    },
    onSuccess: (updatedTasks) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: ['filteredTasks'] });

      for (const task of updatedTasks) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byId(task.id) });
        queryClient.invalidateQueries({ queryKey: ['taskHistory', task.uid] });
      }
    },
  });
};

/**
 * hook to delete a task
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, deleteChildren = true }: { id: string; deleteChildren?: boolean }) => {
      const task = getTaskById(id);
      if (task?.parentUid) {
        await db.logTaskChange(task.parentUid, 'subtask', task.title, null);
      }
      deleteTask(id, deleteChildren);
      return task;
    },
    onSuccess: (deletedTask) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (deletedTask?.parentUid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', deletedTask.parentUid] });
      }
    },
  });
};

/**
 * hook to restore a deleted task
 */
export const useRestoreTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      restoreChildren = true,
    }: {
      id: string;
      restoreChildren?: boolean;
    }) => {
      restoreTask(id, restoreChildren);
      return getTaskById(id);
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: ['filteredTasks'] });
      if (task?.uid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', task.uid] });
      }
    },
  });
};

/**
 * hook to permanently delete a task
 */
export const usePermanentDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, deleteChildren = true }: { id: string; deleteChildren?: boolean }) => {
      const task = getTaskById(id);
      permanentlyDeleteTask(id, deleteChildren);
      return task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: ['filteredTasks'] });
      if (task?.parentUid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', task.parentUid] });
      }
    },
  });
};

/**
 * hook to toggle task completion
 */
export const useToggleTaskComplete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const task = getTaskById(id);
      if (!task) return task;
      const newStatus =
        task.status === 'completed' || task.status === 'cancelled' || task.status === 'in-process'
          ? 'needs-action'
          : 'completed';
      toggleTaskComplete(id);
      await db.logHistoryForTaskUpdate(task.uid, task, {
        status: newStatus,
      });
      return task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (task?.uid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', task.uid] });
      }
    },
  });
};

/**
 * hook to reorder tasks
 */
export const useReorderTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: ({
      activeId,
      overId,
      flattenedItems,
      targetIndent,
    }: {
      activeId: string;
      overId: string;
      flattenedItems: FlattenedTask[];
      targetIndent?: number;
    }) => {
      const sortConfig = dataStore.load().ui.sortConfig;
      const reorderCachedTasks = (tasks: Task[] | undefined) => {
        if (!tasks) return tasks;
        return (
          reorderTaskList(tasks, activeId, overId, flattenedItems, sortConfig, targetIndent) ??
          tasks
        );
      };

      queryClient.setQueryData<Task[]>(queryKeys.tasks.all, reorderCachedTasks);
      queryClient.setQueryData<Task[]>(['filteredTasks'], reorderCachedTasks);
    },
    mutationFn: async ({
      activeId,
      overId,
      flattenedItems,
      targetIndent,
    }: {
      activeId: string;
      overId: string;
      flattenedItems: FlattenedTask[];
      targetIndent?: number;
    }) => {
      const tasksBefore = getAllTasks();
      const taskBefore = tasksBefore.find((task) => task.id === activeId);
      const reorderedTasks = reorderTasks(activeId, overId, flattenedItems, targetIndent);
      const taskAfter = getTaskById(activeId);

      if (reorderedTasks) {
        const tasksBeforeById = new Map(tasksBefore.map((task) => [task.id, task]));
        const changedTasks = reorderedTasks.filter((task) =>
          hasReorderPersistenceChange(tasksBeforeById.get(task.id), task),
        );

        await Promise.all(changedTasks.map((task) => db.updateTask(task.id, task)));
      }

      const oldParentUid = taskBefore?.parentUid;
      const newParentUid = taskAfter?.parentUid;

      if (taskBefore && oldParentUid !== newParentUid) {
        if (oldParentUid) {
          await db.logTaskChange(oldParentUid, 'subtask', taskBefore.title, null);
        }
        if (newParentUid) {
          await db.logTaskChange(newParentUid, 'subtask', null, taskBefore.title);
        }
      }

      return { oldParentUid, newParentUid };
    },
    onSuccess: ({ oldParentUid, newParentUid }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (oldParentUid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', oldParentUid] });
      }
      if (newParentUid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', newParentUid] });
      }
    },
  });
};

export const useAddTagToTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, tagId }: { taskId: string; tagId: string }) => {
      const oldTask = getTaskById(taskId);
      addTagToTask(taskId, tagId);
      const newTask = getTaskById(taskId);
      if (oldTask && newTask) {
        await db.logHistoryForTaskUpdate(newTask.uid, oldTask, { tags: newTask.tags });
      }
      return newTask;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (task?.uid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', task.uid] });
      }
    },
  });
};

export const useRemoveTagFromTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, tagId }: { taskId: string; tagId: string }) => {
      const oldTask = getTaskById(taskId);
      removeTagFromTask(taskId, tagId);
      const newTask = getTaskById(taskId);
      if (oldTask && newTask) {
        await db.logHistoryForTaskUpdate(newTask.uid, oldTask, { tags: newTask.tags });
      }
      return newTask;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (task?.uid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', task.uid] });
      }
    },
  });
};

export const useAddReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, trigger }: { taskId: string; trigger: Date }) => {
      const oldTask = getTaskById(taskId);
      addReminder(taskId, trigger);
      const newTask = getTaskById(taskId);
      if (oldTask && newTask) {
        await db.logHistoryForTaskUpdate(newTask.uid, oldTask, { reminders: newTask.reminders });
      }
      return newTask;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (task?.uid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', task.uid] });
      }
    },
  });
};

export const useRemoveReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, reminderId }: { taskId: string; reminderId: string }) => {
      const oldTask = getTaskById(taskId);
      removeReminder(taskId, reminderId);
      const newTask = getTaskById(taskId);
      if (oldTask && newTask) {
        await db.logHistoryForTaskUpdate(newTask.uid, oldTask, { reminders: newTask.reminders });
      }
      return newTask;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (task?.uid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', task.uid] });
      }
    },
  });
};

export const useUpdateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      reminderId,
      trigger,
    }: {
      taskId: string;
      reminderId: string;
      trigger: Date;
    }) => {
      const oldTask = getTaskById(taskId);
      updateReminder(taskId, reminderId, trigger);
      const newTask = getTaskById(taskId);
      if (oldTask && newTask) {
        await db.logHistoryForTaskUpdate(newTask.uid, oldTask, { reminders: newTask.reminders });
      }
      return newTask;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (task?.uid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', task.uid] });
      }
    },
  });
};
