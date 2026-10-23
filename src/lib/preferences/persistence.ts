import { loggers } from '$lib/logger';
import { type NormalizedPreferences, normalizePreferences } from '$lib/preferences/normalization';
import {
  type PreferencesRepository,
  type PreferencesWrite,
  preferencesRepository,
} from '$lib/preferences/repository';
import type { SettingsState } from '$types/settings/state';

export const PREFERENCES_SCHEMA_VERSION = 1;
export const LEGACY_PREFERENCES_KEYS = ['chiri-settings', 'caldav-tasks-settings'] as const;

const WRITE_DEBOUNCE_MS = 100;

type LegacyStorage = Pick<Storage, 'getItem' | 'removeItem'>;

const readLegacyPreferences = (storage?: LegacyStorage): unknown => {
  if (!storage) return undefined;

  for (const key of LEGACY_PREFERENCES_KEYS) {
    let value: string | null;
    try {
      value = storage.getItem(key);
    } catch (error) {
      loggers.settings.warn(`Could not read legacy preferences from ${key}:`, error);
      continue;
    }
    if (!value) continue;

    try {
      const parsed = JSON.parse(value) as { state?: unknown };
      return parsed.state;
    } catch (error) {
      loggers.settings.warn(`Failed to parse legacy preferences from ${key}:`, error);
    }
  }

  return undefined;
};

const removeLegacyPreferences = (storage?: LegacyStorage) => {
  if (!storage) return;

  for (const key of LEGACY_PREFERENCES_KEYS) {
    try {
      storage.removeItem(key);
    } catch (error) {
      loggers.settings.warn(`Could not remove legacy preferences from ${key}:`, error);
    }
  }
};

export class PreferencesPersistence {
  private pendingWrite: PreferencesWrite | null = null;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private writePromise: Promise<void> | null = null;

  constructor(
    private readonly repository: PreferencesRepository = preferencesRepository,
    private readonly legacyStorage?: LegacyStorage,
  ) {}

  async load(defaultState: SettingsState): Promise<NormalizedPreferences> {
    const legacyStorage = this.getLegacyStorage();
    const stored = await this.repository.load();
    if (stored && stored.schemaVersion > PREFERENCES_SCHEMA_VERSION) {
      throw new Error(`Unsupported preferences schema version: ${stored.schemaVersion}`);
    }

    const storedState = stored
      ? JSON.parse(stored.stateJson)
      : readLegacyPreferences(legacyStorage);
    const normalized = normalizePreferences(storedState, defaultState);
    const needsSave =
      !stored || stored.schemaVersion !== PREFERENCES_SCHEMA_VERSION || normalized.migrated;

    if (needsSave) {
      await this.repository.save({
        schemaVersion: PREFERENCES_SCHEMA_VERSION,
        stateJson: JSON.stringify(normalized.state),
      });
    }

    removeLegacyPreferences(legacyStorage);
    return normalized;
  }

  schedule(state: SettingsState): void {
    this.pendingWrite = {
      schemaVersion: PREFERENCES_SCHEMA_VERSION,
      stateJson: JSON.stringify(state),
    };

    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      void this.drain().catch((error) => {
        loggers.settings.error('Failed to save preferences:', error);
      });
    }, WRITE_DEBOUNCE_MS);
  }

  async flush(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }

    while (this.pendingWrite || this.writePromise) await this.drain();
  }

  private async drain(): Promise<void> {
    if (this.writePromise) return this.writePromise;

    this.writePromise = (async () => {
      while (this.pendingWrite) {
        const write = this.pendingWrite;
        this.pendingWrite = null;
        try {
          await this.repository.save(write);
        } catch (error) {
          this.pendingWrite ??= write;
          throw error;
        }
      }
    })().finally(() => {
      this.writePromise = null;
    });

    return this.writePromise;
  }

  private getLegacyStorage(): LegacyStorage | undefined {
    if (this.legacyStorage) return this.legacyStorage;

    try {
      return globalThis.localStorage;
    } catch (error) {
      loggers.settings.warn('localStorage is unavailable; skipping legacy preferences:', error);
      return undefined;
    }
  }
}

export const preferencesPersistence = new PreferencesPersistence();
