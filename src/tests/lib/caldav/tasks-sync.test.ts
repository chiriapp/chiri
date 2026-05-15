import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpResponse, MultiStatusResponse } from '$lib/tauri-http';
import type { Task } from '$types';
import { makeCalendar, makeConnection, makeTask } from '../../fixtures';

// syncCalendar internally calls fetchTasks (same module). ESM bindings mean we
// can't replace fetchTasks via vi.mock. mock the layer below (http + ical)
// instead, and drive the fetchTasks pipeline by controlling those responses
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

import { syncCalendar } from '$lib/caldav/tasks';
import * as ical from '$lib/ical/vtodo';
import * as http from '$lib/tauri-http';

const conn = makeConnection();
const calendar = makeCalendar({ id: 'cal-1', url: 'https://cal.example.com/calendars/default/' });

const httpOk = (status: number): HttpResponse => ({ status, headers: {}, body: '' });

const mkMulti = (
  entries: { href: string; props: Record<string, string | null> }[],
): MultiStatusResponse[] => entries.map((e) => ({ href: e.href, status: '', props: e.props }));

/**
 * sets up the mock chain so that fetchTasks (called internally by syncCalendar)
 * resolves to the given remote tasks - or to null if `null` is passed
 */
const stubRemote = (remoteTasks: Task[] | null) => {
  if (remoteTasks === null) {
    vi.mocked(http.report).mockResolvedValueOnce(httpOk(500));
    return;
  }
  // first REPORT (calendar-query) succeeds
  vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
  if (remoteTasks.length === 0) {
    vi.mocked(http.parseMultiStatus).mockReturnValueOnce([]);
    return;
  }
  // parseMultiStatus on the query result: one href per remote task
  vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
    mkMulti(remoteTasks.map((t) => ({ href: `/cal/${t.uid}.ics`, props: {} }))),
  );
  // second REPORT (multiget) succeeds
  vi.mocked(http.report).mockResolvedValueOnce(httpOk(207));
  // parseMultiStatus on the multiget result: calendar-data + etag per href
  vi.mocked(http.parseMultiStatus).mockReturnValueOnce(
    mkMulti(
      remoteTasks.map((t) => ({
        href: `/cal/${t.uid}.ics`,
        props: { 'calendar-data': 'VTODO-stub', getetag: `"${t.etag ?? ''}"` },
      })),
    ),
  );
  // vtodoToTask returns the canned Task per result
  for (const t of remoteTasks) {
    vi.mocked(ical.vtodoToTask).mockReturnValueOnce(t);
  }
};

describe('syncCalendar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when fetchTasks returns null (avoid data loss)', async () => {
    stubRemote(null);

    expect(await syncCalendar(conn, 'acct', calendar, [])).toBeNull();
  });

  it('treats a remote task absent locally as `created`', async () => {
    const remoteOnly = makeTask({ uid: 'new-remote', etag: 'r1' });
    stubRemote([remoteOnly]);

    const result = await syncCalendar(conn, 'acct', calendar, []);

    expect(result?.created).toEqual([remoteOnly]);
    expect(result?.updated).toEqual([]);
    expect(result?.deleted).toEqual([]);
  });

  it('treats a remote task with a different etag than local as `updated`', async () => {
    const local = makeTask({ id: 'local-id', uid: 'shared', etag: 'old' });
    const remote = makeTask({ id: 'remote-id-ignored', uid: 'shared', etag: 'new' });
    stubRemote([remote]);

    const result = await syncCalendar(conn, 'acct', calendar, [local]);

    // updated entry uses remote data but preserves the local id
    expect(result?.updated).toHaveLength(1);
    expect(result?.updated[0].id).toBe('local-id');
    expect(result?.updated[0].etag).toBe('new');
    expect(result?.created).toEqual([]);
    expect(result?.deleted).toEqual([]);
  });

  it('ignores a remote task whose etag matches local (no-op)', async () => {
    const local = makeTask({ uid: 'same', etag: 'tag' });
    const remote = makeTask({ uid: 'same', etag: 'tag' });
    stubRemote([remote]);

    const result = await syncCalendar(conn, 'acct', calendar, [local]);

    expect(result?.created).toEqual([]);
    expect(result?.updated).toEqual([]);
    expect(result?.deleted).toEqual([]);
  });

  it('marks a synced local task absent remotely as `deleted` (by id)', async () => {
    const local = makeTask({ id: 'gone-id', uid: 'gone', synced: true });
    stubRemote([]);

    const result = await syncCalendar(conn, 'acct', calendar, [local]);

    expect(result?.deleted).toEqual(['gone-id']);
  });

  it('does NOT delete an UNSYNCED local task absent remotely (new local task)', async () => {
    // critical: protects newly-created local tasks that haven't been pushed yet.
    // they show up as "missing" remotely but they're brand new, not deleted
    const local = makeTask({ id: 'fresh-id', uid: 'fresh', synced: false });
    stubRemote([]);

    const result = await syncCalendar(conn, 'acct', calendar, [local]);

    expect(result?.deleted).toEqual([]);
    expect(result?.created).toEqual([]);
    expect(result?.updated).toEqual([]);
  });

  it('returns empty buckets for empty remote and empty local', async () => {
    stubRemote([]);

    const result = await syncCalendar(conn, 'acct', calendar, []);

    expect(result).toEqual({ created: [], updated: [], deleted: [] });
  });

  it('handles a mixed scenario: create + update + delete in one pass', async () => {
    const localKeep = makeTask({ id: 'keep', uid: 'keep', etag: 'k', synced: true });
    const localUpdate = makeTask({ id: 'upd', uid: 'upd', etag: 'old', synced: true });
    const localDelete = makeTask({ id: 'del', uid: 'del', etag: 'd', synced: true });
    const localUnsynced = makeTask({ id: 'new', uid: 'new', synced: false });

    const remoteKeep = makeTask({ uid: 'keep', etag: 'k' });
    const remoteUpdate = makeTask({ uid: 'upd', etag: 'newer' });
    const remoteCreate = makeTask({ uid: 'fresh-remote', etag: 'r' });

    stubRemote([remoteKeep, remoteUpdate, remoteCreate]);

    const result = await syncCalendar(conn, 'acct', calendar, [
      localKeep,
      localUpdate,
      localDelete,
      localUnsynced,
    ]);

    expect(result?.created.map((t: Task) => t.uid)).toEqual(['fresh-remote']);
    expect(result?.updated.map((t: Task) => t.id)).toEqual(['upd']);
    expect(result?.deleted).toEqual(['del']);
  });
});
