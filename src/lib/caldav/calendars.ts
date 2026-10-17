import {
  APPLE_DEFAULT_TASK_CALENDAR_DISPLAY_NAME,
  APPLE_DEFAULT_TASK_CALENDAR_NAME,
} from '$constants';
import type { Connection } from '$lib/caldav/connection';
import { NS_WEBDAV_PUSH } from '$lib/caldav/push';
import { log, makeAbsoluteUrl } from '$lib/caldav/utils';
import { del, type HttpRequestContext, mkcalendar, propfind, proppatch } from '$lib/http';
import { parseMultiStatusXml } from '$lib/multistatus';
import type { Calendar } from '$types/calendar';
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

export const calendarExists = async (
  conn: Connection,
  calendarUrl: string,
  context?: HttpRequestContext,
) => {
  const response = context
    ? await propfind(
        calendarUrl,
        conn.credentials,
        `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`,
        '0',
        context,
      )
    : await propfind(
        calendarUrl,
        conn.credentials,
        `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`,
        '0',
      );
  if (response.status === 207 || response.status === 200) return true;
  if (response.status === 404 || response.status === 410) return false;
  throw new Error(`Failed to verify calendar existence: HTTP ${response.status}`);
};

/**
 * parse WebDAV Push properties from a single calendar's already-extracted prop values
 *
 * uses the per-calendar `topic` and `transports` values from parseMultiStatusXml rather than
 * scanning the full response body, which would cause all calendars to inherit the first
 * match found anywhere in the document
 */
export const parsePushProperties = (
  topicProp: string | null | undefined,
  transportsProp: string | null | undefined,
  enforceVapid = false,
): { topic?: string; vapidKey?: string; supported: boolean } => {
  const topic = (topicProp ?? '').trim() || undefined;

  const hasWebPush = transportsProp ? /<[^:>]*:?web-push[^>]*/i.test(transportsProp) : false;
  const vapidMatch = transportsProp?.match(
    /<[^:>]*:?vapid-public-key[^>]*>([^<]+)<\/[^:>]*:?vapid-public-key>/i,
  );
  const vapidKey = vapidMatch?.[1]?.trim();

  return {
    topic,
    vapidKey,
    supported: !!topic && hasWebPush && (!enforceVapid || !!vapidKey),
  };
};

const slugifyCalendarName = (displayName: string) =>
  displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'calendar';

const normalizeCalendarDisplayName = (displayName: string | null | undefined): string => {
  if (displayName === APPLE_DEFAULT_TASK_CALENDAR_NAME) {
    return APPLE_DEFAULT_TASK_CALENDAR_DISPLAY_NAME;
  }
  return displayName ?? 'Calendar';
};

export interface CalendarDiscoveryDiagnostics {
  calendarCollectionCount: number;
  includedCalendarCount: number;
  explicitVtodoCalendarCount: number;
  assumedCompatibleCalendarCount: number;
  nonVtodoCalendarCount: number;
  nonVtodoCalendarNames: string[];
}

export interface CalendarDiscoveryResult {
  calendars: Calendar[];
  diagnostics: CalendarDiscoveryDiagnostics;
}

export const discoverCalendars = async (
  conn: Connection,
  accountId: string,
  enforceVapid = false,
  context?: HttpRequestContext,
): Promise<CalendarDiscoveryResult> => {
  // include WebDAV Push properties in the PROPFIND request
  const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:a="http://apple.com/ns/ical/" xmlns:P="${NS_WEBDAV_PUSH}">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <c:supported-calendar-component-set/>
    <d:getctag/>
    <d:sync-token/>
    <a:calendar-color/>
    <a:calendar-order/>
    <P:transports/>
    <P:topic/>
  </d:prop>
</d:propfind>`;

  const response = context
    ? await propfind(conn.calendarHome, conn.credentials, propfindBody, '1', context)
    : await propfind(conn.calendarHome, conn.credentials, propfindBody, '1');

  if (response.status !== 207) {
    throw new Error(`Failed to fetch calendars: HTTP ${response.status}`);
  }

  const results = parseMultiStatusXml(response.body);
  const calendars: Calendar[] = [];
  const calendarHomePath = new URL(conn.calendarHome, conn.serverUrl).pathname;
  const diagnostics: CalendarDiscoveryDiagnostics = {
    calendarCollectionCount: 0,
    includedCalendarCount: 0,
    explicitVtodoCalendarCount: 0,
    assumedCompatibleCalendarCount: 0,
    nonVtodoCalendarCount: 0,
    nonVtodoCalendarNames: [],
  };

  for (const result of results) {
    const resultPath = result.href.startsWith('http') ? new URL(result.href).pathname : result.href;

    if (resultPath === calendarHomePath || resultPath === calendarHomePath.replace(/\/$/, '')) {
      continue;
    }

    const resourceType = result.props.resourcetype ?? '';
    if (!resourceType.includes('calendar') || resourceType.includes('deleted-calendar')) {
      continue;
    }

    diagnostics.calendarCollectionCount++;

    const supportedComponentsRaw = result.props['supported-calendar-component-set'] ?? '';
    const supportedComponents: string[] = [];
    const componentMatches = supportedComponentsRaw.matchAll(/<[^:>]*:?comp[^>]+name="([^"]+)"/gi);
    for (const match of componentMatches) {
      supportedComponents.push(match[1]);
    }

    if (supportedComponents.length > 0 && !supportedComponents.includes('VTODO')) {
      diagnostics.nonVtodoCalendarCount++;
      diagnostics.nonVtodoCalendarNames.push(
        normalizeCalendarDisplayName(result.props.displayname),
      );
      continue;
    }

    diagnostics.includedCalendarCount++;
    if (supportedComponents.includes('VTODO')) {
      diagnostics.explicitVtodoCalendarCount++;
    } else {
      diagnostics.assumedCompatibleCalendarCount++;
    }

    const calendarUrl = makeAbsoluteUrl(result.href, conn.serverUrl);
    const serverOrder = result.props['calendar-order'];

    const pushProps = parsePushProperties(
      result.props.topic,
      result.props.transports,
      enforceVapid,
    );

    calendars.push({
      id: calendarUrl,
      displayName: normalizeCalendarDisplayName(result.props.displayname),
      url: calendarUrl,
      ctag: result.props.getctag ?? undefined,
      syncToken: result.props['sync-token'] ?? undefined,
      color: normalizeHexColor(result.props['calendar-color']) ?? undefined,
      accountId,
      supportedComponents: supportedComponents.length > 0 ? supportedComponents : undefined,
      sortOrder: serverOrder ? parseInt(serverOrder, 10) : 0,
      // WebDAV Push properties
      pushTopic: pushProps.topic,
      pushSupported: pushProps.supported,
      pushVapidKey: pushProps.vapidKey,
    });
  }

  return { calendars, diagnostics };
};

export const fetchCalendars = async (
  conn: Connection,
  accountId: string,
  enforceVapid = false,
  context?: HttpRequestContext,
) => {
  return (await discoverCalendars(conn, accountId, enforceVapid, context)).calendars;
};

export const createCalendar = async (
  conn: Connection,
  accountId: string,
  displayName: string,
  color?: string,
  enforceVapid = false,
  context?: HttpRequestContext,
) => {
  const isVikunja = conn.serverType === 'vikunja' || conn.calendarHome.includes('/dav/projects');
  if (isVikunja) {
    throw new Error(
      "Vikunja doesn't support creating projects via CalDAV. Create the project in Vikunja's web interface, then sync.",
    );
  }

  const slug = slugifyCalendarName(displayName);
  const calendarUrl = `${conn.calendarHome.replace(/\/$/, '')}/${slug}/`;

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

  const response = context
    ? await mkcalendar(calendarUrl, conn.credentials, mkcalendarBody, context)
    : await mkcalendar(calendarUrl, conn.credentials, mkcalendarBody);

  if (response.status !== 201 && response.status !== 200) {
    log.error(`Failed to create calendar: HTTP ${response.status}`, response.body);
    throw new Error(`Failed to create calendar: HTTP ${response.status}`);
  }

  log.info('Calendar created successfully');

  const fallbackCalendar: Calendar = {
    id: calendarUrl,
    displayName,
    url: calendarUrl,
    color,
    accountId,
    supportedComponents: ['VTODO'],
    sortOrder: 0,
  };

  try {
    const { calendars } = context
      ? await discoverCalendars(conn, accountId, enforceVapid, context)
      : await discoverCalendars(conn, accountId, enforceVapid);
    const discoveredCalendar = calendars.find(
      (calendar) => calendar.id === calendarUrl || calendar.url === calendarUrl,
    );

    if (discoveredCalendar) {
      return discoveredCalendar;
    }

    log.warn(`Created calendar "${displayName}", but follow-up discovery did not return it`);
  } catch (error) {
    if (context?.signal?.aborted) {
      // the MKCALENDAR request has already completed, so return the known URL
      // and let the probe perform its non-cancellable cleanup request
      return fallbackCalendar;
    }
    log.warn(`Failed to discover push properties for created calendar "${displayName}":`, error);
  }

  return fallbackCalendar;
};

export const probeVtodoCalendarCreation = async (
  conn: Connection,
  accountId: string,
  enforceVapid = false,
  context?: HttpRequestContext,
) => {
  const displayName = `Chiri VTODO capability check ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;
  const probeCalendar = await createCalendar(
    conn,
    accountId,
    displayName,
    undefined,
    enforceVapid,
    context,
  );

  try {
    // if creation completed before cancellation, cleanup must not be tied to
    // the cancelled operation or the temporary calendar could be orphaned
    await deleteCalendar(conn, probeCalendar.url);
  } catch (error) {
    log.error('Failed to clean up VTODO capability check calendar:', error);
    throw new Error(
      `Chiri could create a VTODO calendar, but could not clean up the temporary test calendar at ${probeCalendar.url}.`,
    );
  }

  if (context?.signal?.aborted) {
    throw new Error('HTTP request cancelled');
  }
};

export const updateCalendar = async (
  conn: Connection,
  calendarUrl: string,
  updates: { displayName?: string; color?: string; order?: number },
) => {
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

export const deleteCalendar = async (
  conn: Connection,
  calendarUrl: string,
  context?: HttpRequestContext,
) => {
  try {
    const response = context
      ? await del(calendarUrl, conn.credentials, undefined, context)
      : await del(calendarUrl, conn.credentials);

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
