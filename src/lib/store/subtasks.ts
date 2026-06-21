import { settingsStore } from '$context/settingsContext';
import { db } from '$lib/database';
import type { Task } from '$types';
import { generateUUID } from '$utils/misc';

/**
 * add a subtask by creating a new child Task
 */
export const addSubtask = async (parentTaskId: string, title: string) => {
  const parentTask = await db.getTaskById(parentTaskId);
  if (!parentTask) {
    throw new Error('Parent task not found');
  }

  const { defaultPriority } = settingsStore.getState();

  const now = new Date();
  const childTask: Partial<Task> = {
    uid: generateUUID(),
    parentUid: parentTask.uid,
    title,
    description: '',
    status: 'needs-action',
    completed: false,
    priority: defaultPriority,
    sortOrder: 0,
    createdAt: now,
    modifiedAt: now,
    accountId: parentTask.accountId,
    calendarId: parentTask.calendarId,
    synced: false,
  };

  await db.createTask(childTask);

  // mark parent as modified
  await db.updateTask(parentTaskId, {
    modifiedAt: now,
    synced: false,
  });
};

/**
 * update a subtask (child task)
 */
export const updateSubtask = async (
  taskId: string,
  subtaskId: string,
  updates: { title?: string; completed?: boolean },
) => {
  const now = new Date();
  await db.updateTask(subtaskId, {
    ...updates,
    modifiedAt: now,
    synced: false,
  });

  // mark parent as modified
  await db.updateTask(taskId, {
    modifiedAt: now,
    synced: false,
  });
};

/**
 * delete a subtask (child task)
 */
export const deleteSubtask = async (taskId: string, subtaskId: string) => {
  await db.deleteTask(subtaskId, true); // Delete the child task and its children

  // mark parent as modified
  const now = new Date();
  await db.updateTask(taskId, {
    modifiedAt: now,
    synced: false,
  });
};

/**
 * toggle subtask completion status
 */
export const toggleSubtaskComplete = async (taskId: string, subtaskId: string) => {
  const subtask = await db.getTaskById(subtaskId);
  if (!subtask) return;

  const now = new Date();

  const newStatus =
    subtask.status === 'completed'
      ? 'needs-action'
      : subtask.status === 'cancelled' || subtask.status === 'in-process'
        ? 'needs-action'
        : 'completed';

  await db.updateTask(subtaskId, {
    status: newStatus,
    completed: newStatus === 'completed',
    completedAt: newStatus === 'completed' ? now : undefined,
    modifiedAt: now,
    synced: false,
  });

  // mark parent as modified
  await db.updateTask(taskId, {
    modifiedAt: now,
    synced: false,
  });
};
