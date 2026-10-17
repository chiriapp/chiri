import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTask } from '../../fixtures';

const mocks = vi.hoisted(() => ({
  getUIState: vi.fn(),
  settingsState: {
    defaultCalendarId: null,
    defaultPriority: 'none' as const,
    defaultTags: ['default-tag'],
  },
}));

vi.mock('$context/settingsContext', () => ({
  settingsStore: { getState: () => mocks.settingsState },
}));

vi.mock('$lib/database/accounts', () => ({ getAllAccounts: vi.fn() }));
vi.mock('$lib/database/converters', () => ({ rowToTask: vi.fn() }));
vi.mock('$lib/database/ui', () => ({
  getUIState: mocks.getUIState,
  setSelectedTask: vi.fn(),
}));
vi.mock('$lib/ical/vtodo', () => ({ toAppleEpoch: vi.fn(() => 0) }));

import { createTask, createTasks, upsertTasks } from '$lib/database/tasks';

describe('database task creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUIState.mockResolvedValue({
      activeTagId: 'tag-b',
      activeCalendarId: null,
      activeAccountId: null,
    });
  });

  it('persists remote tags without applying UI tag defaults', async () => {
    const connection = {
      select: vi.fn().mockResolvedValue([{ max_order: null }]),
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as DatabasePlugin;

    const task = await createTask(
      connection,
      makeTask({ id: 'remote-id', uid: 'remote-uid', tags: ['tag-a'], synced: true }),
      { source: 'remote' },
    );

    expect(task.tags).toEqual(['tag-a']);
    const params = vi.mocked(connection.execute).mock.calls[0]?.[1] as unknown[];
    expect(params[8]).toBe(JSON.stringify(['tag-a']));
  });

  it('inserts task batches below SQLite’s bound parameter limit', async () => {
    const connection = {
      select: vi.fn(),
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as DatabasePlugin;
    const tasks = Array.from({ length: 31 }, (_, index) =>
      makeTask({ id: `id-${index}`, uid: `uid-${index}` }),
    );

    await createTasks(connection, tasks);

    expect(connection.execute).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(connection.execute).mock.calls;
    expect(calls[0][1]).toHaveLength(29 * 31);
    expect(calls[1][1]).toHaveLength(2 * 31);
    expect(String(calls[0][0])).toContain('$899');
    expect(String(calls[0][0])).not.toContain('$900');
    expect(String(calls[1][0])).toContain('VALUES ($1,');
  });

  it('upserts task batches without replacing rows', async () => {
    const connection = {
      select: vi.fn(),
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as DatabasePlugin;
    const tasks = Array.from({ length: 31 }, (_, index) =>
      makeTask({ id: `id-${index}`, uid: `uid-${index}`, title: `Updated ${index}` }),
    );

    await upsertTasks(connection, tasks);

    expect(connection.execute).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(connection.execute).mock.calls;
    expect(calls[0][1]).toHaveLength(29 * 31);
    expect(calls[1][1]).toHaveLength(2 * 31);
    expect(String(calls[0][0])).toContain('ON CONFLICT(id) DO UPDATE SET');
    expect(String(calls[0][0])).toContain('created_at = excluded.created_at');
    expect(String(calls[0][0])).not.toContain('INSERT OR REPLACE');
  });
});
