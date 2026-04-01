import { db } from '$lib/database';
import { loggers } from '$lib/logger';
import { dataStore } from '$lib/store';
import type { Calendar, Task } from '$types';
import { generateUUID } from '$utils/misc';

const log = loggers.dataStore;

export const addCalendar = (accountId: string, calendarData: Partial<Calendar>) => {
  const data = dataStore.load();

  // Compute sortOrder: use provided value, or place after all existing calendars in this account
  const existingCalendars = data.accounts.find((a) => a.id === accountId)?.calendars ?? [];
  const maxExistingOrder = existingCalendars.reduce((max, c) => Math.max(max, c.sortOrder), 0);
  const sortOrder = calendarData.sortOrder || maxExistingOrder + 100;

  const calendar: Calendar = {
    ...calendarData,
    id: calendarData.id ?? generateUUID(),
    displayName: calendarData.displayName ?? 'Tasks',
    url: calendarData.url ?? '',
    accountId,
    sortOrder,
  } satisfies Calendar;

  log.info(`Adding calendar: ${calendar.displayName} with ID: ${calendar.id}`);

  db.addCalendar(accountId, calendar).catch((e) => log.error('Failed to persist calendar:', e));

  // Check if this is the first calendar being added
  const allCalendars = data.accounts.flatMap((acc) => acc.calendars);
  const isFirstCalendar = allCalendars.length === 0;

  // Assign local-only tasks to this calendar if it's the first one
  let updatedTasks = data.tasks;
  if (isFirstCalendar) {
    updatedTasks = data.tasks.map((task) => {
      if (task.localOnly || !task.calendarId || !task.accountId) {
        log.info(`Assigning local-only task "${task.title}" to calendar: ${calendar.displayName}`);

        const updatedTask: Task = {
          ...task,
          calendarId: calendar.id,
          accountId: accountId,
          localOnly: false,
          synced: false,
          modifiedAt: new Date(),
        } satisfies Task;

        db.updateTask(task.id, {
          calendarId: calendar.id,
          accountId: accountId,
          localOnly: false,
          synced: false,
          modifiedAt: new Date(),
        }).catch((e) => log.error('Failed to update local task:', e));

        return updatedTask;
      }
      return task;
    });
  }

  dataStore.save({
    ...data,
    accounts: data.accounts.map((acc) =>
      acc.id === accountId ? { ...acc, calendars: [...acc.calendars, calendar] } : acc,
    ),
    tasks: updatedTasks,
    ui: data.ui,
  });
};

export const updateCalendar = (
  accountId: string,
  calendarId: string,
  updates: Partial<Calendar>,
) => {
  const data = dataStore.load();

  db.updateCalendar(calendarId, updates).catch((e) =>
    log.error('Failed to persist calendar update:', e),
  );

  // Update in-memory store
  dataStore.save({
    ...data,
    accounts: data.accounts.map((acc) =>
      acc.id === accountId
        ? {
            ...acc,
            calendars: acc.calendars.map((cal) =>
              cal.id === calendarId ? { ...cal, ...updates } : cal,
            ),
          }
        : acc,
    ),
  });
};

export const deleteCalendar = (accountId: string, calendarId: string) => {
  const data = dataStore.load();

  db.deleteCalendar(accountId, calendarId).catch((e) =>
    log.error('Failed to persist calendar deletion:', e),
  );

  // Get all tasks to delete and track for server deletion
  const tasksToDelete = data.tasks.filter((t) => t.calendarId === calendarId);
  const newPendingDeletions = [
    ...data.pendingDeletions,
    ...tasksToDelete
      .filter((t) => t.href)
      .map((t) => ({
        uid: t.uid,
        href: t.href!,
        accountId: t.accountId,
        calendarId: t.calendarId,
      })),
  ];

  // check if the active calendar is being deleted
  const isActiveCalendarDeleted = data.ui.activeCalendarId === calendarId;

  dataStore.save({
    ...data,
    accounts: data.accounts.map((acc) =>
      acc.id === accountId
        ? { ...acc, calendars: acc.calendars.filter((c) => c.id !== calendarId) }
        : acc,
    ),
    tasks: data.tasks.filter((t) => t.calendarId !== calendarId),
    pendingDeletions: newPendingDeletions,
    ui: {
      ...data.ui,
      // redirect to All Tasks view instead of another calendar
      activeCalendarId: isActiveCalendarDeleted ? null : data.ui.activeCalendarId,
      activeAccountId: isActiveCalendarDeleted ? null : data.ui.activeAccountId,
      activeTagId: isActiveCalendarDeleted ? null : data.ui.activeTagId,
      selectedTaskId: null,
      isEditorOpen: false,
    },
  });
};
