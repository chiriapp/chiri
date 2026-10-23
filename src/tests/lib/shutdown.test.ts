import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  flushPreferences: vi.fn(),
  flushSnoozes: vi.fn(),
  invoke: vi.fn(),
  listen: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));
vi.mock('@tauri-apps/api/event', () => ({ listen: mocks.listen }));
vi.mock('$context/settingsContext', () => ({
  settingsStore: { flush: mocks.flushPreferences },
}));
vi.mock('$lib/notifications/snoozes', () => ({ flushTaskSnoozes: mocks.flushSnoozes }));
vi.mock('$lib/logger', () => ({ loggers: { main: { error: mocks.logError } } }));

describe('shutdown handler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.flushPreferences.mockResolvedValue(undefined);
    mocks.flushSnoozes.mockResolvedValue(undefined);
    mocks.invoke.mockResolvedValue(undefined);
    mocks.listen.mockResolvedValue(vi.fn());
  });

  it('flushes local writes before forcing an explicit native quit', async () => {
    const { initializeShutdownHandler } = await import('$lib/shutdown');
    await initializeShutdownHandler();
    const handler = mocks.listen.mock.calls[0][1] as () => Promise<void>;

    await handler();

    expect(mocks.flushPreferences).toHaveBeenCalledOnce();
    expect(mocks.flushSnoozes).toHaveBeenCalledOnce();
    expect(mocks.invoke).toHaveBeenCalledWith('force_quit');
  });

  it('still quits after reporting a failed flush', async () => {
    mocks.flushPreferences.mockRejectedValue(new Error('disk full'));
    const { initializeShutdownHandler } = await import('$lib/shutdown');
    await initializeShutdownHandler();
    const handler = mocks.listen.mock.calls[0][1] as () => Promise<void>;

    await handler();

    expect(mocks.logError).toHaveBeenCalledWith(
      'Failed to flush local state before quitting:',
      expect.any(Error),
    );
    expect(mocks.invoke).toHaveBeenCalledWith('force_quit');
  });
});
