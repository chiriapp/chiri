import type { Connection } from '$lib/caldav/connection';
import { log, makeAbsoluteUrl } from '$lib/caldav/utils';
import { del, mkcalendar, parseMultiStatus, propfind, proppatch } from '$lib/tauri-http';
import type { Calendar } from '$types';
import { normalizeHexColor } from '$utils/color';

const checkPropertySuccess = (responseBody: string, propertyName: string) => {
  const propstatMatches = responseBody.matchAll(/<propstat>([\s\S]*?)<\/propstat>/gi);
  for (const match of propstatMatches) {
    const propstat = match[1];
    const statusMatch = propstat.match(/<status>HTTP\/[\d.]+ (\d+)/i);
    const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
    if (propstat.toLowerCase().includes(propertyName.toLowerCase())) {
      return status === 200;
    }
  }
  return false;
};

export const fetchCalendars = async (conn: Connection, accountId: string): Promise<Calendar[]> => {
  const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:a="http://apple.com/ns/ical/">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <c:supported-calendar-component-set/>
    <d:getctag/>
    <d:sync-token/>
    <a:calendar-color/>
    <a:calendar-order/>
  </d:prop>
</d:propfind>`;

  const response = await propfind(conn.calendarHome, conn.credentials, propfindBody, '1');

  if (response.status !== 207) {
    throw new Error(`Failed to fetch calendars: HTTP ${response.status}`);
  }

  const results = parseMultiStatus(response.body);
  const calendars: Calendar[] = [];
  const calendarHomePath = new URL(conn.calendarHome, conn.serverUrl).pathname;

  for (const result of results) {
    const resultPath = result.href.startsWith('http') ? new URL(result.href).pathname : result.href;

    if (resultPath === calendarHomePath || resultPath === calendarHomePath.replace(/\/$/, '')) {
      continue;
    }

    const resourceType = result.props.resourcetype ?? '';
    if (!resourceType.includes('calendar') || resourceType.includes('deleted-calendar')) {
      continue;
    }

    const supportedComponentsRaw = result.props['supported-calendar-component-set'] ?? '';
    const supportedComponents: string[] = [];
    const componentMatches = supportedComponentsRaw.matchAll(/<[^:>]*:?comp[^>]+name="([^"]+)"/gi);
    for (const match of componentMatches) {
      supportedComponents.push(match[1]);
    }

    if (supportedComponents.length > 0 && !supportedComponents.includes('VTODO')) {
      continue;
    }

    const calendarUrl = makeAbsoluteUrl(result.href, conn.serverUrl);
    const serverOrder = result.props['calendar-order'];

    calendars.push({
      id: calendarUrl,
      displayName: result.props.displayname ?? 'Calendar',
      url: calendarUrl,
      ctag: result.props.getctag ?? undefined,
      syncToken: result.props['sync-token'] ?? undefined,
      color: normalizeHexColor(result.props['calendar-color']) ?? undefined,
      accountId,
      supportedComponents: supportedComponents.length > 0 ? supportedComponents : undefined,
      sortOrder: serverOrder ? parseInt(serverOrder, 10) : 0,
    });
  }

  return calendars;
};

export const createCalendar = async (
  conn: Connection,
  accountId: string,
  displayName: string,
  color?: string,
): Promise<Calendar> => {
  const slug =
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') ?? 'calendar';

  const calendarUrl = `${conn.calendarHome}${slug}/`;

  let colorProp = '';
  if (color) {
    colorProp = `<a:calendar-color xmlns:a="http://apple.com/ns/ical/">${color}</a:calendar-color>`;
  }

  const mkcalendarBody = `<?xml version="1.0" encoding="utf-8"?>
<c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:set>
    <d:prop>
      <d:displayname>${displayName}</d:displayname>
      <c:supported-calendar-component-set>
        <c:comp name="VTODO"/>
      </c:supported-calendar-component-set>
      ${colorProp}
    </d:prop>
  </d:set>
</c:mkcalendar>`;

  const response = await mkcalendar(calendarUrl, conn.credentials, mkcalendarBody);

  if (response.status !== 201 && response.status !== 200) {
    log.error(`Failed to create calendar: HTTP ${response.status}`, response.body);
    throw new Error(`Failed to create calendar: HTTP ${response.status}`);
  }

  log.info('Calendar created successfully');

  return {
    id: calendarUrl,
    displayName,
    url: calendarUrl,
    color,
    accountId,
    supportedComponents: ['VTODO'],
    sortOrder: 0,
  };
};

export const updateCalendar = async (
  conn: Connection,
  calendarUrl: string,
  updates: { displayName?: string; color?: string; order?: number },
): Promise<{ success: boolean; failedProperties: string[] }> => {
  const failedProperties: string[] = [];

  if (updates.displayName) {
    const displaynameBody = `<?xml version="1.0" encoding="utf-8"?>
<propertyupdate xmlns="DAV:">
    <set>
        <prop>
            <displayname>${updates.displayName}</displayname>
        </prop>
    </set>
</propertyupdate>`;

    const response = await proppatch(calendarUrl, conn.credentials, displaynameBody);

    if (response.status !== 207 && response.status !== 200) {
      log.error(`Failed to update displayname: HTTP ${response.status}`);
      failedProperties.push('displayname');
    } else if (!checkPropertySuccess(response.body, 'displayname')) {
      failedProperties.push('displayname');
    }
  }

  if (updates.color) {
    const colorWithAlpha = updates.color.length === 7 ? `${updates.color}FF` : updates.color;

    const colorBody = `<?xml version="1.0" encoding="utf-8"?>
<propertyupdate xmlns="DAV:">
    <set>
        <prop>
            <calendar-color xmlns="http://apple.com/ns/ical/">${colorWithAlpha}</calendar-color>
        </prop>
    </set>
</propertyupdate>`;

    const response = await proppatch(calendarUrl, conn.credentials, colorBody);

    if (response.status !== 207 && response.status !== 200) {
      log.error(`Failed to update color: HTTP ${response.status}`);
      failedProperties.push('calendar-color');
    } else if (!checkPropertySuccess(response.body, 'calendar-color')) {
      failedProperties.push('calendar-color');
    }
  }

  if (updates.order !== undefined) {
    const orderBody = `<?xml version="1.0" encoding="utf-8"?>
<propertyupdate xmlns="DAV:">
    <set>
        <prop>
            <calendar-order xmlns="http://apple.com/ns/ical/">${updates.order}</calendar-order>
        </prop>
    </set>
</propertyupdate>`;

    const response = await proppatch(calendarUrl, conn.credentials, orderBody);

    if (response.status !== 207 && response.status !== 200) {
      log.error(`Failed to update calendar-order: HTTP ${response.status}`);
      failedProperties.push('calendar-order');
    } else if (!checkPropertySuccess(response.body, 'calendar-order')) {
      log.warn('Server does not support calendar-order property');
    }
  }

  return { success: failedProperties.length === 0, failedProperties };
};

export const deleteCalendar = async (conn: Connection, calendarUrl: string): Promise<boolean> => {
  try {
    const response = await del(calendarUrl, conn.credentials);

    if (response.status !== 204 && response.status !== 200) {
      log.error(`Failed to delete calendar: HTTP ${response.status}`);
      throw new Error(`Failed to delete calendar: HTTP ${response.status}`);
    }

    return true;
  } catch (error) {
    log.error('Error deleting calendar:', error);
    throw error;
  }
};
