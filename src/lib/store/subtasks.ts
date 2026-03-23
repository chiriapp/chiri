/**
 * Subtask operations
 */

import {
  createTask as dbCreateTask,
  deleteTask as dbDeleteTask,
  updateTask as dbUpdateTask,
  getTaskById,
} from '$lib/database';
import type { Task } from '$types/index';
import { generateUUID } from '$utils/misc';

/**
 * Add a subtask by creating a new child Task
 */
export const addSubtask = async (parentTaskId: string, title: string) => {
  const parentTask = await getTaskById(parentTaskId);
  if (!parentTask) {
    throw new Error('Parent task not found');
  }

  const now = new Date();
  const childTask: Partial<Task> = {
    uid: generateUUID(),
    parentUid: parentTask.uid,
    title,
    description: '',
    status: 'needs-action',
    completed: false,
    priority: 'none',
    sortOrder: 0,
    createdAt: now,
    modifiedAt: now,
    accountId: parentTask.accountId,
    calendarId: parentTask.calendarId,
    synced: false,
  };

  await dbCreateTask(childTask);

  // Mark parent as modified
  await dbUpdateTask(parentTaskId, {
    modifiedAt: now,
    synced: false,
  });
};

/**
 * Update a subtask (child task)
 */
export const updateSubtask = async (
  taskId: string,
  subtaskId: string,
  updates: { title?: string; completed?: boolean },
) => {
  const now = new Date();
  await dbUpdateTask(subtaskId, {
    ...updates,
    modifiedAt: now,
    synced: false,
  });

  // Mark parent as modified
  await dbUpdateTask(taskId, {
    modifiedAt: now,
    synced: false,
  });
};

/**
 * Delete a subtask (child task)
 */
export const deleteSubtask = async (taskId: string, subtaskId: string) => {
  await dbDeleteTask(subtaskId, true); // Delete the child task and its children

  // Mark parent as modified
  const now = new Date();
  await dbUpdateTask(taskId, {
    modifiedAt: now,
    synced: false,
  });
};

/**
 * Toggle subtask completion status
 */
export const toggleSubtaskComplete = async (taskId: string, subtaskId: string) => {
  const subtask = await getTaskById(subtaskId);
  if (!subtask) return;

  const now = new Date();

  const newStatus =
    subtask.status === 'completed'
      ? 'needs-action'
      : subtask.status === 'cancelled' || subtask.status === 'in-process'
        ? 'needs-action'
        : 'completed';

  await dbUpdateTask(subtaskId, {
    status: newStatus,
    completed: newStatus === 'completed',
    completedAt: newStatus === 'completed' ? now : undefined,
    modifiedAt: now,
    synced: false,
  });

  // Mark parent as modified
  await dbUpdateTask(taskId, {
    modifiedAt: now,
    synced: false,
  });
};
