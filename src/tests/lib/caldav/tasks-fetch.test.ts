import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpResponse, MultiStatusResponse } from '$lib/tauri-http';
import { makeCalendar, makeConnection, makeTask } from '../../fixtures';

vi.mock('$lib/tauri-http', () => ({
  put: vi.fn(),
  propfind: vi.fn(),
  parseMultiStatus: vi.fn(),
  report: vi.fn(),
  del: vi.fn(),
}));
vi.mock('$lib/ical/vtodo', () => ({
  taskToVTodo: vi.fn(),
  vtodoToTask: vi.fn(),
}));
vi.mock('$lib/caldav/utils', () => ({
  cleanEtag: (etag?: string | null) => etag?.replace(/"/g, '') ?? '',
  normalizeUrl: (url: string) => url.replace(/\/$/, ''),
  makeAbsoluteUrl: (href: string, base: string) =>
    href.startsWith('http') ? href : new URL(href, base).toString(),
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { fetchTasks } from '$lib/caldav/tasks';
import * as ical from '$lib/ical/vtodo';
import * as http from '$lib/tauri-http';

const conn = makeConnection({ serverUrl: 'https://cal.example.com' });
const calendar = makeCalendar({ id: 'cal-1', url: 'https://cal.example.com/calendars/default/' });

const httpOk = (status: number): HttpResponse => ({ status, headers: {}, body: '' });
const multi = (
  entries: { href: string; props?: Record<string, string | null> }[],
): MultiStatusResponse[] =>
  entries.map((e) => ({ href: e.href, status: '', props: e.props ?? {} }));

describe('fetchTasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('happy path: query + multiget + vtodoToTask produces Task[]', async () => {
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([{ href: '/cal/a.ics' }, { href: '/cal/b.ics' }]),
    );
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([
        { href: '/cal/a.ics', props: { 'calendar-data': 'V-A', getetag: '"e-a"' } },
        { href: '/cal/b.ics', props: { 'calendar-data': 'V-B', getetag: '"e-b"' } },
      ]),
    );
    const taskA = makeTask({ uid: 'a' });
    const taskB = makeTask({ uid: 'b' });
    vi.mocked(ical.vtodoToTask).mockReturnValueOnce(taskA).mockReturnValueOnce(taskB);

    const result = await fetchTasks(conn, 'acct', calendar);

    expect(result).toEqual([taskA, taskB]);
    expect(http.report).toHaveBeenCalledTimes(2);
  });

  it('returns [] when calendar-query returns zero results', async () => {
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce([]);

    const result = await fetchTasks(conn, 'acct', calendar);

    expect(result).toEqual([]);
    expect(http.report).toHaveBeenCalledTimes(1); // no multiget
  });

  it('returns [] for single-result Radicale quirk (result matches calendar collection)', async () => {
    // radicale returns the calendar URL itself in queries against empty calendars.
    // with queryResults.length === 1 and the href filtered out, fetchTasks should
    // return [] rather than null
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(multi([{ href: '/calendars/default/' }]));

    const result = await fetchTasks(conn, 'acct', calendar);

    expect(result).toEqual([]);
    expect(http.report).toHaveBeenCalledTimes(1);
  });

  it('returns null when calendar-query fails (non-207)', async () => {
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(500));

    const result = await fetchTasks(conn, 'acct', calendar);

    expect(result).toBeNull();
  });

  it('returns null when multiget fails (non-207)', async () => {
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(multi([{ href: '/cal/a.ics' }]));
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(503));

    const result = await fetchTasks(conn, 'acct', calendar);

    expect(result).toBeNull();
  });

  it('filters out hrefs that do not end in .ics', async () => {
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([
        { href: '/cal/a.ics' },
        { href: '/cal/junk.txt' }, // filtered
        { href: '/cal/b.ics' },
      ]),
    );
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([
        { href: '/cal/a.ics', props: { 'calendar-data': 'V-A' } },
        { href: '/cal/b.ics', props: { 'calendar-data': 'V-B' } },
      ]),
    );
    vi.mocked(ical.vtodoToTask)
      .mockReturnValueOnce(makeTask({ uid: 'a' }))
      .mockReturnValueOnce(makeTask({ uid: 'b' }));

    await fetchTasks(conn, 'acct', calendar);

    // verify the multiget body only contains the .ics hrefs
    const multigetBody = vi.mocked(http.report).mock.calls[1][2];
    expect(multigetBody).toContain('/cal/a.ics');
    expect(multigetBody).toContain('/cal/b.ics');
    expect(multigetBody).not.toContain('/cal/junk.txt');
  });

  it('filters out the calendar collection URL from hrefs', async () => {
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([
        { href: '/calendars/default/' }, // the calendar URL itself, filtered
        { href: '/cal/a.ics' },
      ]),
    );
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([{ href: '/cal/a.ics', props: { 'calendar-data': 'V-A' } }]),
    );
    vi.mocked(ical.vtodoToTask).mockReturnValueOnce(makeTask({ uid: 'a' }));

    await fetchTasks(conn, 'acct', calendar);

    const multigetBody = vi.mocked(http.report).mock.calls[1][2];
    expect(multigetBody).not.toContain('/calendars/default/');
  });

  it('returns null when query has many results but all hrefs are filtered out', async () => {
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([
        { href: '/junk1.txt' },
        { href: '/junk2.txt' },
        { href: '' }, // also filtered
      ]),
    );

    const result = await fetchTasks(conn, 'acct', calendar);

    expect(result).toBeNull(); // signals a server issue, not "empty calendar"
  });

  it('skips multiget entries with no calendar-data', async () => {
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([{ href: '/cal/a.ics' }, { href: '/cal/b.ics' }]),
    );
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([
        { href: '/cal/a.ics', props: { 'calendar-data': 'V-A' } },
        { href: '/cal/b.ics', props: {} }, // no calendar-data - should be skipped
      ]),
    );
    vi.mocked(ical.vtodoToTask).mockReturnValueOnce(makeTask({ uid: 'a' }));

    const result = await fetchTasks(conn, 'acct', calendar);

    expect(result).toHaveLength(1);
    expect(ical.vtodoToTask).toHaveBeenCalledTimes(1);
  });

  it('skips results when vtodoToTask returns null', async () => {
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([{ href: '/cal/a.ics' }, { href: '/cal/b.ics' }]),
    );
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([
        { href: '/cal/a.ics', props: { 'calendar-data': 'V-A' } },
        { href: '/cal/b.ics', props: { 'calendar-data': 'V-B' } },
      ]),
    );
    vi.mocked(ical.vtodoToTask)
      .mockReturnValueOnce(null) // first task fails to parse
      .mockReturnValueOnce(makeTask({ uid: 'b' }));

    const result = await fetchTasks(conn, 'acct', calendar);

    expect(result).toHaveLength(1);
    expect(result?.[0].uid).toBe('b');
  });

  it('absolutizes relative hrefs against serverUrl when calling vtodoToTask', async () => {
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(multi([{ href: '/cal/a.ics' }]));
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
      multi([{ href: '/cal/a.ics', props: { 'calendar-data': 'V-A', getetag: '"e1"' } }]),
    );
    vi.mocked(ical.vtodoToTask).mockReturnValueOnce(makeTask({ uid: 'a' }));

    await fetchTasks(conn, 'acct', calendar);

    expect(ical.vtodoToTask).toHaveBeenCalledWith(
      'V-A',
      'acct',
      'cal-1',
      'https://cal.example.com/cal/a.ics',
      'e1',
    );
  });
});
