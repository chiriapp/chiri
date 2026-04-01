import type { Connection } from '$lib/caldav/connection';
import { cleanEtag, log, makeAbsoluteUrl, normalizeUrl } from '$lib/caldav/utils';
import { taskToVTodo, vtodoToTask } from '$lib/ical/vtodo';
import { del, parseMultiStatus, put, report } from '$lib/tauri-http';
import type { Calendar, Task } from '$types';

export const fetchTasks = async (
  conn: Connection,
  accountId: string,
  calendar: Calendar,
): Promise<Task[] | null> => {
  const queryBody = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VTODO"/>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  const queryResponse = await report(calendar.url, conn.credentials, queryBody, '1');

  if (queryResponse.status !== 207) {
    log.error(`Failed to query tasks: HTTP ${queryResponse.status}`);
    log.error('Response body:', queryResponse.body);
    return null;
  }

  const queryResults = parseMultiStatus(queryResponse.body);

  if (queryResults.length === 0) {
    log.info(`No tasks found in calendar: ${calendar.displayName}`);
    return [];
  }

  const hrefs = queryResults
    .map((result) => result.href)
    .filter((href) => {
      if (!href || href.length === 0) return false;

      const normalizedHref = normalizeUrl(href);
      const normalizedCalendarUrl = normalizeUrl(calendar.url);

      let calendarPath = normalizedCalendarUrl;
      if (normalizedCalendarUrl.startsWith('http')) {
        try {
          calendarPath = new URL(normalizedCalendarUrl).pathname;
        } catch (_) {}
      }

      if (normalizedHref === calendarPath || normalizedHref === normalizedCalendarUrl) {
        log.warn(
          `Filtering out calendar collection href: ${normalizedHref} (matches ${calendarPath})`,
        );
        return false;
      }

      if (!normalizedHref.endsWith('.ics')) {
        log.warn(`Filtering out non-task href: ${normalizedHref} (doesn't end with .ics)`);
        return false;
      }

      return true;
    });

  if (hrefs.length === 0) {
    if (queryResults.length === 1) {
      log.warn(
        'Server returned single result that matches calendar collection. Assuming calendar is empty.',
      );
      return [];
    }

    log.warn(
      `Server returned ${queryResults.length} results but 0 valid task hrefs. This may indicate a server issue.`,
    );
    return null;
  }

  const multigetBody = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-multiget xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
${hrefs.map((href) => `  <d:href>${href}</d:href>`).join('\n')}
</c:calendar-multiget>`;

  const multigetResponse = await report(calendar.url, conn.credentials, multigetBody, '0');

  if (multigetResponse.status !== 207) {
    log.error(`Failed to fetch task data: HTTP ${multigetResponse.status}`);
    log.error('Response body:', multigetResponse.body);
    return null;
  }

  const results = parseMultiStatus(multigetResponse.body);
  const tasks: Task[] = [];

  for (const result of results) {
    const calendarData = result.props['calendar-data'];
    const etag = cleanEtag(result.props.getetag);

    if (calendarData) {
      const href = makeAbsoluteUrl(result.href, conn.serverUrl);
      const task = vtodoToTask(calendarData, accountId, calendar.id, href, etag ?? undefined);
      if (task) tasks.push(task);
    }
  }

  log.info(`Fetched ${tasks.length} tasks from calendar: ${calendar.displayName}`);
  return tasks;
};

export const createTask = async (
  conn: Connection,
  calendar: Calendar,
  task: Task,
): Promise<{ href: string; etag: string } | null> => {
  try {
    const icalData = taskToVTodo(task);
    const filename = `${task.uid}.ics`;
    const url = `${normalizeUrl(calendar.url)}/${filename}`;

    const response = await put(url, conn.credentials, icalData);

    if (response.status === 201 || response.status === 204) {
      const etag = cleanEtag(response.headers.etag);
      return { href: url, etag };
    }

    log.error(`Failed to create task: HTTP ${response.status}`);
    return null;
  } catch (error) {
    log.error('Error creating task:', error);
    return null;
  }
};

export const updateTask = async (
  conn: Connection,
  task: Task,
): Promise<{ etag: string } | null> => {
  if (!task.href) {
    log.error('Task has no href for update');
    return null;
  }

  try {
    const icalData = taskToVTodo(task);
    const response = await put(task.href, conn.credentials, icalData, task.etag);

    if (response.status === 200 || response.status === 201 || response.status === 204) {
      const etag = cleanEtag(response.headers.etag);
      return { etag };
    }

    log.error(`Failed to update task: HTTP ${response.status}`);
    return null;
  } catch (error) {
    log.error('Error updating task:', error);
    return null;
  }
};

export const deleteTask = async (conn: Connection, task: Task): Promise<boolean> => {
  if (!task.href) {
    log.error('Task has no href for deletion');
    return false;
  }

  try {
    const response = await del(task.href, conn.credentials, task.etag);
    return response.status === 204 || response.status === 200;
  } catch (error) {
    log.error('Error deleting task:', error);
    return false;
  }
};

export const syncCalendar = async (
  conn: Connection,
  accountId: string,
  calendar: Calendar,
  localTasks: Task[],
): Promise<{ created: Task[]; updated: Task[]; deleted: string[] } | null> => {
  const remoteTasks = await fetchTasks(conn, accountId, calendar);

  if (remoteTasks === null) {
    log.error(`Failed to fetch tasks from server for calendar: ${calendar.displayName}`);
    log.error('Server returned null. Skipping sync to avoid data loss.');
    return null;
  }

  const created: Task[] = [];
  const updated: Task[] = [];
  const deleted: string[] = [];

  for (const remoteTask of remoteTasks) {
    const localTask = localTasks.find((t) => t.uid === remoteTask.uid);
    if (!localTask) {
      created.push(remoteTask);
    } else if (remoteTask.etag !== localTask.etag) {
      updated.push({ ...remoteTask, id: localTask.id });
    }
  }

  const remoteUids = new Set(remoteTasks.map((t) => t.uid));
  for (const localTask of localTasks) {
    if (localTask.synced && !remoteUids.has(localTask.uid)) {
      deleted.push(localTask.id);
    }
  }

  return { created, updated, deleted };
};
