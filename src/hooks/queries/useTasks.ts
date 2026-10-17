/**
 * TanStack Query hooks for tasks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { settingsStore } from '$context/settingsContext';
import { requestSelectedTaskTitleAutofocus } from '$hooks/queries/useUIState';
import { db } from '$lib/database';
import { queryKeys } from '$lib/queryClient';
import { dataStore } from '$lib/store';
import { addReminder, removeReminder, updateReminder } from '$lib/store/reminders';
import { reorderTaskList, reorderTasks } from '$lib/store/reorder/tasks';
import {
  addTagToTask,
  type ChildTaskFilter,
  createTask,
  deleteTask,
  getAllTasks,
  getChildTasks,
  getFilteredTasks,
  getSortedTasks,
  getTaskById,
  permanentlyDeleteTask,
  removeTagFromTask,
  restoreTask,
  toggleTaskComplete,
  updateTask,
  updateTasks,
} from '$lib/store/tasks';
import { buildStatusUpdates, getTaskStatusAfterCompletionToggle } from '$lib/task/status';
import type { DataStore } from '$types/store/state';
import type { FlattenedTask } from '$types/store/tasks';
import type { TaskCreationOptions } from '$types/task/creation';
import type { Task } from '$types/task/model';

const dateTime = (date: Date | undefined) => date?.getTime();

const selectFilteredTaskDependencies = (data: DataStore) =>
  [
    data.tasks,
    data.filters,
    data.ui.activeView,
    data.ui.activeAccountId,
    data.ui.activeCalendarId,
    data.ui.activeTagId,
    data.ui.activeFilterId,
    data.ui.searchQuery,
    data.ui.showCompletedTasks,
    data.ui.showUnstartedTasks,
  ] as const;

const equalDependencies = (
  previous: ReturnType<typeof selectFilteredTaskDependencies>,
  next: ReturnType<typeof selectFilteredTaskDependencies>,
) => previous.every((value, index) => Object.is(value, next[index]));

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
    queryKey: queryKeys.tasks.children(parentUid, filter),
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
    return dataStore.subscribe(
      () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
      (data) => data.tasks,
    );
  }, [queryClient]);

  return useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: () => getAllTasks(),
    initialData: getAllTasks,
    staleTime: Infinity, // Data is managed by our data layer
  });
};

/**
 * hook to get filtered tasks based on current UI state
 */
export const useFilteredTasks = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return dataStore.subscribe(
      () => queryClient.invalidateQueries({ queryKey: queryKeys.filteredTasks }),
      selectFilteredTaskDependencies,
      equalDependencies,
    );
  }, [queryClient]);

  return useQuery({
    queryKey: queryKeys.filteredTasks,
    queryFn: () => getFilteredTasks(),
    staleTime: Infinity,
  });
};

/**
 * hook to create a task
 */
export const useCreateTask = (
  historyField: 'created' | 'imported' = 'created',
  creationOptions: TaskCreationOptions = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskInput: Partial<Task>) => {
      const task = createTask(
        taskInput,
        creationOptions,
        creationOptions.selectCreatedTask
          ? (createdTask) => requestSelectedTaskTitleAutofocus(createdTask.id)
          : undefined,
      );
      await db.logTaskChange(task.uid, historyField, null, task.title);
      if (task.parentUid) {
        await db.logTaskChange(task.parentUid, 'subtask', null, task.title);
      }
      return task;
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (newTask?.uid) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taskHistory.byTask(newTask.uid) });
      }
      if (newTask?.parentUid) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.taskHistory.byTask(newTask.parentUid),
        });
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
        queryClient.invalidateQueries({ queryKey: queryKeys.taskHistory.byTask(updatedTask.uid) });
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
      const tasksById = new Map(getAllTasks().map((task) => [task.id, task]));
      const updatedTasks = await updateTasks(taskUpdates);
      const updatedTasksById = new Map(updatedTasks.map((task) => [task.id, task]));
      const historyUpdates = taskUpdates.flatMap(({ id, updates }) => {
        const oldTask = tasksById.get(id);
        const updatedTask = updatedTasksById.get(id);
        if (!oldTask || !updatedTask || updates.synced === true) return [];

        const appliedUpdates = Object.fromEntries(
          (Object.entries(updates) as Array<[keyof Task, Task[keyof Task]]>).filter(
            ([field, value]) => Object.is(updatedTask[field], value),
          ),
        ) as Partial<Task>;
        if (Object.keys(appliedUpdates).length === 0) return [];
        return [{ taskUid: oldTask.uid, oldTask, updates: appliedUpdates }];
      });

      await db.logHistoryForTaskUpdates(historyUpdates);

      return updatedTasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.filteredTasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.taskHistory.all });
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
        queryClient.invalidateQueries({
          queryKey: queryKeys.taskHistory.byTask(deletedTask.parentUid),
        });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.filteredTasks });
      if (task?.uid) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taskHistory.byTask(task.uid) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.filteredTasks });
      if (task?.parentUid) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taskHistory.byTask(task.parentUid) });
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
      const { completeInProcessTasks, syncStatusProgress } = settingsStore.getState();
      const completeInProcess = completeInProcessTasks;
      const newStatus = getTaskStatusAfterCompletionToggle(task.status, completeInProcess);
      toggleTaskComplete(id, completeInProcess);
      await db.logHistoryForTaskUpdate(
        task.uid,
        task,
        buildStatusUpdates(newStatus, task, new Date(), syncStatusProgress),
      );
      return task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (task?.uid) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taskHistory.byTask(task.uid) });
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
      queryClient.setQueryData<Task[]>(queryKeys.filteredTasks, reorderCachedTasks);
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
        queryClient.invalidateQueries({ queryKey: queryKeys.taskHistory.byTask(oldParentUid) });
      }
      if (newParentUid) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taskHistory.byTask(newParentUid) });
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
        queryClient.invalidateQueries({ queryKey: queryKeys.taskHistory.byTask(task.uid) });
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
        queryClient.invalidateQueries({ queryKey: queryKeys.taskHistory.byTask(task.uid) });
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
        queryClient.invalidateQueries({ queryKey: queryKeys.taskHistory.byTask(task.uid) });
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
        queryClient.invalidateQueries({ queryKey: queryKeys.taskHistory.byTask(task.uid) });
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
        queryClient.invalidateQueries({ queryKey: queryKeys.taskHistory.byTask(task.uid) });
      }
    },
  });
};
