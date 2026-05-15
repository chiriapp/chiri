import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Connection } from '$lib/caldav/connection';
import { createTask, deleteTask, updateTask } from '$lib/caldav/tasks';
import type { HttpResponse, MultiStatusResponse } from '$lib/tauri-http';
import * as http from '$lib/tauri-http';
import type { Calendar, Task } from '$types';

// mock the entire tauri-http module. all functions call into Tauri IPC which
// isn't available outside the Tauri runtime
vi.mock('$lib/tauri-http', () => ({
  put: vi.fn(),
  propfind: vi.fn(),
  parseMultiStatus: vi.fn(),
  report: vi.fn(),
  del: vi.fn(),
}));

// mock vtodo conversion. pure iCal logic, but may transitively pull in modules
// we don't want evaluated in a Node environment
vi.mock('$lib/ical/vtodo', () => ({
  taskToVTodo: vi.fn(() => 'BEGIN:VCALENDAR\r\nEND:VCALENDAR'),
  vtodoToTask: vi.fn(),
}));

// mock utils to provide real pure-function implementations but a no-op logger,
// avoiding the @tauri-apps/plugin-log dependency chain
vi.mock('$lib/caldav/utils', () => ({
  cleanEtag: (etag?: string | null) => etag?.replace(/"/g, '') ?? '',
  normalizeUrl: (url: string) => url.replace(/\/$/, ''),
  makeAbsoluteUrl: (href: string, base: string) =>
    href.startsWith('http') ? href : new URL(href, base).toString(),
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const ok = (status: number, headers: Record<string, string> = {}): HttpResponse => ({
  status,
  headers,
  body: '',
});

// test fixtures: partial objects cast through `unknown` because the production
// types require many fields the code under test never reads
const conn = { credentials: { username: 'user', password: 'pass' } } as unknown as Connection;
const calendar = { url: 'https://cal.example.com/calendars/default/' } as unknown as Calendar;
const task = { uid: 'test-uid-123' } as unknown as Task;
const expectedHref = 'https://cal.example.com/calendars/default/test-uid-123.ics';

describe('createTask', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns href and etag on 201', async () => {
    vi.mocked(http.put).mockResolvedValueOnce(ok(201, { etag: '"etag-abc"' }));

    expect(await createTask(conn, calendar, task)).toEqual({
      href: expectedHref,
      etag: 'etag-abc',
    });
  });

  it('returns href and etag on 204', async () => {
    vi.mocked(http.put).mockResolvedValueOnce(ok(204, { etag: '"etag-abc"' }));

    expect(await createTask(conn, calendar, task)).toEqual({
      href: expectedHref,
      etag: 'etag-abc',
    });
  });

  describe('409 Conflict — task already exists on server', () => {
    it('fetches etag via PROPFIND and returns href+etag', async () => {
      vi.mocked(http.put).mockResolvedValueOnce(ok(409));
      vi.mocked(http.propfind).mockResolvedValueOnce(ok(207));
      vi.mocked(http.parseMultiStatus).mockReturnValueOnce([
        {
          props: { getetag: '"server-etag"' },
          href: expectedHref,
          status: '',
        } as MultiStatusResponse,
      ]);

      expect(await createTask(conn, calendar, task)).toEqual({
        href: expectedHref,
        etag: 'server-etag',
      });
    });

    it('sends PROPFIND to the correct URL with depth 0', async () => {
      vi.mocked(http.put).mockResolvedValueOnce(ok(409));
      vi.mocked(http.propfind).mockResolvedValueOnce(ok(207));
      vi.mocked(http.parseMultiStatus).mockReturnValueOnce([
        { props: { getetag: '"e"' }, href: expectedHref, status: '' } as MultiStatusResponse,
      ]);

      await createTask(conn, calendar, task);

      expect(http.propfind).toHaveBeenCalledWith(
        expectedHref,
        conn.credentials,
        expect.stringContaining('getetag'),
        '0',
      );
    });

    it('returns null when PROPFIND fails after 409', async () => {
      vi.mocked(http.put).mockResolvedValueOnce(ok(409));
      vi.mocked(http.propfind).mockResolvedValueOnce(ok(404));

      expect(await createTask(conn, calendar, task)).toBeNull();
    });
  });

  it('returns null on unexpected PUT status', async () => {
    vi.mocked(http.put).mockResolvedValueOnce(ok(500));

    expect(await createTask(conn, calendar, task)).toBeNull();
    expect(http.propfind).not.toHaveBeenCalled();
  });

  it('returns null when PUT throws', async () => {
    vi.mocked(http.put).mockRejectedValueOnce(new Error('network error'));

    expect(await createTask(conn, calendar, task)).toBeNull();
  });
});

describe('updateTask', () => {
  const existingTask = {
    uid: 'abc',
    href: 'https://cal.example.com/calendars/default/abc.ics',
    etag: 'old-etag',
  } as unknown as Task;

  beforeEach(() => vi.clearAllMocks());

  it('returns new etag on 200', async () => {
    vi.mocked(http.put).mockResolvedValueOnce(ok(200, { etag: '"new-etag"' }));

    expect(await updateTask(conn, existingTask)).toEqual({ etag: 'new-etag' });
  });

  it('returns new etag on 204 (no content, common for updates)', async () => {
    vi.mocked(http.put).mockResolvedValueOnce(ok(204, { etag: '"new-etag"' }));

    expect(await updateTask(conn, existingTask)).toEqual({ etag: 'new-etag' });
  });

  it('returns new etag on 201 (some servers return Created on overwrite)', async () => {
    vi.mocked(http.put).mockResolvedValueOnce(ok(201, { etag: '"new-etag"' }));

    expect(await updateTask(conn, existingTask)).toEqual({ etag: 'new-etag' });
  });

  it('passes the old etag for If-Match conditional update', async () => {
    vi.mocked(http.put).mockResolvedValueOnce(ok(204, { etag: '"x"' }));

    await updateTask(conn, existingTask);

    expect(http.put).toHaveBeenCalledWith(
      existingTask.href,
      conn.credentials,
      expect.any(String),
      'old-etag',
    );
  });

  it('returns null when task has no href', async () => {
    expect(await updateTask(conn, { uid: 'abc' } as unknown as Task)).toBeNull();
    expect(http.put).not.toHaveBeenCalled();
  });

  it('returns null on 412 Precondition Failed (etag mismatch)', async () => {
    vi.mocked(http.put).mockResolvedValueOnce(ok(412));

    expect(await updateTask(conn, existingTask)).toBeNull();
  });

  it('returns null on 404 (resource gone)', async () => {
    vi.mocked(http.put).mockResolvedValueOnce(ok(404));

    expect(await updateTask(conn, existingTask)).toBeNull();
  });

  it('returns null when PUT throws', async () => {
    vi.mocked(http.put).mockRejectedValueOnce(new Error('network'));

    expect(await updateTask(conn, existingTask)).toBeNull();
  });

  it('returns empty string etag if server omits the header (current behavior)', async () => {
    vi.mocked(http.put).mockResolvedValueOnce(ok(204));

    expect(await updateTask(conn, existingTask)).toEqual({ etag: '' });
  });
});

describe('deleteTask', () => {
  const existingTask = {
    uid: 'abc',
    href: 'https://cal.example.com/calendars/default/abc.ics',
    etag: 'tag',
  } as unknown as Task;

  beforeEach(() => vi.clearAllMocks());

  it('returns true on 204', async () => {
    vi.mocked(http.del).mockResolvedValueOnce(ok(204));

    expect(await deleteTask(conn, existingTask)).toBe(true);
  });

  it('returns true on 200', async () => {
    vi.mocked(http.del).mockResolvedValueOnce(ok(200));

    expect(await deleteTask(conn, existingTask)).toBe(true);
  });

  it('passes the etag for If-Match conditional delete', async () => {
    vi.mocked(http.del).mockResolvedValueOnce(ok(204));

    await deleteTask(conn, existingTask);

    expect(http.del).toHaveBeenCalledWith(existingTask.href, conn.credentials, 'tag');
  });

  it('returns false on 412 (etag mismatch — task changed before delete)', async () => {
    vi.mocked(http.del).mockResolvedValueOnce(ok(412));

    expect(await deleteTask(conn, existingTask)).toBe(false);
  });

  it('returns false on 404 (already deleted)', async () => {
    vi.mocked(http.del).mockResolvedValueOnce(ok(404));

    expect(await deleteTask(conn, existingTask)).toBe(false);
  });

  it('returns false when task has no href', async () => {
    expect(await deleteTask(conn, { uid: 'abc' } as unknown as Task)).toBe(false);
    expect(http.del).not.toHaveBeenCalled();
  });

  it('returns false when DELETE throws', async () => {
    vi.mocked(http.del).mockRejectedValueOnce(new Error('network'));

    expect(await deleteTask(conn, existingTask)).toBe(false);
  });
});
