import DatabasePlugin from '@tauri-apps/plugin-sql';
import { loggers } from '$lib/logger';

export const PREFERENCES_DATABASE_URL = 'sqlite:preferences.db';

interface PreferencesRow {
  schema_version: number;
  state_json: string;
  updated_at: string;
}

export interface StoredPreferences {
  schemaVersion: number;
  stateJson: string;
  updatedAt: string;
}

export interface PreferencesWrite {
  schemaVersion: number;
  stateJson: string;
}

export class PreferencesRepository {
  private connection: DatabasePlugin | null = null;
  private readonly log = loggers.settings;

  async init() {
    if (this.connection) return;

    try {
      this.connection = await DatabasePlugin.load(PREFERENCES_DATABASE_URL);
      this.log.info('Connected to preferences database');
    } catch (error) {
      this.log.error('Failed to connect to preferences database:', error);
      throw error;
    }
  }

  private async conn() {
    if (!this.connection) await this.init();
    return this.connection!;
  }

  async load(): Promise<StoredPreferences | null> {
    const rows = await (await this.conn()).select<PreferencesRow[]>(
      'SELECT schema_version, state_json, updated_at FROM preferences WHERE id = 1',
    );
    const row = rows[0];
    if (!row) return null;

    return {
      schemaVersion: row.schema_version,
      stateJson: row.state_json,
      updatedAt: row.updated_at,
    };
  }

  async save(preferences: PreferencesWrite): Promise<void> {
    await (await this.conn()).execute(
      `INSERT INTO preferences (id, schema_version, state_json, updated_at)
       VALUES (1, $1, $2, $3)
       ON CONFLICT(id) DO UPDATE SET
         schema_version = excluded.schema_version,
         state_json = excluded.state_json,
         updated_at = excluded.updated_at`,
      [preferences.schemaVersion, preferences.stateJson, new Date().toISOString()],
    );
  }

  async reset(): Promise<void> {
    await (await this.conn()).execute('DELETE FROM preferences WHERE id = 1');
  }

  async close(): Promise<void> {
    if (!this.connection) return;
    await this.connection.close();
    this.connection = null;
  }
}

export const preferencesRepository = new PreferencesRepository();
