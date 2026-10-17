import { addDays, format, setHours, startOfDay, subDays, subHours, subMinutes } from 'date-fns';
import { settingsStore } from '$context/settingsContext';
import { db } from '$lib/database';
import { toAppleEpoch } from '$lib/ical/vtodo';
import { loggers } from '$lib/logger';
import { dataStore } from '$lib/store';
import { getFilterTaskCreationDefaults, resolveTaskTags } from '$lib/task/creation';
import { isExpiredRecentlyDeletedTask } from '$lib/task/deletion';
import { isCompletedTask, matchesFilter } from '$lib/task/filtering';
import { getNextOccurrence, parseRRule } from '$lib/task/recurrence';
import { sortTasks } from '$lib/task/sorting';
import {
  buildStatusUpdates,
  getNewTaskPercentComplete,
  getTaskStatusAfterCompletionToggle,
} from '$lib/task/status';
import { toastManager } from '$lib/toastManager';
import type { DefaultDateOffset, DefaultReminderOffset } from '$types/settings/categories/defaults';
import type { WorkingDay } from '$types/settings/categories/scheduling';
import type { SortConfig } from '$types/sort';
import type { TaskCreationOptions } from '$types/task/creation';
import type { Reminder, Task } from '$types/task/model';
import { getNextWorkingDay } from '$utils/calendar';
import { generateUUID } from '$utils/misc';

const resolveReminderOffsets = (
  offsets: DefaultReminderOffset[],
  due: { date: Date; allDay: boolean },
): Reminder[] => {
  // base time: 9am on the due date for all-day, or the exact due datetime otherwise
  const { allDayReminderNotificationsEnabled, defaultAllDayReminderHour } =
    settingsStore.getState();

  if (due.allDay && !allDayReminderNotificationsEnabled) {
    return [];
  }

  const allDayHour = defaultAllDayReminderHour ?? 9;
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
  dueDate: Date | undefined,
  workingDays: WorkingDay[],
): { date: Date | undefined; allDay: boolean } => {
  const today = startOfDay(new Date());
  if (offset === 'today') return { date: today, allDay: true };
  if (offset === 'tomorrow') return { date: addDays(today, 1), allDay: true };
  if (offset === 'next-working-day')
    return { date: getNextWorkingDay(today, workingDays), allDay: true };
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

const getActiveFilterTaskDefaults = (
  data: ReturnType<typeof dataStore.load>,
  options: TaskCreationOptions,
) => {
  if (options.source === 'remote' || options.source === 'import') return {};
  if (data.ui.activeView !== 'filter') return {};

  return getFilterTaskCreationDefaults(
    data.filters.find((filter) => filter.id === data.ui.activeFilterId),
  );
};

// helper: find calendar and account to use for new task
const resolveCalendarAndAccount = (
  taskCalendarId: string | undefined,
  taskAccountId: string | undefined,
  uiActiveCalendarId: string | null,
  uiActiveAccountId: string | null,
  accounts: Array<{ id: string; calendars: Array<{ id: string }> }>,
  defaultCalendarId: string | null | undefined,
) => {
  let calendarId = taskCalendarId ?? uiActiveCalendarId ?? undefined;
  let accountId = taskAccountId ?? uiActiveAccountId ?? undefined;

  if (!calendarId && accounts.length > 0) {
    // try default calendar first
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
    // fallback to first available
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

// helper: handle recurring task completion (advance to next occurrence)
const handleRecurringTaskCompletion = (task: Task, data: ReturnType<typeof dataStore.load>) => {
  const rruleParts = parseRRule(task.rrule!);
  const count = rruleParts.COUNT ? parseInt(rruleParts.COUNT, 10) : undefined;

  // if COUNT=1 this is the last instance, fall through to normal completion
  if (count === 1) return false;

  const now = new Date();
  const baseDate = task.repeatFrom === 1 ? now : task.dueDate ? new Date(task.dueDate) : now;
  const next = getNextOccurrence(
    task.rrule!,
    baseDate,
    task.dueDate ? new Date(task.dueDate) : undefined,
  );

  if (!next) return false;

  // build an updated RRULE with COUNT decremented if applicable
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

export type ChildTaskFilter = 'all' | 'active' | 'deleted';

const matchesChildTaskFilter = (task: Task, filter: ChildTaskFilter) => {
  if (filter === 'active') return !task.deletedAt;
  if (filter === 'deleted') return !!task.deletedAt;
  return true;
};

// task getters
export const getAllTasks = () => {
  return dataStore.load().tasks;
};

export const getDeletedTasks = () => {
  return dataStore.load().tasks.filter((t) => t.deletedAt);
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

export const getChildTasks = (parentUid: string, filter: ChildTaskFilter = 'all') => {
  return dataStore
    .load()
    .tasks.filter((t) => t.parentUid === parentUid && matchesChildTaskFilter(t, filter));
};

export const countChildren = (parentUid: string, filter: ChildTaskFilter = 'all') => {
  return getChildTasks(parentUid, filter).length;
};

export const getAllDescendants = (parentUid: string, filter: ChildTaskFilter = 'all') => {
  const tasks = dataStore.load().tasks;

  const getDescendants = (uid: string): Task[] => {
    const children = tasks.filter((t) => t.parentUid === uid && matchesChildTaskFilter(t, filter));
    return [...children, ...children.flatMap((child) => getDescendants(child.uid))];
  };

  return getDescendants(parentUid);
};

const getMaxSortOrder = (tasks: Task[], now: Date) => {
  if (tasks.length === 0) return toAppleEpoch(now.getTime()) - 1;
  return tasks.reduce((max, task) => Math.max(max, task.sortOrder), Number.NEGATIVE_INFINITY);
};

const buildTask = (
  taskData: Partial<Task>,
  options: TaskCreationOptions,
  data: ReturnType<typeof dataStore.load>,
  now: Date,
  maxSortOrder: number,
  onBeforePublish?: (task: Task) => void,
) => {
  const filterTaskDefaults = getActiveFilterTaskDefaults(data, options);

  // get default calendar and task defaults from settings
  const {
    defaultCalendarId,
    defaultPriority,
    defaultStatus,
    defaultPercentComplete,
    defaultTags,
    defaultStartDate,
    defaultStartTime,
    defaultDueDate,
    defaultDueTime,
    defaultReminders,
    defaultRrule,
    defaultRepeatFrom,
    workingDays,
  } = settingsStore.getState();

  const taskStatus = taskData.status ?? filterTaskDefaults.status ?? defaultStatus;
  const taskPriority = taskData.priority ?? filterTaskDefaults.priority ?? defaultPriority;

  // resolve tags using helper
  const tags = resolveTaskTags(taskData.tags, data.ui.activeTagId, defaultTags, options);

  // resolve calendar and account using helper
  const { calendarId, accountId } = resolveCalendarAndAccount(
    taskData.calendarId,
    taskData.accountId,
    data.ui.activeCalendarId,
    data.ui.activeAccountId,
    data.accounts,
    defaultCalendarId,
  );

  const targetAccount = accountId ? data.accounts.find((a) => a.id === accountId) : undefined;
  const isLocalOnly = !calendarId || !accountId || !targetAccount?.caldav;

  const due =
    taskData.dueDate !== undefined
      ? { date: taskData.dueDate, allDay: taskData.dueDateAllDay ?? true }
      : resolveDateOffset(filterTaskDefaults.dueDate ?? defaultDueDate, undefined, workingDays);
  if (due.date !== undefined && defaultDueTime != null && taskData.dueDate === undefined) {
    due.date = new Date(due.date);
    due.date.setHours(Math.floor(defaultDueTime / 60), defaultDueTime % 60, 0, 0);
    due.allDay = false;
  }
  const start =
    taskData.startDate !== undefined
      ? { date: taskData.startDate, allDay: taskData.startDateAllDay ?? true }
      : resolveDateOffset(filterTaskDefaults.startDate ?? defaultStartDate, due.date, workingDays);
  if (start.date !== undefined && defaultStartTime != null && taskData.startDate === undefined) {
    start.date = new Date(start.date);
    start.date.setHours(Math.floor(defaultStartTime / 60), defaultStartTime % 60, 0, 0);
    start.allDay = false;
  }
  const defaultResolvedReminders =
    due.date !== undefined && defaultReminders.length > 0
      ? resolveReminderOffsets(defaultReminders, { date: due.date, allDay: due.allDay })
      : undefined;

  const task: Task = {
    id: generateUUID(),
    uid: generateUUID(),
    title: taskData.title ?? 'New Task',
    description: taskData.description ?? '',
    status: taskStatus,
    completed: taskStatus === 'completed',
    percentComplete: getNewTaskPercentComplete(
      taskData.status,
      taskData.percentComplete,
      taskStatus,
      defaultPercentComplete,
      settingsStore.getState().syncStatusProgress,
    ),
    priority: taskPriority,
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
    // apply tags and reminders after spread to ensure defaults are included
    tags,
    reminders:
      taskData.reminders ??
      (defaultResolvedReminders && defaultResolvedReminders.length > 0
        ? defaultResolvedReminders
        : undefined),
  } satisfies Task;

  onBeforePublish?.(task);

  return task;
};

// task create
export const createTask = (
  taskData: Partial<Task>,
  options: TaskCreationOptions = {},
  onBeforePublish?: (task: Task) => void,
) => {
  const data = dataStore.load();
  const { selectCreatedTask = false, ...databaseCreationOptions } = options;
  const now = new Date();
  const task = buildTask(
    taskData,
    options,
    data,
    now,
    getMaxSortOrder(data.tasks, now),
    onBeforePublish,
  );

  dataStore.save({
    ...data,
    tasks: [...data.tasks, task],
    ...(selectCreatedTask
      ? {
          ui: {
            ...data.ui,
            selectedTaskId: task.id,
            isEditorOpen: true,
          },
        }
      : {}),
  });

  // persist to SQLite including local-only tasks
  if (dataStore.getIsInitialized()) {
    db.createTask(task, databaseCreationOptions).catch((e) =>
      log.error('Failed to sync task to database:', e),
    );
  }

  return task;
};

const rebaseTaskUpdate = (original: Task, current: Task, planned: Task) => {
  if (current === original) return planned;

  const unchangedFields = (Object.keys(planned) as Array<keyof Task>).filter(
    (field) =>
      Object.is(current[field], original[field]) && !Object.is(planned[field], original[field]),
  );
  return {
    ...current,
    ...Object.fromEntries(unchangedFields.map((field) => [field, planned[field]])),
  } as Task;
};

export const createTasks = async (
  taskDataList: Partial<Task>[],
  options: TaskCreationOptions = {},
) => {
  if (taskDataList.length === 0) return [];

  const data = dataStore.load();
  const { selectCreatedTask = false } = options;
  const now = new Date();
  let maxSortOrder = getMaxSortOrder(data.tasks, now);

  const tasks = taskDataList.map((taskData) => {
    const task = buildTask(taskData, options, data, now, maxSortOrder);
    if (typeof task.sortOrder === 'number') {
      maxSortOrder = Math.max(maxSortOrder, task.sortOrder);
    }
    return task;
  });

  if (dataStore.getIsInitialized()) {
    await db.createTasks(tasks, { notify: false });
  }

  const lastCreatedTask = tasks[tasks.length - 1];
  const latestData = dataStore.load();
  const existingTaskIds = new Set(latestData.tasks.map((task) => task.id));
  dataStore.save({
    ...latestData,
    tasks: [...latestData.tasks, ...tasks.filter((task) => !existingTaskIds.has(task.id))],
    ...(selectCreatedTask
      ? {
          ui: {
            ...latestData.ui,
            selectedTaskId: lastCreatedTask.id,
            isEditorOpen: true,
          },
        }
      : {}),
  });

  return tasks;
};

export const replaceTasksFromSync = async (replacements: Task[]) => {
  if (replacements.length === 0) return [];

  const data = dataStore.load();
  const originalTasksById = new Map(data.tasks.map((task) => [task.id, task]));
  const replacementsById = new Map(replacements.map((task) => [task.id, task]));

  if (dataStore.getIsInitialized()) {
    await db.upsertTasks(replacements, { notify: false });
  }

  const latestData = dataStore.load();
  const publishedReplacements: Task[] = [];
  const concurrentlyEditedTasks: Task[] = [];
  const tasks = latestData.tasks.map((currentTask) => {
    const originalTask = originalTasksById.get(currentTask.id);
    const replacement = replacementsById.get(currentTask.id);
    if (!originalTask || !replacement) return currentTask;

    const rebasedTask = rebaseTaskUpdate(originalTask, currentTask, replacement);
    publishedReplacements.push(rebasedTask);
    if (currentTask !== originalTask) concurrentlyEditedTasks.push(rebasedTask);
    return rebasedTask;
  });

  dataStore.save({
    ...latestData,
    tasks,
  });

  if (dataStore.getIsInitialized() && concurrentlyEditedTasks.length > 0) {
    await db.upsertTasks(concurrentlyEditedTasks, { notify: false });
  }

  return publishedReplacements;
};

export interface TaskUpdate {
  id: string;
  updates: Partial<Task>;
}

const mergePendingDeletions = (
  existing: ReturnType<typeof dataStore.load>['pendingDeletions'],
  additions: ReturnType<typeof dataStore.load>['pendingDeletions'],
) => {
  const keys = new Set(
    existing.map(
      (deletion) => `${deletion.accountId}\u0000${deletion.calendarId}\u0000${deletion.href}`,
    ),
  );
  return [
    ...existing,
    ...additions.filter((deletion) => {
      const key = `${deletion.accountId}\u0000${deletion.calendarId}\u0000${deletion.href}`;
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    }),
  ];
};

export const updateTasks = async (taskUpdates: TaskUpdate[]) => {
  if (taskUpdates.length === 0) return [];

  const data = dataStore.load();
  const updatesById = new Map(taskUpdates.map(({ id, updates }) => [id, updates]));
  const updatedTasks: Task[] = [];
  const newPendingDeletions: typeof data.pendingDeletions = [];
  const modifiedAt = new Date();

  for (const task of data.tasks) {
    const requestedUpdates = updatesById.get(task.id);
    if (!requestedUpdates) continue;

    let updates = requestedUpdates;

    if (task.href && updates.calendarId !== undefined && updates.calendarId !== task.calendarId) {
      newPendingDeletions.push({
        uid: task.uid,
        href: task.href,
        accountId: task.accountId,
        calendarId: task.calendarId,
        etag: task.etag,
        deletedAt: modifiedAt,
      });
      updates = { ...updates, href: undefined, etag: undefined };
    }

    if (updates.accountId !== undefined && updates.accountId !== task.accountId) {
      const targetAccount = data.accounts.find((account) => account.id === updates.accountId);
      if (targetAccount) {
        updates = { ...updates, localOnly: !targetAccount.caldav, synced: false };
      }
    }

    const updatedTask: Task = {
      ...task,
      ...updates,
      modifiedAt: updates.modifiedAt ?? modifiedAt,
      synced: updates.synced ?? false,
    };
    updatedTasks.push(updatedTask);
  }

  if (updatedTasks.length === 0) return [];

  if (dataStore.getIsInitialized()) {
    if (newPendingDeletions.length > 0) {
      await db.addPendingDeletions(newPendingDeletions, { notify: false });
    }
    await db.upsertTasks(updatedTasks, { notify: false });
  }

  const originalTasksById = new Map(data.tasks.map((task) => [task.id, task]));
  const plannedTasksById = new Map(updatedTasks.map((task) => [task.id, task]));
  const latestData = dataStore.load();
  const publishedUpdatedTasks: Task[] = [];
  const concurrentlyEditedTasks: Task[] = [];
  const tasks = latestData.tasks.map((currentTask) => {
    const originalTask = originalTasksById.get(currentTask.id);
    const plannedTask = plannedTasksById.get(currentTask.id);
    if (!originalTask || !plannedTask) return currentTask;

    const rebasedTask = rebaseTaskUpdate(originalTask, currentTask, plannedTask);
    publishedUpdatedTasks.push(rebasedTask);
    if (currentTask !== originalTask) concurrentlyEditedTasks.push(rebasedTask);
    return rebasedTask;
  });

  dataStore.save({
    ...latestData,
    tasks,
    pendingDeletions: mergePendingDeletions(latestData.pendingDeletions, newPendingDeletions),
  });

  if (dataStore.getIsInitialized() && concurrentlyEditedTasks.length > 0) {
    await db.upsertTasks(concurrentlyEditedTasks, { notify: false });
  }

  return publishedUpdatedTasks;
};

// task update
export const updateTask = (id: string, updates: Partial<Task>) => {
  const data = dataStore.load();
  let updatedTask: Task | undefined;

  // when a synced task is moved to a different calendar, queue deletion from the
  // old calendar URL and clear href/etag so the task is created fresh in the new
  // calendar. CalDAV addresses tasks by URL, so a plain PUT to the old href just
  // updates the task in the old calendar. the move never happens server-side
  const existingTask = data.tasks.find((t) => t.id === id);
  let pendingDeletions = data.pendingDeletions;
  if (
    existingTask?.href &&
    updates.calendarId !== undefined &&
    updates.calendarId !== existingTask.calendarId
  ) {
    const deletedAt = new Date();
    const deletion = {
      uid: existingTask.uid,
      href: existingTask.href,
      accountId: existingTask.accountId,
      calendarId: existingTask.calendarId,
      etag: existingTask.etag,
      deletedAt,
    };
    pendingDeletions = [...pendingDeletions, deletion];
    db.addPendingDeletion(deletion).catch((e) =>
      log.error('Failed to persist pending deletion for calendar move:', e),
    );
    updates = { ...updates, href: undefined, etag: undefined };
  }

  // set localOnly based on whether the target account is local or caldav
  if (updates.accountId !== undefined && updates.accountId !== existingTask?.accountId) {
    const targetAccount = data.accounts.find((a) => a.id === updates.accountId);
    if (targetAccount) {
      updates = { ...updates, localOnly: !targetAccount.caldav, synced: false };
    }
  }

  const tasks = data.tasks.map((task) => {
    if (task.id === id) {
      updatedTask = {
        ...task,
        ...updates,
        // only update modifiedAt if not provided in updates (local changes)
        modifiedAt: updates.modifiedAt !== undefined ? updates.modifiedAt : new Date(),
        // only mark as unsynced if synced is not explicitly set in updates
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

// task delete
export const deleteTask = (id: string, deleteChildren: boolean = true) => {
  const data = dataStore.load();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return;

  db.deleteTask(id, deleteChildren).catch((e) => log.error('Failed to persist task deletion:', e));

  // get all descendants recursively
  const getAllDescendantIds = (parentUid: string): string[] => {
    const children = data.tasks.filter((t) => t.parentUid === parentUid);
    const childIds = children.map((c) => c.id);
    const descendantIds = children.flatMap((c) => getAllDescendantIds(c.uid));
    return [...childIds, ...descendantIds];
  };

  const descendantIds = getAllDescendantIds(task.uid);
  const tasksToDelete = deleteChildren ? [id, ...descendantIds] : [id];
  const deletedAt = new Date();

  // collect all tasks that need to be tracked for server deletion
  const tasksWithHref = data.tasks.filter((t) => tasksToDelete.includes(t.id) && t.href);

  const newPendingDeletions = [
    ...data.pendingDeletions,
    ...tasksWithHref.map((t) => ({
      uid: t.uid,
      href: t.href!,
      accountId: t.accountId,
      calendarId: t.calendarId,
      etag: t.etag,
      deletedAt,
    })),
  ];

  // if not deleting children, orphan them (move to root level)
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
    tasks: updatedTasks.map((t) =>
      tasksToDelete.includes(t.id) ? { ...t, deletedAt, modifiedAt: deletedAt } : t,
    ),
    pendingDeletions: newPendingDeletions,
    ui: {
      ...data.ui,
      selectedTaskId: tasksToDelete.includes(data.ui.selectedTaskId ?? '')
        ? null
        : data.ui.selectedTaskId,
    },
  });
};

export const restoreTask = (id: string, restoreChildren: boolean = true) => {
  const data = dataStore.load();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return;

  const getAllDescendantIds = (parentUid: string): string[] => {
    const children = data.tasks.filter((t) => t.parentUid === parentUid);
    const childIds = children.map((c) => c.id);
    const descendantIds = children.flatMap((c) => getAllDescendantIds(c.uid));
    return [...childIds, ...descendantIds];
  };

  const taskIdsToRestore = restoreChildren ? [id, ...getAllDescendantIds(task.uid)] : [id];
  const tasksToRestore = data.tasks.filter((t) => taskIdsToRestore.includes(t.id));
  const restoredUids = new Set(tasksToRestore.map((t) => t.uid));

  db.restoreTask(id, restoreChildren).catch((e) => log.error('Failed to persist task restore:', e));

  dataStore.save({
    ...data,
    tasks: data.tasks.map((t) =>
      taskIdsToRestore.includes(t.id)
        ? {
            ...t,
            deletedAt: undefined,
            href: undefined,
            etag: undefined,
            synced: false,
            modifiedAt: new Date(),
          }
        : t,
    ),
    pendingDeletions: data.pendingDeletions.filter((d) => !restoredUids.has(d.uid)),
  });
};

export const permanentlyDeleteTask = (id: string, deleteChildren: boolean = true) => {
  const data = dataStore.load();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return;

  db.permanentlyDeleteTask(id, deleteChildren).catch((e) =>
    log.error('Failed to persist permanent task deletion:', e),
  );

  const getAllDescendantIds = (parentUid: string): string[] => {
    const children = data.tasks.filter((t) => t.parentUid === parentUid);
    const childIds = children.map((c) => c.id);
    const descendantIds = children.flatMap((c) => getAllDescendantIds(c.uid));
    return [...childIds, ...descendantIds];
  };

  const taskIdsToDelete = deleteChildren ? [id, ...getAllDescendantIds(task.uid)] : [id];
  const updatedTasks = !deleteChildren
    ? data.tasks.map((t) =>
        t.parentUid === task.uid
          ? { ...t, parentUid: undefined, modifiedAt: new Date(), synced: false }
          : t,
      )
    : data.tasks;

  dataStore.save({
    ...data,
    tasks: updatedTasks.filter((t) => !taskIdsToDelete.includes(t.id)),
    ui: {
      ...data.ui,
      selectedTaskId: taskIdsToDelete.includes(data.ui.selectedTaskId ?? '')
        ? null
        : data.ui.selectedTaskId,
    },
  });
};

export const deleteExpiredRecentlyDeletedTasks = (now: Date = new Date()) => {
  const { autoEmptyRecentlyDeleted, recentlyDeletedRetentionDays } = settingsStore.getState();
  if (!autoEmptyRecentlyDeleted) {
    return 0;
  }

  const data = dataStore.load();
  const expiredTasks = data.tasks.filter((task) =>
    isExpiredRecentlyDeletedTask(task, now, recentlyDeletedRetentionDays),
  );

  if (expiredTasks.length === 0) {
    return 0;
  }

  db.deleteExpiredRecentlyDeletedTasks(now, recentlyDeletedRetentionDays).catch((e) =>
    log.error('Failed to persist expired recently deleted cleanup:', e),
  );

  const expiredIds = new Set(expiredTasks.map((task) => task.id));
  const expiredUids = new Set(expiredTasks.map((task) => task.uid));
  const cleanupTime = new Date();

  dataStore.save({
    ...data,
    tasks: data.tasks
      .filter((task) => !expiredIds.has(task.id))
      .map((task) =>
        task.parentUid && expiredUids.has(task.parentUid)
          ? { ...task, parentUid: undefined, modifiedAt: cleanupTime, synced: false }
          : task,
      ),
    ui: {
      ...data.ui,
      selectedTaskId: expiredIds.has(data.ui.selectedTaskId ?? '') ? null : data.ui.selectedTaskId,
    },
  });

  return expiredTasks.length;
};

/**
 * remove a task from local storage only, without queuing a server-side DELETE
 * use this when the server has already removed the task (e.g. detected during sync)
 * so we don't mistakenly send a DELETE request for a resource that's gone or repurposed
 */
export const removeLocalTask = (id: string) => {
  const data = dataStore.load();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return;

  db.permanentlyDeleteTask(id, true).catch((e) =>
    log.error('Failed to persist local task removal:', e),
  );

  const getAllDescendantIds = (parentUid: string): string[] => {
    const children = data.tasks.filter((t) => t.parentUid === parentUid);
    const childIds = children.map((c) => c.id);
    const descendantIds = children.flatMap((c) => getAllDescendantIds(c.uid));
    return [...childIds, ...descendantIds];
  };

  const tasksToRemove = [id, ...getAllDescendantIds(task.uid)];

  dataStore.save({
    ...data,
    tasks: data.tasks.filter((t) => !tasksToRemove.includes(t.id)),
    ui: {
      ...data.ui,
      selectedTaskId: tasksToRemove.includes(data.ui.selectedTaskId ?? '')
        ? null
        : data.ui.selectedTaskId,
    },
  });
};

// task toggles
export const toggleTaskComplete = (
  id: string,
  completeInProcess = settingsStore.getState().completeInProcessTasks,
) => {
  const data = dataStore.load();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return;

  const isCompleting = task.status !== 'completed';

  // handle recurring task completion with helper
  if (isCompleting && task.rrule) {
    const handled = handleRecurringTaskCompletion(task, data);
    if (handled) return;
  }

  const newStatus = getTaskStatusAfterCompletionToggle(task.status, completeInProcess);

  const updates = {
    ...buildStatusUpdates(newStatus, task, new Date(), settingsStore.getState().syncStatusProgress),
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

// task tags
export const addTagToTask = (taskId: string, tagId: string) => {
  const task = getTaskById(taskId);
  if (!task) return undefined;

  return updateTask(taskId, {
    tags: [...(task.tags || []).filter((t) => t !== tagId), tagId],
  });
};

export const removeTagFromTask = (taskId: string, tagId: string) => {
  const task = getTaskById(taskId);
  if (!task) return undefined;

  return updateTask(taskId, {
    tags: (task.tags || []).filter((t) => t !== tagId),
  });
};

// export helpers
export const exportTaskAndChildren = (taskId: string) => {
  const data = dataStore.load();
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  // exclude subtasks that have been moved to Recently Deleted so they don't
  // appear in the export modal count or the exported file
  return { task, descendants: getAllDescendants(task.uid, 'active') };
};

export const exportTasksAndActiveDescendants = (selectedTasks: Task[]) => {
  const childrenByParent = new Map<string, Task[]>();
  for (const task of dataStore.load().tasks) {
    if (!task.parentUid || task.deletedAt) continue;
    const children = childrenByParent.get(task.parentUid);
    if (children) children.push(task);
    else childrenByParent.set(task.parentUid, [task]);
  }

  const includedTaskIds = new Set<string>();
  const exportTasks: Task[] = [];
  const appendTaskAndDescendants = (task: Task) => {
    if (includedTaskIds.has(task.id)) return;
    includedTaskIds.add(task.id);
    exportTasks.push(task);

    for (const child of childrenByParent.get(task.uid) ?? []) {
      appendTaskAndDescendants(child);
    }
  };

  for (const task of selectedTasks) appendTaskAndDescendants(task);
  return exportTasks;
};

const matchesDeletionVisibility = (task: Task, activeView: string) => {
  return activeView === 'recently-deleted' ? !!task.deletedAt : !task.deletedAt;
};

const matchesActiveScope = (
  task: Task,
  activeView: string,
  activeTagId: string | null,
  activeCalendarId: string | null,
) => {
  if (activeView === 'recently-deleted') return true;
  if (activeTagId !== null) return (task.tags ?? []).includes(activeTagId);
  if (activeCalendarId !== null) return task.calendarId === activeCalendarId;
  return true;
};

const matchesSearchQuery = (
  task: Task,
  query: string,
  parentUidsWithMatchingChildren: ReadonlySet<string>,
) => {
  if (
    task.title.toLowerCase().includes(query) ||
    task.description.toLowerCase().includes(query) ||
    task.url?.toLowerCase().includes(query)
  ) {
    return true;
  }

  return parentUidsWithMatchingChildren.has(task.uid);
};

export const getFilteredTasks = () => {
  const data = dataStore.load();
  const {
    activeView,
    searchQuery,
    showCompletedTasks,
    showUnstartedTasks,
    activeCalendarId,
    activeTagId,
    activeFilterId,
  } = data.ui;
  const activeFilter =
    activeView === 'filter' && activeFilterId
      ? data.filters.find((filter) => filter.id === activeFilterId)
      : undefined;
  const activeFilterControlsStatus = activeFilter?.criteria.some((c) => c.field === 'status');
  const activeFilterControlsStartDate = activeFilter?.criteria.some((c) => c.field === 'startDate');
  const normalizedSearchQuery = searchQuery.toLowerCase();
  const parentUidsWithMatchingChildren = new Set<string>();
  if (normalizedSearchQuery) {
    for (const task of data.tasks) {
      if (!task.parentUid || !matchesDeletionVisibility(task, activeView)) continue;
      if (task.title.toLowerCase().includes(normalizedSearchQuery)) {
        parentUidsWithMatchingChildren.add(task.parentUid);
      }
    }
  }

  return data.tasks.filter((task) => {
    if (!matchesDeletionVisibility(task, activeView)) return false;
    if (!matchesActiveScope(task, activeView, activeTagId, activeCalendarId)) return false;

    if (activeFilter && !matchesFilter(task, activeFilter)) {
      return false;
    }

    // filter by completion status (completed and cancelled are both "done")
    if (!activeFilterControlsStatus && !showCompletedTasks && isCompletedTask(task)) {
      return false;
    }

    // filter by start date (hide unstarted tasks with future start dates)
    if (!activeFilterControlsStartDate && !showUnstartedTasks && task.startDate) {
      if (new Date(task.startDate) > new Date()) {
        return false;
      }
    }

    // filter by search query
    if (normalizedSearchQuery) {
      return matchesSearchQuery(task, normalizedSearchQuery, parentUidsWithMatchingChildren);
    }

    return true;
  });
};

export const getSortedTasks = (
  tasks: Task[],
  sortConfig?: SortConfig,
  moveCompletedTasksToBottom = false,
) => sortTasks(tasks, sortConfig ?? dataStore.load().ui.sortConfig, moveCompletedTasksToBottom);
