import {
  calendarExists,
  createCalendar,
  deleteCalendar,
  fetchCalendars,
} from '$lib/caldav/calendars';
import type { Connection } from '$lib/caldav/connection';
import { deleteTask, fetchTasks } from '$lib/caldav/tasks';
import type { CalDAVCredentials } from '$lib/tauri-http';
import type { Calendar, ServerType } from '$types';

export const url = process.env.CHIRI_TEST_CALDAV_URL;
export const username = process.env.CHIRI_TEST_CALDAV_USERNAME;
export const password = process.env.CHIRI_TEST_CALDAV_PASSWORD;
export const serverType = (process.env.CHIRI_TEST_CALDAV_TYPE ?? 'generic') as ServerType;

// optional override for the calendar home URL. useful for servers (like Xandikos)
// whose URL layout doesn't match any builtin chiri server type. when set, chiri's
// connect() skips auto-discovery and uses this URL directly
export const calendarHomeOverride = process.env.CHIRI_TEST_CALDAV_HOME;

export const credentials: CalDAVCredentials = { username: username!, password: password! };

export const hasIntegrationEnv = !!(url && username && password);

/**
 * find or create a deterministically-named test calendar. reusing the same
 * calendar across runs avoids hammering rate-limited servers (Nextcloud caps
 * calendar creations per user per hour)
 */
export const getOrCreateTestCalendar = async (
  conn: Connection,
  accountId: string,
  name: string,
): Promise<Calendar> => {
  const existing = await fetchCalendars(conn, accountId);
  const found = existing.find((c) => c.displayName === name || c.url.includes(name.toLowerCase()));
  if (found) return found;
  return createCalendar(conn, accountId, name);
};

/** best-effort cleanup of every task in a calendar. leaves the calendar itself */
export const clearCalendarTasks = async (
  conn: Connection,
  accountId: string,
  calendar: Calendar,
) => {
  const tasks = await fetchTasks(conn, accountId, calendar);
  if (!tasks) return;
  for (const task of tasks) {
    try {
      await deleteTask(conn, task);
    } catch {}
  }
};

/** used only by tests that NEED throwaway calendars (e.g. calendar-move) */
export const cleanupCalendar = async (conn: Connection, calendar: Calendar) => {
  if (!calendar) return;
  try {
    await deleteCalendar(conn, calendar.url);
  } catch {}
};

/** suppress unused-import warning for utility exports kept for parity. */
export { calendarExists };
