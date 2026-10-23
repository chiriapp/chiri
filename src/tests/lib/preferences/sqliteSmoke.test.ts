import { readFileSync, rmSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultState } from '$context/settingsDefaults';
import { PREFERENCES_SCHEMA_VERSION, PreferencesPersistence } from '$lib/preferences/persistence';
import type {
  PreferencesRepository,
  PreferencesWrite,
  StoredPreferences,
} from '$lib/preferences/repository';

vi.mock('@tauri-apps/plugin-os', () => ({ platform: () => 'macos' }));

const migrationSource = readFileSync(
  resolve(process.cwd(), 'src-tauri/src/preferences/v001_initial_preferences.rs'),
  'utf8',
);
const migrationSql = migrationSource.match(/sql: r#"\s*([\s\S]*?)\s*"#,/u)?.[1];
if (!migrationSql) throw new Error('Could not extract the preferences migration SQL');

const createLegacyStorage = (theme: 'dark' | 'light') => {
  const values = new Map([['chiri-settings', JSON.stringify({ state: { theme } })]]);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    values,
  };
};

const createRepository = (database: DatabaseSync) => ({
  async load(): Promise<StoredPreferences | null> {
    const row = database
      .prepare('SELECT schema_version, state_json, updated_at FROM preferences WHERE id = 1')
      .get() as { schema_version: number; state_json: string; updated_at: string } | undefined;
    if (!row) return null;
    return {
      schemaVersion: row.schema_version,
      stateJson: row.state_json,
      updatedAt: row.updated_at,
    };
  },

  async save(preferences: PreferencesWrite): Promise<void> {
    database
      .prepare(
        `INSERT INTO preferences (id, schema_version, state_json, updated_at)
         VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           schema_version = excluded.schema_version,
           state_json = excluded.state_json,
           updated_at = excluded.updated_at`,
      )
      .run(preferences.schemaVersion, preferences.stateJson, new Date().toISOString());
  },
});

describe('preferences SQLite migration smoke test', () => {
  let temporaryDirectory: string | undefined;
  let openDatabase: DatabaseSync | undefined;

  afterEach(() => {
    openDatabase?.close();
    openDatabase = undefined;
    if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  });

  it('imports legacy preferences, then uses the reopened database as the source of truth', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'chiri-preferences-'));
    const databasePath = join(temporaryDirectory, 'preferences.db');

    const firstDatabase = new DatabaseSync(databasePath);
    openDatabase = firstDatabase;
    firstDatabase.exec(migrationSql);
    const originalLegacyStorage = createLegacyStorage('dark');
    const firstPersistence = new PreferencesPersistence(
      createRepository(firstDatabase) as unknown as PreferencesRepository,
      originalLegacyStorage,
    );

    const imported = await firstPersistence.load(defaultState);
    expect(imported.state.theme).toBe('dark');
    expect(originalLegacyStorage.values.size).toBe(0);
    firstDatabase.close();
    openDatabase = undefined;

    const reopenedDatabase = new DatabaseSync(databasePath);
    openDatabase = reopenedDatabase;
    const conflictingLegacyStorage = createLegacyStorage('light');
    const secondPersistence = new PreferencesPersistence(
      createRepository(reopenedDatabase) as unknown as PreferencesRepository,
      conflictingLegacyStorage,
    );

    const reloaded = await secondPersistence.load(defaultState);
    const storedRow = reopenedDatabase
      .prepare('SELECT schema_version, state_json FROM preferences WHERE id = 1')
      .get() as { schema_version: number; state_json: string };

    expect(reloaded.state.theme).toBe('dark');
    expect(storedRow.schema_version).toBe(PREFERENCES_SCHEMA_VERSION);
    expect(JSON.parse(storedRow.state_json).theme).toBe('dark');
    expect(conflictingLegacyStorage.values.size).toBe(0);
    reopenedDatabase.close();
    openDatabase = undefined;
  });
});
