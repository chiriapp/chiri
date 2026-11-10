import { describe, expect, it, vi } from 'vitest';

vi.unmock('$lib/logger');

const tauriInfo = vi.fn();
const tauriError = vi.fn();

vi.mock('@tauri-apps/plugin-log', () => ({
  debug: vi.fn(),
  error: (...args: unknown[]) => tauriError(...args),
  info: (...args: unknown[]) => tauriInfo(...args),
  warn: vi.fn(),
}));

import { loggers } from '$lib/logger';

describe('logger arg rendering', () => {
  it('appends context as prose instead of a JSON blob', () => {
    loggers.database.info('Attempted to set non-existent account as active', { accountId: 'abc' });

    expect(tauriInfo).toHaveBeenCalledWith(
      '[Database] Attempted to set non-existent account as active (accountId: abc)',
    );
  });

  it('flattens nested objects with dotted keys', () => {
    loggers.sync.info('Skipping sync', {
      requestedBy: { source: 'auto-reconnect', where: 'useOffline.onOnline' },
    });

    expect(tauriInfo).toHaveBeenCalledWith(
      '[Sync] Skipping sync (requestedBy.source: auto-reconnect, requestedBy.where: useOffline.onOnline)',
    );
  });

  it('carries only the message of an error', () => {
    loggers.database.error('Failed to persist calendar:', new Error('database is locked'));

    expect(tauriError).toHaveBeenCalledWith(
      '[Database] Failed to persist calendar: (database is locked)',
    );
  });

  it('leaves the message alone when there is no context', () => {
    loggers.database.info('Opened chiri.db', {});

    expect(tauriInfo).toHaveBeenCalledWith('[Database] Opened chiri.db');
  });
});
