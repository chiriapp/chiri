/**
 * Task operations - CRUD and manipulation
 */

import { settingsStore } from '$context/settingsContext';
import * as db from '$lib/database';
import { loggers } from '$lib/logger';
import { getIsInitialized, loadDataStore, saveDataStore } from '$lib/store';
import type { Task } from '$types/index';
import { toAppleEpoch } from '$utils/ical';
import { generateUUID } from '$utils/misc';

const log = loggers.dataStore;

// Task getters
export const getAllTasks = () => {
  return loadDataStore().tasks;
};

export const getTaskById = (id: string) => {
  return loadDataStore().tasks.find((t) => t.id === id);
};

export const getTaskByUid = (uid: string) => {
  return loadDataStore().tasks.find((t) => t.uid === uid);
};

export const getTasksByCalendar = (calendarId: string) => {
  return loadDataStore().tasks.filter((t) => t.calendarId === calendarId);
};

// Alias for getTasksByCalendar (for compatibility)
export const getCalendarTasks = (calendarId: string) => {
  return getTasksByCalendar(calendarId);
};

export const getTasksByTag = (tagId: string) => {
  return loadDataStore().tasks.filter((t) => (t.tags ?? []).includes(tagId));
};

export const getChildTasks = (parentUid: string) => {
  return loadDataStore().tasks.filter((t) => t.parentUid === parentUid);
};

export const countChildren = (parentUid: string): number => {
  return loadDataStore().tasks.filter((t) => t.parentUid === parentUid).length;
};

export const getAllDescendants = (parentUid: string) => {
  const tasks = loadDataStore().tasks;

  const getDescendants = (uid: string): Task[] => {
    const children = tasks.filter((t) => t.parentUid === uid);
    return [...children, ...children.flatMap((child) => getDescendants(child.uid))];
  };

  return getDescendants(parentUid);
};

// Task create
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity is acceptable. it'd be hard to reduce this even further
export const createTask = (taskData: Partial<Task>) => {
  const data = loadDataStore();
  const now = new Date();

  // Get default calendar and task defaults from settings
  const { defaultCalendarId, defaultPriority, defaultTags } = settingsStore.getState();

  // Determine calendar and account to use
  let calendarId = taskData.calendarId ?? data.ui.activeCalendarId;
  let accountId = taskData.accountId ?? data.ui.activeAccountId;

  // If viewing a tag, include that tag in the new task
  let tags = taskData.tags ?? [];
  if (data.ui.activeTagId && !tags.includes(data.ui.activeTagId)) {
    tags = [data.ui.activeTagId, ...tags];
  }
  // Add default tags if no tags provided
  if (tags.length === 0 && defaultTags.length > 0) {
    tags = [...defaultTags];
  }

  // If no active calendar (All Tasks view), use default or first available
  if (!calendarId && data.accounts.length > 0) {
    if (defaultCalendarId) {
      // Find the calendar and its account
      for (const account of data.accounts) {
        const calendar = account.calendars.find((c) => c.id === defaultCalendarId);
        if (calendar) {
          calendarId = calendar.id;
          accountId = account.id;
          break;
        }
      }
    }

    // Fallback to first available calendar if default not found
    if (!calendarId) {
      const firstAccount = data.accounts.find((a) => a.calendars.length > 0);
      if (firstAccount) {
        calendarId = firstAccount.calendars[0].id;
        accountId = firstAccount.id;
      }
    }
  }

  // Determine if this is a local-only task (no calendar/account assigned)
  const isLocalOnly = !calendarId || !accountId;

  // Calculate sort order using Apple epoch format
  const maxSortOrder =
    data.tasks.length > 0
      ? Math.max(...data.tasks.map((t) => t.sortOrder))
      : toAppleEpoch(now.getTime()) - 1;

  const task: Task = {
    id: generateUUID(),
    uid: generateUUID(),
    title: taskData.title ?? 'New Task',
    description: taskData.description ?? '',
    completed: false,
    priority: taskData.priority ?? defaultPriority,
    sortOrder: maxSortOrder + 1,
    accountId: accountId ?? '',
    calendarId: calendarId ?? taskData.calendarId ?? data.ui.activeCalendarId ?? '',
    synced: false,
    createdAt: now,
    modifiedAt: now,
    localOnly: isLocalOnly,
    ...taskData,
    // Apply tags after spread to ensure activeTagId is included
    tags,
  } satisfies Task;

  saveDataStore({
    ...data,
    tasks: [...data.tasks, task],
  });

  // Persist to SQLite (including local-only tasks)
  if (getIsInitialized()) {
    db.createTask(task).catch((e) => log.error('Failed to sync task to database:', e));
  }

  return task;
};

// Task update
export const updateTask = (id: string, updates: Partial<Task>) => {
  const data = loadDataStore();
  let updatedTask: Task | undefined;

  const tasks = data.tasks.map((task) => {
    if (task.id === id) {
      updatedTask = {
        ...task,
        ...updates,
        // Only update modifiedAt if not provided in updates (local changes)
        modifiedAt: updates.modifiedAt !== undefined ? updates.modifiedAt : new Date(),
        // Only mark as unsynced if synced is not explicitly set in updates
        synced: updates.synced !== undefined ? updates.synced : false,
      };
      return updatedTask;
    }
    return task;
  });

  // Persist to SQLite
  if (updatedTask) {
    db.updateTask(id, updatedTask).catch((e) => log.error('Failed to persist task update:', e));
  }

  saveDataStore({ ...data, tasks });
  return updatedTask;
};

// Task delete
export const deleteTask = (id: string, deleteChildren: boolean = true) => {
  const data = loadDataStore();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return;

  // Persist to SQLite
  db.deleteTask(id, deleteChildren).catch((e) => log.error('Failed to persist task deletion:', e));

  // Get all descendants recursively
  const getAllDescendantIds = (parentUid: string): string[] => {
    const children = data.tasks.filter((t) => t.parentUid === parentUid);
    const childIds = children.map((c) => c.id);
    const descendantIds = children.flatMap((c) => getAllDescendantIds(c.uid));
    return [...childIds, ...descendantIds];
  };

  const descendantIds = getAllDescendantIds(task.uid);
  const tasksToDelete = deleteChildren ? [id, ...descendantIds] : [id];

  // Collect all tasks that need to be tracked for server deletion
  const tasksWithHref = data.tasks.filter((t) => tasksToDelete.includes(t.id) && t.href);

  const newPendingDeletions = [
    ...data.pendingDeletions,
    ...tasksWithHref.map((t) => ({
      uid: t.uid,
      href: t.href!,
      accountId: t.accountId,
      calendarId: t.calendarId,
    })),
  ];

  // If not deleting children, orphan them (move to root level)
  let updatedTasks = data.tasks;
  if (!deleteChildren) {
    updatedTasks = updatedTasks.map((t) =>
      t.parentUid === task.uid
        ? { ...t, parentUid: undefined, modifiedAt: new Date(), synced: false }
        : t,
    );
  }

  saveDataStore({
    ...data,
    tasks: updatedTasks.filter((t) => !tasksToDelete.includes(t.id)),
    pendingDeletions: newPendingDeletions,
    ui: {
      ...data.ui,
      selectedTaskId: tasksToDelete.includes(data.ui.selectedTaskId ?? '')
        ? null
        : data.ui.selectedTaskId,
    },
  });
};

// Task toggles
export const toggleTaskComplete = (id: string) => {
  const data = loadDataStore();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return;

  const updates = {
    completed: !task.completed,
    completedAt: !task.completed ? new Date() : undefined,
    modifiedAt: new Date(),
    synced: false,
  };

  // Persist to SQLite
  db.updateTask(id, updates).catch((e) => log.error('Failed to persist task toggle:', e));

  const tasks = data.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
  saveDataStore({ ...data, tasks });
};

export const toggleTaskCollapsed = (id: string) => {
  const data = loadDataStore();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return;

  const updates = {
    isCollapsed: !task.isCollapsed,
    modifiedAt: new Date(),
    synced: false,
  };

  // Persist to SQLite
  db.updateTask(id, updates).catch((e) => log.error('Failed to persist task collapse:', e));

  const tasks = data.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
  saveDataStore({ ...data, tasks });
};

// Task tags
export const addTagToTask = (taskId: string, tagId: string) => {
  const data = loadDataStore();
  const tasks = data.tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          tags: [...(task.tags || []).filter((t) => t !== tagId), tagId],
          modifiedAt: new Date(),
          synced: false,
        }
      : task,
  );
  saveDataStore({ ...data, tasks });
};

export const removeTagFromTask = (taskId: string, tagId: string) => {
  const data = loadDataStore();
  const tasks = data.tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          tags: (task.tags || []).filter((t) => t !== tagId),
          modifiedAt: new Date(),
          synced: false,
        }
      : task,
  );
  saveDataStore({ ...data, tasks });
};

// Task hierarchy
export const setTaskParent = (taskId: string, parentUid: string | undefined) => {
  const data = loadDataStore();
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) return;

  // Prevent circular references
  if (parentUid) {
    const isDescendant = (checkUid: string): boolean => {
      const parent = data.tasks.find((t) => t.uid === checkUid);
      if (!parent) return false;
      if (parent.id === taskId) return true;
      return parent.parentUid ? isDescendant(parent.parentUid) : false;
    };
    if (isDescendant(parentUid)) return;
  }

  // Calculate new sort order based on siblings
  let newSortOrder = task.sortOrder;
  if (parentUid) {
    const siblings = data.tasks.filter((t) => t.parentUid === parentUid);
    if (siblings.length > 0) {
      newSortOrder = Math.max(...siblings.map((t) => t.sortOrder)) + 1;
    }
  }

  // If setting a parent, inherit the parent's calendar if different
  let inheritedCalendarId: string | undefined;
  let inheritedAccountId: string | undefined;

  if (parentUid) {
    const parentTask = data.tasks.find((t) => t.uid === parentUid);
    if (parentTask && parentTask.calendarId !== task.calendarId) {
      inheritedCalendarId = parentTask.calendarId;
      inheritedAccountId = parentTask.accountId;
    }
  }

  // Get all descendants to also update their calendar
  const descendantIds = inheritedCalendarId ? getAllDescendants(task.uid).map((t) => t.id) : [];

  const tasks = data.tasks.map((t) => {
    if (t.id === taskId) {
      return {
        ...t,
        parentUid,
        sortOrder: newSortOrder,
        ...(inheritedCalendarId && { calendarId: inheritedCalendarId }),
        ...(inheritedAccountId && { accountId: inheritedAccountId }),
        modifiedAt: new Date(),
        synced: false,
      };
    }
    // Also update descendants' calendar
    if (inheritedCalendarId && inheritedAccountId && descendantIds.includes(t.id)) {
      return {
        ...t,
        calendarId: inheritedCalendarId,
        accountId: inheritedAccountId,
        modifiedAt: new Date(),
        synced: false,
      };
    }
    return t;
  });

  saveDataStore({ ...data, tasks });
};

// Export helpers
export const exportTaskAndChildren = (
  taskId: string,
): { task: Task; descendants: Task[] } | null => {
  const data = loadDataStore();
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  return { task, descendants: getAllDescendants(task.uid) };
};
