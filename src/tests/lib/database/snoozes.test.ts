import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { describe, expect, it, vi } from 'vitest';
import { getTaskSnoozes, importLegacyTaskSnoozes, setTaskSnooze } from '$lib/database/snoozes';

const createConnection = () => ({
  execute: vi.fn().mockResolvedValue(undefined),
  select: vi.fn(),
});

describe('task snooze database operations', () => {
  it('cleans invalid rows and returns persisted snoozes', async () => {
    const connection = createConnection();
    connection.select.mockResolvedValue([{ task_id: 'task-1', snoozed_until: 2_000 }]);

    await expect(getTaskSnoozes(connection as unknown as DatabasePlugin, 1_000)).resolves.toEqual([
      ['task-1', 2_000],
    ]);
    expect(connection.execute.mock.calls[0][0]).toContain('task_id NOT IN');
  });

  it('upserts individual snoozes', async () => {
    const connection = createConnection();
    await setTaskSnooze(connection as unknown as DatabasePlugin, 'task-1', 2_000);

    expect(connection.execute).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT'), [
      'task-1',
      2_000,
    ]);
  });

  it('imports only existing tasks before recording migration completion', async () => {
    const connection = createConnection();
    await importLegacyTaskSnoozes(connection as unknown as DatabasePlugin, [['task-1', 2_000]]);

    expect(connection.execute.mock.calls[0][0]).toContain('WHERE EXISTS');
    expect(connection.execute.mock.calls[1][0]).toContain('app_metadata');
  });
});
