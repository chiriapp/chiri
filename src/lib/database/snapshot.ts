import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { DEFAULT_CALENDAR_NAME } from '$constants';
import { createAccount, getAllAccounts } from '$lib/database/accounts';
import { addCalendar } from '$lib/database/calendars';
import { bootstrapDefaultFilters, getAllFilters } from '$lib/database/filters';
import { getPendingDeletions } from '$lib/database/pending';
import { getAllTags } from '$lib/database/tags';
import { getAllTasks } from '$lib/database/tasks';
import { getUIState, setAllTasksView } from '$lib/database/ui';
import { loggers } from '$lib/logger';
import type { DataStore } from '$types/store';
import { generateUUID } from '$utils/misc';

const log = loggers.database;

const bootstrapLocalAccount = async (conn: DatabasePlugin) => {
  const accountId = generateUUID();
  const calendarId = generateUUID();
  const account = await createAccount(conn, {
    id: accountId,
    name: 'Local',
    caldav: null,
  });
  await addCalendar(conn, accountId, {
    id: calendarId,
    displayName: DEFAULT_CALENDAR_NAME,
    url: `local://${calendarId}`,
    icon: 'calendar',
  });
  const refreshed = await getAllAccounts(conn);
  log.info('Bootstrapped local account with default calendar');
  return refreshed.length > 0 ? refreshed : [account];
};

export const getSnapshot = async (conn: DatabasePlugin): Promise<DataStore> => {
  await bootstrapDefaultFilters(conn);

  const [tasks, tags, filters, rawAccounts, pendingDeletions, ui] = await Promise.all([
    getAllTasks(conn),
    getAllTags(conn),
    getAllFilters(conn),
    getAllAccounts(conn),
    getPendingDeletions(conn),
    getUIState(conn),
  ]);

  const accounts = rawAccounts.length === 0 ? await bootstrapLocalAccount(conn) : rawAccounts;

  let cleanedUI = ui;
  let needsUpdate = false;

  if (ui.activeCalendarId) {
    const calendarExists = accounts.some((a) =>
      a.calendars.some((cal) => cal.id === ui.activeCalendarId),
    );
    if (!calendarExists) {
      log.warn('Selected calendar no longer exists, clearing UI state');
      cleanedUI = {
        ...cleanedUI,
        activeCalendarId: null,
        activeAccountId: null,
        selectedTaskId: null,
      };
      needsUpdate = true;
    }
  }

  if (ui.activeTagId) {
    const tagExists = tags.some((t) => t.id === ui.activeTagId);
    if (!tagExists) {
      log.warn('Active tag no longer exists, clearing UI state');
      cleanedUI = {
        ...cleanedUI,
        activeTagId: null,
        activeAccountId: null,
        selectedTaskId: null,
      };
      needsUpdate = true;
    }
  }

  if (ui.activeFilterId) {
    const filterExists = filters.some((filter) => filter.id === ui.activeFilterId);
    if (!filterExists) {
      log.warn('Active filter no longer exists, clearing UI state');
      cleanedUI = {
        ...cleanedUI,
        activeFilterId: null,
        selectedTaskId: null,
      };
      needsUpdate = true;
    }
  }

  if (needsUpdate) {
    await setAllTasksView(conn);
    log.info('Stale UI state cleaned up');
  }

  return { tasks, tags, filters, accounts, pendingDeletions, ui: cleanedUI };
};
