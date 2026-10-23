import { describe, expect, it, vi } from 'vitest';
import { LEGACY_SNOOZE_STORAGE_KEY, TaskSnoozeStore } from '$lib/notifications/snoozes';

vi.mock('$lib/logger', () => ({
  loggers: { notifications: { error: vi.fn(), warn: vi.fn() } },
}));

const createLegacyStorage = (value?: Record<string, number>) => {
  const values = new Map<string, string>();
  if (value) values.set(LEGACY_SNOOZE_STORAGE_KEY, JSON.stringify(value));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    removeItem: vi.fn((key: string) => values.delete(key)),
    values,
  };
};

const createDatabase = () => ({
  getTaskSnoozes: vi.fn<() => Promise<Array<[string, number]>>>(),
  setTaskSnooze: vi.fn().mockResolvedValue(undefined),
  clearTaskSnooze: vi.fn().mockResolvedValue(undefined),
  hasImportedLegacyTaskSnoozes: vi.fn<() => Promise<boolean>>(),
  importLegacyTaskSnoozes: vi.fn().mockResolvedValue(undefined),
});

describe('task snooze store', () => {
  it('imports valid legacy snoozes once and removes localStorage afterward', async () => {
    const database = createDatabase();
    database.getTaskSnoozes
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([['active-task', 2_000]]);
    database.hasImportedLegacyTaskSnoozes.mockResolvedValue(false);
    const storage = createLegacyStorage({
      'active-task': 2_000,
      expired: 500,
      invalid: Number.NaN,
    });
    const store = new TaskSnoozeStore(database, storage);

    await store.initialize(1_000);

    expect(database.importLegacyTaskSnoozes).toHaveBeenCalledWith([['active-task', 2_000]]);
    expect(store.getSnoozes()).toEqual(new Map([['active-task', 2_000]]));
    expect(storage.values.has(LEGACY_SNOOZE_STORAGE_KEY)).toBe(false);
  });

  it('keeps SQLite authoritative after the legacy migration marker exists', async () => {
    const database = createDatabase();
    database.getTaskSnoozes.mockResolvedValue([['database-task', 3_000]]);
    database.hasImportedLegacyTaskSnoozes.mockResolvedValue(true);
    const storage = createLegacyStorage({ 'legacy-task': 4_000 });
    const store = new TaskSnoozeStore(database, storage);

    await store.initialize(1_000);

    expect(database.importLegacyTaskSnoozes).not.toHaveBeenCalled();
    expect(store.getSnoozes()).toEqual(new Map([['database-task', 3_000]]));
    expect(storage.values.has(LEGACY_SNOOZE_STORAGE_KEY)).toBe(false);
  });

  it('serializes snooze writes and flushes them in order', async () => {
    let finishSet: (() => void) | undefined;
    const database = createDatabase();
    database.setTaskSnooze.mockReturnValue(
      new Promise<void>((resolve) => {
        finishSet = resolve;
      }),
    );
    const store = new TaskSnoozeStore(database, createLegacyStorage());
    const until = Date.now() + 60_000;

    store.snoozeUntil('task-1', until);
    store.clear('task-1');
    await vi.waitFor(() => expect(database.setTaskSnooze).toHaveBeenCalledWith('task-1', until));

    expect(database.clearTaskSnooze).not.toHaveBeenCalled();

    finishSet?.();
    await store.flush();
    expect(database.clearTaskSnooze).toHaveBeenCalledWith('task-1');
  });

  it('retains a failed write for a later flush retry', async () => {
    const database = createDatabase();
    database.setTaskSnooze
      .mockRejectedValueOnce(new Error('temporarily unavailable'))
      .mockResolvedValueOnce(undefined);
    const store = new TaskSnoozeStore(database, createLegacyStorage());

    store.snoozeUntil('task-1', Date.now() + 60_000);
    await expect(store.flush()).rejects.toThrow('temporarily unavailable');
    await store.flush();

    expect(database.setTaskSnooze).toHaveBeenCalledTimes(2);
    expect(database.setTaskSnooze.mock.calls[1]).toEqual(database.setTaskSnooze.mock.calls[0]);
  });
});
