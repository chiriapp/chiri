import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { describe, expect, it, vi } from 'vitest';
import type { CalDAVTaskObject } from '$lib/caldav/types';
import { upsertCalDAVTaskObjects } from '$lib/database/caldav';

describe('CalDAV task object persistence', () => {
  it('upserts object batches below SQLite’s bound parameter limit', async () => {
    const connection = {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as DatabasePlugin;
    const objects: CalDAVTaskObject[] = Array.from({ length: 129 }, (_, index) => ({
      taskUid: `uid-${index}`,
      accountId: 'account-1',
      calendarId: 'calendar-1',
      href: `/calendar/uid-${index}.ics`,
      etag: `etag-${index}`,
      vtodo: `BEGIN:VTODO\nUID:uid-${index}\nEND:VTODO`,
      lastSyncAt: new Date('2026-10-15T00:00:00.000Z'),
    }));

    await upsertCalDAVTaskObjects(connection, objects);

    expect(connection.execute).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(connection.execute).mock.calls;
    expect(calls[0][1]).toHaveLength(128 * 7);
    expect(calls[1][1]).toHaveLength(7);
    expect(String(calls[0][0])).toContain('$896');
    expect(String(calls[0][0])).not.toContain('$897');
    expect(String(calls[0][0])).toContain('INSERT OR REPLACE INTO caldav_task_objects');
  });
});
