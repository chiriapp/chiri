import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { getAllAccounts } from '$lib/database/accounts';
import { getPendingDeletions } from '$lib/database/pendingDeletions';
import { getAllTags } from '$lib/database/tags';
import { getAllTasks } from '$lib/database/tasks';
import { getUIState, setAllTasksView } from '$lib/database/ui';
import { loggers } from '$lib/logger';
import type { DataStore } from '$types/store';

const log = loggers.database;

export const getSnapshot = async (conn: DatabasePlugin): Promise<DataStore> => {
  const [tasks, tags, accounts, pendingDeletions, ui] = await Promise.all([
    getAllTasks(conn),
    getAllTags(conn),
    getAllAccounts(conn),
    getPendingDeletions(conn),
    getUIState(conn),
  ]);

  let cleanedUI = ui;
  let needsUpdate = false;

  if (ui.activeCalendarId) {
    const calendarExists = accounts.some((a) =>
      a.calendars.some((cal) => cal.id === ui.activeCalendarId),
    );
    if (!calendarExists) {
      log.warn('Active calendar no longer exists, clearing UI state');
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

  if (needsUpdate) {
    await setAllTasksView(conn);
    log.info('Stale UI state cleaned up');
  }

  return { tasks, tags, accounts, pendingDeletions, ui: cleanedUI };
};
