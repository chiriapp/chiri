import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataStore } from '$types/store/state';

const mocks = vi.hoisted(() => ({
  state: null as DataStore | null,
  save: vi.fn((data: DataStore) => {
    mocks.state = data;
  }),
  setSearchQuery: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$lib/database', () => ({
  db: { setSearchQuery: mocks.setSearchQuery },
}));

vi.mock('$lib/logger', () => ({
  loggers: { dataStore: { error: vi.fn(), warn: vi.fn() } },
}));

vi.mock('$lib/store', () => ({
  dataStore: {
    load: () => mocks.state,
    save: mocks.save,
  },
}));

import { setSearchQuery } from '$lib/store/ui';

describe('setSearchQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.state = {
      tasks: [],
      tags: [],
      filters: [],
      accounts: [],
      pendingDeletions: [],
      ui: { searchQuery: '' } as DataStore['ui'],
    };
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('updates memory immediately and coalesces rapid database writes', () => {
    setSearchQuery('nee');
    setSearchQuery('needle');

    expect(mocks.state?.ui.searchQuery).toBe('needle');
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(mocks.setSearchQuery).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);

    expect(mocks.setSearchQuery).toHaveBeenCalledOnce();
    expect(mocks.setSearchQuery).toHaveBeenCalledWith('needle', { notify: false });
  });
});
