import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultState } from '$context/settingsDefaults';
import {
  LEGACY_PREFERENCES_KEYS,
  PREFERENCES_SCHEMA_VERSION,
  PreferencesPersistence,
} from '$lib/preferences/persistence';
import type { PreferencesRepository } from '$lib/preferences/repository';

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: () => 'macos',
}));

const createRepository = () => ({
  load: vi.fn(),
  save: vi.fn(),
});

const createLegacyStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    removeItem: vi.fn((key: string) => values.delete(key)),
    values,
  };
};

describe('preferences persistence', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads SQLite preferences as the source of truth', async () => {
    const repository = createRepository();
    repository.load.mockResolvedValue({
      schemaVersion: PREFERENCES_SCHEMA_VERSION,
      stateJson: JSON.stringify({ ...defaultState, theme: 'dark' }),
      updatedAt: '2026-09-10T00:00:00.000Z',
    });
    const legacyStorage = createLegacyStorage({
      'chiri-settings': JSON.stringify({ state: { theme: 'light' } }),
    });
    const persistence = new PreferencesPersistence(
      repository as unknown as PreferencesRepository,
      legacyStorage,
    );

    const result = await persistence.load(defaultState);

    expect(result.state.theme).toBe('dark');
    expect(repository.save).not.toHaveBeenCalled();
    expect(legacyStorage.values.size).toBe(0);
  });

  it('loads SQLite preferences when legacy storage is unavailable', async () => {
    const repository = createRepository();
    repository.load.mockResolvedValue({
      schemaVersion: PREFERENCES_SCHEMA_VERSION,
      stateJson: JSON.stringify({ ...defaultState, theme: 'dark' }),
      updatedAt: '2026-09-10T00:00:00.000Z',
    });
    const persistence = new PreferencesPersistence(
      repository as unknown as PreferencesRepository,
      undefined,
    );
    const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('Access denied', 'SecurityError');
      },
    });

    try {
      const result = await persistence.load(defaultState);
      expect(result.state.theme).toBe('dark');
    } finally {
      if (localStorageDescriptor) {
        Object.defineProperty(globalThis, 'localStorage', localStorageDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'localStorage');
      }
    }
  });

  it('imports legacy localStorage only after SQLite has no document', async () => {
    const repository = createRepository();
    repository.load.mockResolvedValue(null);
    repository.save.mockResolvedValue(undefined);
    const legacyStorage = createLegacyStorage({
      'chiri-settings': JSON.stringify({ state: { theme: 'dark' } }),
      'caldav-tasks-settings': JSON.stringify({ state: { theme: 'light' } }),
    });
    const persistence = new PreferencesPersistence(
      repository as unknown as PreferencesRepository,
      legacyStorage,
    );

    const result = await persistence.load(defaultState);

    expect(result.state.theme).toBe('dark');
    expect(repository.save).toHaveBeenCalledWith({
      schemaVersion: PREFERENCES_SCHEMA_VERSION,
      stateJson: JSON.stringify(result.state),
    });
    expect(legacyStorage.removeItem).toHaveBeenCalledTimes(LEGACY_PREFERENCES_KEYS.length);
    expect(legacyStorage.values.size).toBe(0);
  });

  it('keeps legacy data when its first SQLite write fails', async () => {
    const repository = createRepository();
    repository.load.mockResolvedValue(null);
    repository.save.mockRejectedValue(new Error('disk full'));
    const legacyStorage = createLegacyStorage({
      'chiri-settings': JSON.stringify({ state: { theme: 'dark' } }),
    });
    const persistence = new PreferencesPersistence(
      repository as unknown as PreferencesRepository,
      legacyStorage,
    );

    await expect(persistence.load(defaultState)).rejects.toThrow('disk full');
    expect(legacyStorage.removeItem).not.toHaveBeenCalled();
    expect(legacyStorage.values.has('chiri-settings')).toBe(true);
  });

  it('coalesces rapid changes into the latest write', async () => {
    vi.useFakeTimers();
    const repository = createRepository();
    repository.save.mockResolvedValue(undefined);
    const persistence = new PreferencesPersistence(
      repository as unknown as PreferencesRepository,
      createLegacyStorage(),
    );

    persistence.schedule({ ...defaultState, theme: 'dark' });
    persistence.schedule({ ...defaultState, theme: 'light' });
    await vi.advanceTimersByTimeAsync(100);
    await persistence.flush();

    expect(repository.save).toHaveBeenCalledOnce();
    expect(repository.save).toHaveBeenCalledWith({
      schemaVersion: PREFERENCES_SCHEMA_VERSION,
      stateJson: JSON.stringify({ ...defaultState, theme: 'light' }),
    });
  });

  it('flushes a pending write immediately', async () => {
    vi.useFakeTimers();
    const repository = createRepository();
    repository.save.mockResolvedValue(undefined);
    const persistence = new PreferencesPersistence(
      repository as unknown as PreferencesRepository,
      createLegacyStorage(),
    );

    persistence.schedule({ ...defaultState, theme: 'dark' });
    await persistence.flush();

    expect(repository.save).toHaveBeenCalledOnce();
  });

  it('retains a failed write for a later flush retry', async () => {
    vi.useFakeTimers();
    const repository = createRepository();
    repository.save
      .mockRejectedValueOnce(new Error('temporarily unavailable'))
      .mockResolvedValueOnce(undefined);
    const persistence = new PreferencesPersistence(
      repository as unknown as PreferencesRepository,
      createLegacyStorage(),
    );

    persistence.schedule({ ...defaultState, theme: 'dark' });
    await vi.advanceTimersByTimeAsync(100);
    await persistence.flush();

    expect(repository.save).toHaveBeenCalledTimes(2);
    expect(repository.save.mock.calls[1]).toEqual(repository.save.mock.calls[0]);
  });
});
