import { addDays, format, setHours, startOfDay, subDays, subHours, subMinutes } from 'date-fns';
import { settingsStore } from '$context/settingsContext';
import { toastManager } from '$hooks/ui/useToast';
import { db } from '$lib/database';
import { toAppleEpoch } from '$lib/ical/vtodo';
import { loggers } from '$lib/logger';
import { dataStore } from '$lib/store';
import type { DefaultDateOffset, DefaultReminderOffset, Reminder, Task } from '$types';
import { generateUUID } from '$utils/misc';
import { getNextOccurrence, parseRRule } from '$utils/recurrence';

const resolveReminderOffsets = (
  offsets: DefaultReminderOffset[],
  due: { date: Date; allDay: boolean },
): Reminder[] => {
  // Base time: 9am on the due date for all-day, or the exact due datetime otherwise
  const allDayHour = settingsStore.getState().defaultAllDayReminderHour ?? 9;
  const base = due.allDay ? setHours(startOfDay(due.date), allDayHour) : due.date;
  return offsets.map((offset) => {
    let trigger: Date;
    if (offset === 'at-due') trigger = base;
    else if (offset === '5min-before-due') trigger = subMinutes(base, 5);
    else if (offset === '15min-before-due') trigger = subMinutes(base, 15);
    else if (offset === '30min-before-due') trigger = subMinutes(base, 30);
    else if (offset === '1hr-before-due') trigger = subHours(base, 1);
    else if (offset === '2hr-before-due') trigger = subHours(base, 2);
    else if (offset === '1day-before-due')
      trigger = setHours(subDays(startOfDay(due.date), 1), allDayHour);
    else if (offset === '2days-before-due')
      trigger = setHours(subDays(startOfDay(due.date), 2), allDayHour);
    else trigger = setHours(subDays(startOfDay(due.date), 7), allDayHour); // '1week-before-due'
    return { id: generateUUID(), trigger };
  });
};

const resolveDateOffset = (
  offset: DefaultDateOffset,
  dueDate?: Date,
): { date: Date | undefined; allDay: boolean } => {
  const today = startOfDay(new Date());
  if (offset === 'today') return { date: today, allDay: true };
  if (offset === 'tomorrow') return { date: addDays(today, 1), allDay: true };
  if (offset === '1week') return { date: addDays(today, 7), allDay: true };
  if (offset === '2weeks') return { date: addDays(today, 14), allDay: true };
  if (dueDate !== undefined) {
    if (offset === 'due-date') return { date: startOfDay(dueDate), allDay: true };
    if (offset === 'due-time') return { date: dueDate, allDay: false };
    if (offset === '1day-before-due')
      return { date: subDays(startOfDay(dueDate), 1), allDay: true };
    if (offset === '1week-before-due')
      return { date: subDays(startOfDay(dueDate), 7), allDay: true };
  }
  return { date: undefined, allDay: true };
};

const log = loggers.dataStore;

// Helper: resolve tags including active tag and defaults
const resolveTaskTags = (
  providedTags: string[] | undefined,
  activeTagId: string | null,
  defaultTags: string[],
): string[] => {
  let tags = providedTags ?? [];
  if (activeTagId && !tags.includes(activeTagId)) {
    tags = [activeTagId, ...tags];
  }
  if (tags.length === 0 && defaultTags.length > 0) {
    tags = [...defaultTags];
  }
  return tags;
};

// Helper: find calendar and account to use for new task
const resolveCalendarAndAccount = (
  taskCalendarId: string | undefined,
  taskAccountId: string | undefined,
  uiActiveCalendarId: string | null,
  uiActiveAccountId: string | null,
  accounts: Array<{ id: string; calendars: Array<{ id: string }> }>,
  defaultCalendarId: string | null | undefined,
): { calendarId: string | undefined; accountId: string | undefined } => {
  let calendarId = taskCalendarId ?? uiActiveCalendarId ?? undefined;
  let accountId = taskAccountId ?? uiActiveAccountId ?? undefined;

  if (!calendarId && accounts.length > 0) {
    // Try default calendar first
    if (defaultCalendarId) {
      for (const account of accounts) {
        const calendar = account.calendars.find((c) => c.id === defaultCalendarId);
        if (calendar) {
          calendarId = calendar.id;
          accountId = account.id;
          break;
        }
      }
    }
    // Fallback to first available
    if (!calendarId) {
      const firstAccount = accounts.find((a) => a.calendars.length > 0);
      if (firstAccount) {
        calendarId = firstAccount.calendars[0].id;
        accountId = firstAccount.id;
      }
    }
  }

  return { calendarId, accountId };
};

// Helper: handle recurring task completion (advance to next occurrence)
const handleRecurringTaskCompletion = (
  task: Task,
  data: ReturnType<typeof dataStore.load>,
): boolean => {
  const rruleParts = parseRRule(task.rrule!);
  const count = rruleParts.COUNT ? parseInt(rruleParts.COUNT, 10) : undefined;

  // If COUNT=1 this is the last instance — fall through to normal completion
  if (count === 1) return false;

  const now = new Date();
  const baseDate = task.repeatFrom === 1 ? now : task.dueDate ? new Date(task.dueDate) : now;
  const next = getNextOccurrence(
    task.rrule!,
    baseDate,
    task.dueDate ? new Date(task.dueDate) : undefined,
  );

  if (!next) return false;

  // Build an updated RRULE with COUNT decremented if applicable
  let updatedRrule = task.rrule!;
  if (count !== undefined && count > 1) {
    updatedRrule = task.rrule!.replace(/COUNT=\d+/, `COUNT=${count - 1}`);
  }

  const dueDelta = next.getTime() - new Date(task.dueDate ?? next).getTime();

  const advances: Partial<Task> = {
    dueDate: next,
    dueDateAllDay: task.dueDateAllDay,
    startDate: task.startDate ? new Date(new Date(task.startDate).getTime() + dueDelta) : undefined,
    reminders:
      task.reminders && task.reminders.length > 0
        ? task.reminders.map((r) => ({
            ...r,
            trigger: new Date(new Date(r.trigger).getTime() + dueDelta),
          }))
        : task.reminders,
    status: 'needs-action',
    completed: false,
    completedAt: undefined,
    percentComplete: 0,
    rrule: updatedRrule,
    modifiedAt: now,
    synced: false,
  };

  db.updateTask(task.id, advances).catch((e) =>
    log.error('Failed to persist recurring task advance:', e),
  );
  const tasks = data.tasks.map((t) => (t.id === task.id ? { ...t, ...advances } : t));
  dataStore.save({ ...data, tasks });

  const dateStr = task.dueDateAllDay
    ? format(next, 'MMM d, yyyy')
    : format(next, "MMM d, yyyy 'at' h:mm a");
  toastManager.success('Task rescheduled', dateStr);
  return true;
};

// Task getters
export const getAllTasks = () => {
  return dataStore.load().tasks;
};

export const getTaskById = (id: string) => {
  return dataStore.load().tasks.find((t) => t.id === id);
};

export const getTaskByUid = (uid: string) => {
  return dataStore.load().tasks.find((t) => t.uid === uid);
};

export const getTasksByCalendar = (calendarId: string) => {
  return dataStore.load().tasks.filter((t) => t.calendarId === calendarId);
};

export const getTasksByTag = (tagId: string) => {
  return dataStore.load().tasks.filter((t) => (t.tags ?? []).includes(tagId));
};

export const getChildTasks = (parentUid: string) => {
  return dataStore.load().tasks.filter((t) => t.parentUid === parentUid);
};

export const countChildren = (parentUid: string) => {
  return dataStore.load().tasks.filter((t) => t.parentUid === parentUid).length;
};

export const getAllDescendants = (parentUid: string) => {
  const tasks = dataStore.load().tasks;

  const getDescendants = (uid: string): Task[] => {
    const children = tasks.filter((t) => t.parentUid === uid);
    return [...children, ...children.flatMap((child) => getDescendants(child.uid))];
  };

  return getDescendants(parentUid);
};

// Task create
export const createTask = (taskData: Partial<Task>) => {
  const data = dataStore.load();
  const now = new Date();

  // Get default calendar and task defaults from settings
  const {
    defaultCalendarId,
    defaultPriority,
    defaultStatus,
    defaultPercentComplete,
    defaultTags,
    defaultStartDate,
    defaultDueDate,
    defaultReminders,
    defaultRrule,
    defaultRepeatFrom,
  } = settingsStore.getState();

  // Resolve tags using helper
  const tags = resolveTaskTags(taskData.tags, data.ui.activeTagId, defaultTags);

  // Resolve calendar and account using helper
  const { calendarId, accountId } = resolveCalendarAndAccount(
    taskData.calendarId,
    taskData.accountId,
    data.ui.activeCalendarId,
    data.ui.activeAccountId,
    data.accounts,
    defaultCalendarId,
  );

  // Determine if this is a local-only task (no calendar/account assigned)
  const isLocalOnly = !calendarId || !accountId;

  // Calculate sort order using Apple epoch format
  const maxSortOrder =
    data.tasks.length > 0
      ? Math.max(...data.tasks.map((t) => t.sortOrder))
      : toAppleEpoch(now.getTime()) - 1;

  const due =
    taskData.dueDate !== undefined
      ? { date: taskData.dueDate, allDay: taskData.dueDateAllDay ?? true }
      : resolveDateOffset(defaultDueDate);
  const start =
    taskData.startDate !== undefined
      ? { date: taskData.startDate, allDay: taskData.startDateAllDay ?? true }
      : resolveDateOffset(defaultStartDate, due.date);

  const task: Task = {
    id: generateUUID(),
    uid: generateUUID(),
    title: taskData.title ?? 'New Task',
    description: taskData.description ?? '',
    status: taskData.status ?? defaultStatus,
    completed: (taskData.status ?? defaultStatus) === 'completed',
    percentComplete: taskData.percentComplete ?? defaultPercentComplete,
    priority: taskData.priority ?? defaultPriority,
    sortOrder: maxSortOrder + 1,
    accountId: accountId ?? '',
    calendarId: calendarId ?? taskData.calendarId ?? data.ui.activeCalendarId ?? '',
    synced: false,
    createdAt: now,
    modifiedAt: now,
    localOnly: isLocalOnly,
    startDate: start.date,
    startDateAllDay: start.date !== undefined ? start.allDay : undefined,
    dueDate: due.date,
    dueDateAllDay: due.date !== undefined ? due.allDay : undefined,
    rrule: taskData.rrule ?? defaultRrule,
    repeatFrom: taskData.repeatFrom ?? defaultRepeatFrom,
    ...taskData,
    // Apply tags and reminders after spread to ensure defaults are included
    tags,
    reminders:
      taskData.reminders ??
      (due.date !== undefined && defaultReminders.length > 0
        ? resolveReminderOffsets(defaultReminders, { date: due.date, allDay: due.allDay })
        : undefined),
  } satisfies Task;

  dataStore.save({
    ...data,
    tasks: [...data.tasks, task],
  });

  // Persist to SQLite including local-only tasks
  if (dataStore.getIsInitialized()) {
    db.createTask(task).catch((e) => log.error('Failed to sync task to database:', e));
  }

  return task;
};

// Task update
export const updateTask = (id: string, updates: Partial<Task>) => {
  const data = dataStore.load();
  let updatedTask: Task | undefined;

  // When a synced task is moved to a different calendar, queue deletion from the old
  // calendar URL and clear href/etag so the task is created fresh in the new calendar.
  // Simply PUTting to the old href keeps the task in the original calendar on the server.
  const existingTask = data.tasks.find((t) => t.id === id);
  let pendingDeletions = data.pendingDeletions;
  if (
    existingTask?.href &&
    updates.calendarId !== undefined &&
    updates.calendarId !== existingTask.calendarId
  ) {
    const deletion = {
      uid: existingTask.uid,
      href: existingTask.href,
      accountId: existingTask.accountId,
      calendarId: existingTask.calendarId,
    };
    pendingDeletions = [...pendingDeletions, deletion];
    db.addPendingDeletion(deletion).catch((e) =>
      log.error('Failed to persist pending deletion for calendar move:', e),
    );
    updates = { ...updates, href: undefined, etag: undefined };
  }

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

  if (updatedTask) {
    db.updateTask(id, updatedTask).catch((e) => log.error('Failed to persist task update:', e));
  }

  dataStore.save({ ...data, tasks, pendingDeletions });
  return updatedTask;
};

// Task delete
export const deleteTask = (id: string, deleteChildren: boolean = true) => {
  const data = dataStore.load();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return;

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

  dataStore.save({
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
  const data = dataStore.load();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return;

  const isCompleting = task.status !== 'completed';

  // Handle recurring task completion with helper
  if (isCompleting && task.rrule) {
    const handled = handleRecurringTaskCompletion(task, data);
    if (handled) return;
  }

  const newStatus =
    task.status === 'completed'
      ? 'needs-action'
      : task.status === 'cancelled' || task.status === 'in-process'
        ? 'needs-action'
        : 'completed';
  const updates = {
    status: newStatus as Task['status'],
    completed: newStatus === 'completed',
    completedAt: newStatus === 'completed' ? new Date() : undefined,
    percentComplete: newStatus === 'completed' ? 100 : 0,
    modifiedAt: new Date(),
    synced: false,
  };

  db.updateTask(id, updates).catch((e) => log.error('Failed to persist task toggle:', e));

  const tasks = data.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
  dataStore.save({ ...data, tasks });
};

export const toggleTaskCollapsed = (id: string) => {
  const data = dataStore.load();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return;

  const updates = {
    isCollapsed: !task.isCollapsed,
  };

  db.updateTask(id, updates).catch((e) => log.error('Failed to persist task collapse:', e));

  const tasks = data.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
  dataStore.save({ ...data, tasks });
};

// Task tags
export const addTagToTask = (taskId: string, tagId: string) => {
  const data = dataStore.load();
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
  dataStore.save({ ...data, tasks });
};

export const removeTagFromTask = (taskId: string, tagId: string) => {
  const data = dataStore.load();
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
  dataStore.save({ ...data, tasks });
};

// Task hierarchy
export const setTaskParent = (taskId: string, parentUid: string | undefined) => {
  const data = dataStore.load();
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

  dataStore.save({ ...data, tasks });
};

// Export helpers
export const exportTaskAndChildren = (taskId: string) => {
  const data = dataStore.load();
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  return { task, descendants: getAllDescendants(task.uid) };
};
