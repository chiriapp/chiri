import { DEFAULT_CALENDAR_NAME } from '$constants';
import { settingsStore } from '$context/settingsContext';
import { db } from '$lib/database';
import { loggers } from '$lib/logger';
import { dataStore } from '$lib/store';
import type { Account, Calendar, Task } from '$types';
import { generateUUID } from '$utils/misc';

const log = loggers.dataStore;

const isBuiltInLocalCalendar = (account: Account | undefined, calendar: Calendar | undefined) =>
  !!account &&
  !!calendar &&
  !account.caldav &&
  calendar.displayName === DEFAULT_CALENDAR_NAME &&
  calendar.url.startsWith('local://');

const isTaskCalendar = (calendar: Calendar) =>
  !calendar.supportedComponents || calendar.supportedComponents.includes('VTODO');

const maybeAdoptRemoteCalendarAsTaskDefault = (
  accounts: Account[],
  account: Account | undefined,
  calendar: Calendar,
) => {
  if (!account?.caldav || !isTaskCalendar(calendar)) return;

  const settings = settingsStore.getState();
  if (!settings.preferCalDAVCalendarForNewTasks) return;
  if (settings.defaultCalendarIdManuallyChanged) return;

  const selectedDefaultAccount = accounts.find((candidate) =>
    candidate.calendars.some(
      (candidateCalendar) => candidateCalendar.id === settings.defaultCalendarId,
    ),
  );
  const selectedDefaultCalendar = selectedDefaultAccount?.calendars.find(
    (candidateCalendar) => candidateCalendar.id === settings.defaultCalendarId,
  );
  const shouldAdoptRemoteDefault =
    !settings.defaultCalendarId ||
    isBuiltInLocalCalendar(selectedDefaultAccount, selectedDefaultCalendar);

  if (!shouldAdoptRemoteDefault) return;

  settingsStore.setDefaultCalendarIdAutomatically(calendar.id);
  log.info(`Using remote calendar "${calendar.displayName}" as the default for new tasks`);
};

export const addCalendar = async (accountId: string, calendarData: Partial<Calendar>) => {
  const data = dataStore.load();

  // compute sortOrder: use provided value, or place after all existing calendars in this account
  const existingCalendars = data.accounts.find((a) => a.id === accountId)?.calendars ?? [];
  const maxExistingOrder = existingCalendars.reduce((max, c) => Math.max(max, c.sortOrder), 0);
  const sortOrder = calendarData.sortOrder || maxExistingOrder + 100;

  const calendar: Calendar = {
    ...calendarData,
    id: calendarData.id ?? generateUUID(),
    displayName: calendarData.displayName ?? DEFAULT_CALENDAR_NAME,
    url: calendarData.url ?? '',
    accountId,
    sortOrder,
  } satisfies Calendar;

  log.info(`Adding calendar: ${calendar.displayName} with ID: ${calendar.id}`);

  // check if this is the first calendar being added
  const allCalendars = data.accounts.flatMap((acc) => acc.calendars);
  const isFirstCalendar = allCalendars.length === 0;

  // assign orphan tasks to this calendar if it's the first one
  const account = data.accounts.find((a) => a.id === accountId);
  const isLocal = !account?.caldav;
  maybeAdoptRemoteCalendarAsTaskDefault(data.accounts, account, calendar);
  let updatedTasks = data.tasks;
  if (isFirstCalendar) {
    updatedTasks = data.tasks.map((task) => {
      if (task.localOnly || !task.calendarId || !task.accountId) {
        log.info(`Assigning orphan task "${task.title}" to calendar: ${calendar.displayName}`);

        const updatedTask: Task = {
          ...task,
          calendarId: calendar.id,
          accountId: accountId,
          localOnly: isLocal,
          synced: false,
          modifiedAt: new Date(),
        } satisfies Task;

        db.updateTask(task.id, {
          calendarId: calendar.id,
          accountId: accountId,
          localOnly: isLocal,
          synced: false,
          modifiedAt: new Date(),
        }).catch((e) => log.error('Failed to update orphan task:', e));

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

  try {
    await db.addCalendar(accountId, calendar);
  } catch (e) {
    log.error('Failed to persist calendar:', e);
  }
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

  // update in-memory store
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

  // check if the selected calendar is being deleted
  const isActiveCalendarDeleted = data.ui.activeCalendarId === calendarId;

  dataStore.save({
    ...data,
    accounts: data.accounts.map((acc) =>
      acc.id === accountId
        ? { ...acc, calendars: acc.calendars.filter((c) => c.id !== calendarId) }
        : acc,
    ),
    tasks: data.tasks.filter((t) => t.calendarId !== calendarId),
    pendingDeletions: data.pendingDeletions.filter(
      (deletion) => deletion.calendarId !== calendarId,
    ),
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
