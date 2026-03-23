/**
 * TanStack Query hooks for tasks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { logHistoryForTaskUpdate, logTaskChange } from '$lib/database';
import { queryKeys } from '$lib/queryClient';
import { subscribeToDataChanges } from '$lib/store';
import { getFilteredTasks, getSortedTasks } from '$lib/store/filters';
import { addReminder, removeReminder, updateReminder } from '$lib/store/reminders';
import { reorderTasks } from '$lib/store/reorder';
import {
  addSubtask,
  deleteSubtask,
  toggleSubtaskComplete,
  updateSubtask,
} from '$lib/store/subtasks';
import {
  addTagToTask,
  countChildren,
  createTask,
  deleteTask,
  exportTaskAndChildren,
  getAllDescendants,
  getAllTasks,
  getChildTasks,
  getTaskById,
  getTasksByCalendar,
  removeTagFromTask,
  setTaskParent,
  toggleTaskCollapsed,
  toggleTaskComplete,
  updateTask,
} from '$lib/store/tasks';
import type { SortConfig, Task } from '$types/index';
import type { FlattenedTask } from '$utils/tree';

/**
 * Hook to get sorted children of a task, reactive to any task store changes.
 * Uses a queryKey under queryKeys.tasks.all so it is invalidated alongside other task queries.
 */
export const useChildTasks = (parentUid: string) => {
  return useQuery({
    queryKey: [...queryKeys.tasks.all, 'children', parentUid] as const,
    queryFn: () => getSortedTasks(getChildTasks(parentUid)),
    staleTime: Infinity,
  });
};

/**
 * Hook to get all tasks
 */
export const useTasks = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToDataChanges(() => {
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
 * Hook to get filtered tasks based on current UI state
 */
export const useFilteredTasks = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToDataChanges(() => {
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
 * Hook to get sorted tasks
 */
export const useSortedTasks = (tasks: Task[], sortConfig?: SortConfig) => {
  return useQuery({
    queryKey: ['sortedTasks', tasks.map((t) => t.id), sortConfig],
    queryFn: () => getSortedTasks(tasks, sortConfig),
    staleTime: Infinity,
  });
};

/**
 * Hook to get a single task by ID
 */
export const useTask = (id: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToDataChanges(() => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byId(id) });
      }
    });
  }, [queryClient, id]);

  return useQuery({
    queryKey: queryKeys.tasks.byId(id || ''),
    queryFn: () => (id ? getTaskById(id) : undefined),
    enabled: !!id,
    staleTime: Infinity,
  });
};

/**
 * Hook to get tasks by calendar
 */
export const useTasksByCalendar = (calendarId: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToDataChanges(() => {
      if (calendarId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byCalendar(calendarId) });
      }
    });
  }, [queryClient, calendarId]);

  return useQuery({
    queryKey: queryKeys.tasks.byCalendar(calendarId || ''),
    queryFn: () => (calendarId ? getTasksByCalendar(calendarId) : []),
    enabled: !!calendarId,
    staleTime: Infinity,
  });
};


/**
 * Hook to create a task
 */
export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskInput: Partial<Task>) => {
      const task = createTask(taskInput);
      await logTaskChange(task.uid, 'created', null, task.title);
      return task;
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (newTask?.uid) {
        queryClient.invalidateQueries({ queryKey: ['taskHistory', newTask.uid] });
      }
    },
  });
};

/**
 * Hook to update a task
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const oldTask = getTaskById(id);
      const result = updateTask(id, updates);
      if (result && oldTask && updates.synced !== true) {
        await logHistoryForTaskUpdate(result.uid, oldTask, updates);
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
 * Hook to delete a task
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, deleteChildren = true }: { id: string; deleteChildren?: boolean }) => {
      deleteTask(id, deleteChildren);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

/**
 * Hook to toggle task completion
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
      await logHistoryForTaskUpdate(task.uid, task, {
        status: newStatus,
        percentComplete: newStatus === 'completed' ? 100 : 0,
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
 * Hook to toggle task collapsed state
 */
export const useToggleTaskCollapsed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      toggleTaskCollapsed(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

/**
 * Hook to set task parent
 */
export const useSetTaskParent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, parentUid }: { taskId: string; parentUid: string | undefined }) => {
      setTaskParent(taskId, parentUid);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

/**
 * Hook to reorder tasks
 */
export const useReorderTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
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
      reorderTasks(activeId, overId, flattenedItems, targetIndent);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

export const useAddSubtask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) => addSubtask(taskId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

export const useUpdateSubtask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      subtaskId,
      updates,
    }: {
      taskId: string;
      subtaskId: string;
      updates: { title?: string; completed?: boolean };
    }) => {
      updateSubtask(taskId, subtaskId, updates);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

export const useDeleteSubtask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) => {
      deleteSubtask(taskId, subtaskId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

export const useToggleSubtaskComplete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) => {
      toggleSubtaskComplete(taskId, subtaskId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

export const useAddTagToTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) => {
      addTagToTask(taskId, tagId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

export const useRemoveTagFromTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) => {
      removeTagFromTask(taskId, tagId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

export const useAddReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, trigger }: { taskId: string; trigger: Date }) => {
      addReminder(taskId, trigger);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

export const useRemoveReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, reminderId }: { taskId: string; reminderId: string }) => {
      removeReminder(taskId, reminderId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

export const useUpdateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      reminderId,
      trigger,
    }: {
      taskId: string;
      reminderId: string;
      trigger: Date;
    }) => {
      updateReminder(taskId, reminderId, trigger);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

/**
 * Hook to count children of a task
 */
export const useCountChildren = (parentUid: string | undefined) => {
  return useQuery({
    queryKey: ['countChildren', parentUid || ''],
    queryFn: () => (parentUid ? countChildren(parentUid) : 0),
    enabled: !!parentUid,
    staleTime: Infinity,
  });
};

/**
 * Hook to get all descendants
 */
export const useAllDescendants = (parentUid: string | undefined) => {
  return useQuery({
    queryKey: ['allDescendants', parentUid || ''],
    queryFn: () => (parentUid ? getAllDescendants(parentUid) : []),
    enabled: !!parentUid,
    staleTime: Infinity,
  });
};

/**
 * Hook to export task and children
 */
export const useExportTaskAndChildren = (taskId: string | null) => {
  return useQuery({
    queryKey: ['exportTask', taskId || ''],
    queryFn: () => (taskId ? exportTaskAndChildren(taskId) : null),
    enabled: !!taskId,
    staleTime: Infinity,
  });
};
