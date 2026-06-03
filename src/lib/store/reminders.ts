import { getTaskById, updateTask } from '$lib/store/tasks';
import type { Reminder } from '$types';
import { generateUUID } from '$utils/misc';

export const addReminder = (taskId: string, trigger: Date) => {
  const task = getTaskById(taskId);
  if (!task) return undefined;

  const reminder: Reminder = {
    id: generateUUID(),
    trigger,
  };

  return updateTask(taskId, {
    reminders: [...(task.reminders ?? []), reminder],
  });
};

export const removeReminder = (taskId: string, reminderId: string) => {
  const task = getTaskById(taskId);
  if (!task) return undefined;

  return updateTask(taskId, {
    reminders: (task.reminders ?? []).filter((r) => r.id !== reminderId),
  });
};

export const updateReminder = (taskId: string, reminderId: string, trigger: Date) => {
  const task = getTaskById(taskId);
  if (!task) return undefined;

  return updateTask(taskId, {
    reminders: (task.reminders ?? []).map((r) => (r.id === reminderId ? { ...r, trigger } : r)),
  });
};
