import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpResponse, MultiStatusResponse } from '$lib/tauri-http';
import { makeConnection } from '../../fixtures';

vi.mock('$lib/tauri-http', () => ({
  propfind: vi.fn(),
  proppatch: vi.fn(),
  mkcalendar: vi.fn(),
  del: vi.fn(),
  parseMultiStatus: vi.fn(),
}));
vi.mock('$lib/caldav/utils', () => ({
  makeAbsoluteUrl: (href: string, base: string) =>
    href.startsWith('http') ? href : new URL(href, base).toString(),
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('$utils/color', () => ({
  normalizeHexColor: (c?: string | null) => {
    if (!c) return undefined;
    if (c.length === 9 && c.toUpperCase().endsWith('FF')) return c.substring(0, 7);
    return c;
  },
}));
vi.mock('$lib/caldav/push', () => ({ NS_WEBDAV_PUSH: 'https://test/push' }));

import {
  calendarExists,
  createCalendar,
  deleteCalendar,
  fetchCalendars,
  updateCalendar,
} from '$lib/caldav/calendars';
import * as http from '$lib/tauri-http';

const httpOk = (status: number, body = ''): HttpResponse => ({ status, headers: {}, body });
const multi = (
  entries: { href: string; props?: Record<string, string | null> }[],
): MultiStatusResponse[] =>
  entries.map((e) => ({ href: e.href, status: '', props: e.props ?? {} }));

const conn = makeConnection({
  serverUrl: 'https://cal.example.com',
  calendarHome: 'https://cal.example.com/calendars/alice/',
});

describe('calendarExists', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true for 207', async () => {
    vi.mocked(http.propfind).mockResolvedValueOnce(httpOk(207));

    expect(await calendarExists(conn, 'https://x.com/cal/')).toBe(true);
  });

  it('returns true for 200', async () => {
    vi.mocked(http.propfind).mockResolvedValueOnce(httpOk(200));

    expect(await calendarExists(conn, 'https://x.com/cal/')).toBe(true);
  });

  it('returns false for 404', async () => {
    vi.mocked(http.propfind).mockResolvedValueOnce(httpOk(404));

    expect(await calendarExists(conn, 'https://x.com/cal/')).toBe(false);
  });
});

describe('fetchCalendars', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws on non-207', async () => {
    vi.mocked(http.propfind).mockResolvedValueOnce(httpOk(500));

    await expect(fetchCalendars(conn, 'acct')).rejects.toThrow(/HTTP 500/i);
  });

  it('returns calendars with VTODO support', async () => {
    vi.mocked(http.propfind).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([
        // calendar home itself - should be filtered out
        { href: '/calendars/alice/', props: { resourcetype: 'collection' } },
        // a VTODO calendar
        {
          href: '/calendars/alice/tasks/',
          props: {
            resourcetype: 'collection,calendar',
            displayname: 'Tasks',
            'supported-calendar-component-set': '<comp name="VTODO"/>',
            getctag: 'ctag-1',
            'calendar-color': '#ef4444FF',
          },
        },
      ]),
    );

    const result = await fetchCalendars(conn, 'acct');

    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('Tasks');
    expect(result[0].ctag).toBe('ctag-1');
    expect(result[0].color).toBe('#ef4444');
    expect(result[0].supportedComponents).toEqual(['VTODO']);
  });

  it('skips calendars without VTODO support (e.g. event-only)', async () => {
    vi.mocked(http.propfind).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([
        {
          href: '/calendars/alice/events/',
          props: {
            resourcetype: 'collection,calendar',
            displayname: 'Events',
            'supported-calendar-component-set': '<comp name="VEVENT"/>',
          },
        },
      ]),
    );

    expect(await fetchCalendars(conn, 'acct')).toEqual([]);
  });

  it('skips non-calendar resources', async () => {
    vi.mocked(http.propfind).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([
        {
          href: '/calendars/alice/other/',
          props: { resourcetype: 'collection', displayname: 'Other' },
        },
      ]),
    );

    expect(await fetchCalendars(conn, 'acct')).toEqual([]);
  });

  it('skips deleted-calendar resources', async () => {
    vi.mocked(http.propfind).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([
        {
          href: '/calendars/alice/trash/',
          props: {
            resourcetype: 'collection,calendar,deleted-calendar',
            displayname: 'Trashed',
          },
        },
      ]),
    );

    expect(await fetchCalendars(conn, 'acct')).toEqual([]);
  });

  it('defaults displayName to "Calendar" when server omits it', async () => {
    vi.mocked(http.propfind).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([
        {
          href: '/calendars/alice/tasks/',
          props: { resourcetype: 'collection,calendar' },
        },
      ]),
    );

    const result = await fetchCalendars(conn, 'acct');

    expect(result[0].displayName).toBe('Calendar');
  });

  it('parses calendar-order as integer (default 0)', async () => {
    vi.mocked(http.propfind).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([
        {
          href: '/calendars/alice/a/',
          props: { resourcetype: 'collection,calendar', 'calendar-order': '5' },
        },
        {
          href: '/calendars/alice/b/',
          props: { resourcetype: 'collection,calendar' },
        },
      ]),
    );

    const result = await fetchCalendars(conn, 'acct');

    expect(result[0].sortOrder).toBe(5);
    expect(result[1].sortOrder).toBe(0);
  });
});

describe('createCalendar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses to create on Vikunja', async () => {
    const vikunjaConn = makeConnection({
      serverType: 'vikunja',
      calendarHome: 'https://x.com/dav/projects/',
    });

    await expect(createCalendar(vikunjaConn, 'acct', 'New')).rejects.toThrow(/Vikunja/i);
  });

  it('slugifies the displayName into the URL', async () => {
    vi.mocked(http.mkcalendar).mockResolvedValueOnce(httpOk(201));

    const result = await createCalendar(conn, 'acct', 'My Tasks!');

    expect(result.url).toBe('https://cal.example.com/calendars/alice/my-tasks/');
    expect(result.id).toBe('https://cal.example.com/calendars/alice/my-tasks/');
  });

  it('accepts 200 as success (some servers)', async () => {
    vi.mocked(http.mkcalendar).mockResolvedValueOnce(httpOk(200));

    const result = await createCalendar(conn, 'acct', 'tasks');

    expect(result.displayName).toBe('tasks');
  });

  it('throws on non-2xx response', async () => {
    vi.mocked(http.mkcalendar).mockResolvedValueOnce(httpOk(500));

    await expect(createCalendar(conn, 'acct', 'tasks')).rejects.toThrow(/HTTP 500/i);
  });

  it('includes color in the MKCALENDAR body when provided', async () => {
    vi.mocked(http.mkcalendar).mockResolvedValueOnce(httpOk(201));

    await createCalendar(conn, 'acct', 'tasks', '#ef4444');

    const body = vi.mocked(http.mkcalendar).mock.calls[0][2];
    expect(body).toContain('#ef4444');
    expect(body).toContain('calendar-color');
  });

  it('omits color block when not provided', async () => {
    vi.mocked(http.mkcalendar).mockResolvedValueOnce(httpOk(201));

    await createCalendar(conn, 'acct', 'tasks');

    const body = vi.mocked(http.mkcalendar).mock.calls[0][2];
    expect(body).not.toContain('calendar-color');
  });

  it('requests VTODO as the only supported component', async () => {
    vi.mocked(http.mkcalendar).mockResolvedValueOnce(httpOk(201));

    await createCalendar(conn, 'acct', 'tasks');

    const body = vi.mocked(http.mkcalendar).mock.calls[0][2];
    expect(body).toContain('VTODO');
    expect(body).not.toContain('VEVENT');
  });
});

describe('updateCalendar', () => {
  beforeEach(() => vi.clearAllMocks());

  const okPropstat = (propName: string) =>
    `<multistatus><response><propstat><prop><${propName}/></prop><status>HTTP/1.1 200 OK</status></propstat></response></multistatus>`;

  it('updates displayName', async () => {
    vi.mocked(http.proppatch).mockResolvedValueOnce(httpOk(207, okPropstat('displayname')));

    const result = await updateCalendar(conn, 'https://x.com/cal/', { displayName: 'Renamed' });

    expect(result.success).toBe(true);
    expect(result.failedProperties).toEqual([]);
  });

  it('appends FF alpha to 7-char colors before sending', async () => {
    vi.mocked(http.proppatch).mockResolvedValueOnce(httpOk(207, okPropstat('calendar-color')));

    await updateCalendar(conn, 'https://x.com/cal/', { color: '#ef4444' });

    const body = vi.mocked(http.proppatch).mock.calls[0][2];
    expect(body).toContain('#ef4444FF');
  });

  it('preserves 9-char alpha colors as-is', async () => {
    vi.mocked(http.proppatch).mockResolvedValueOnce(httpOk(207, okPropstat('calendar-color')));

    await updateCalendar(conn, 'https://x.com/cal/', { color: '#ef444480' });

    const body = vi.mocked(http.proppatch).mock.calls[0][2];
    expect(body).toContain('#ef444480');
  });

  it('reports a property as failed on non-207', async () => {
    vi.mocked(http.proppatch).mockResolvedValueOnce(httpOk(500, ''));

    const result = await updateCalendar(conn, 'https://x.com/cal/', { displayName: 'X' });

    expect(result.success).toBe(false);
    expect(result.failedProperties).toContain('displayname');
  });

  it('reports a property as failed when status inside propstat is not 200', async () => {
    const body = `<multistatus><response><propstat><prop><displayname/></prop><status>HTTP/1.1 403 Forbidden</status></propstat></response></multistatus>`;
    vi.mocked(http.proppatch).mockResolvedValueOnce(httpOk(207, body));

    const result = await updateCalendar(conn, 'https://x.com/cal/', { displayName: 'X' });

    expect(result.failedProperties).toContain('displayname');
  });

  it('updates multiple properties in separate PROPPATCH calls', async () => {
    vi.mocked(http.proppatch)
      .mockResolvedValueOnce(httpOk(207, okPropstat('displayname')))
      .mockResolvedValueOnce(httpOk(207, okPropstat('calendar-color')))
      .mockResolvedValueOnce(httpOk(207, okPropstat('calendar-order')));

    const result = await updateCalendar(conn, 'https://x.com/cal/', {
      displayName: 'New',
      color: '#abc123',
      order: 5,
    });

    expect(http.proppatch).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(true);
  });

  it('skips updates for fields not in the update object', async () => {
    vi.mocked(http.proppatch).mockResolvedValueOnce(httpOk(207, okPropstat('displayname')));

    await updateCalendar(conn, 'https://x.com/cal/', { displayName: 'X' });

    expect(http.proppatch).toHaveBeenCalledTimes(1);
  });

  it('does NOT report calendar-order as failed when server returns non-200 inside propstat (gracefully warns)', async () => {
    // updateCalendar logs a warning for calendar-order failure but doesn't add it
    // to failedProperties, since not all servers support it
    const body = `<multistatus><response><propstat><prop><calendar-order/></prop><status>HTTP/1.1 403 Forbidden</status></propstat></response></multistatus>`;
    vi.mocked(http.proppatch).mockResolvedValueOnce(httpOk(207, body));

    const result = await updateCalendar(conn, 'https://x.com/cal/', { order: 5 });

    expect(result.failedProperties).not.toContain('calendar-order');
    expect(result.success).toBe(true);
  });
});

describe('deleteCalendar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true on 204', async () => {
    vi.mocked(http.del).mockResolvedValueOnce(httpOk(204));

    expect(await deleteCalendar(conn, 'https://x.com/cal/')).toBe(true);
  });

  it('returns true on 200', async () => {
    vi.mocked(http.del).mockResolvedValueOnce(httpOk(200));

    expect(await deleteCalendar(conn, 'https://x.com/cal/')).toBe(true);
  });

  it('throws on non-success status', async () => {
    vi.mocked(http.del).mockResolvedValueOnce(httpOk(403));

    await expect(deleteCalendar(conn, 'https://x.com/cal/')).rejects.toThrow(/HTTP 403/i);
  });

  it('rethrows when del() throws (network error)', async () => {
    vi.mocked(http.del).mockRejectedValueOnce(new Error('network'));

    await expect(deleteCalendar(conn, 'https://x.com/cal/')).rejects.toThrow(/network/i);
  });
});
