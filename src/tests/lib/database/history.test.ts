import type DatabasePlugin from '@tauri-apps/plugin-sql';
import { describe, expect, it, vi } from 'vitest';
import { logHistoryForTaskUpdates } from '$lib/database/history';
import { makeTask } from '../../fixtures';

describe('database task history batches', () => {
  it('inserts changes below SQLite’s bound parameter limit', async () => {
    const connection = {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as DatabasePlugin;
    const taskUpdates = Array.from({ length: 151 }, (_, index) => ({
      taskUid: `uid-${index}`,
      oldTask: makeTask({ uid: `uid-${index}`, priority: 'none' }),
      updates: { priority: 'high' as const },
    }));

    await logHistoryForTaskUpdates(connection, taskUpdates);

    expect(connection.execute).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(connection.execute).mock.calls;
    expect(calls[0][1]).toHaveLength(150 * 6);
    expect(calls[1][1]).toHaveLength(6);
    expect(String(calls[0][0])).toContain('$900');
    expect(String(calls[1][0])).toContain('VALUES ($1,$2,$3,$4,$5,$6)');
  });
});
