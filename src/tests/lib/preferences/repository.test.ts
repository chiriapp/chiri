import DatabasePlugin from '@tauri-apps/plugin-sql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-sql', () => ({
  default: { load: vi.fn() },
}));

vi.mock('$lib/logger', () => ({
  loggers: {
    settings: {
      info: vi.fn(),
      error: vi.fn(),
    },
  },
}));

import { PREFERENCES_DATABASE_URL, PreferencesRepository } from '$lib/preferences/repository';

const createConnection = () => ({
  select: vi.fn(),
  execute: vi.fn(),
  close: vi.fn(),
});

describe('preferences database', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the dedicated preferences database once', async () => {
    const connection = createConnection();
    connection.select.mockResolvedValue([]);
    vi.mocked(DatabasePlugin.load).mockResolvedValue(connection as unknown as DatabasePlugin);
    const repository = new PreferencesRepository();

    await repository.load();
    await repository.load();

    expect(DatabasePlugin.load).toHaveBeenCalledOnce();
    expect(DatabasePlugin.load).toHaveBeenCalledWith(PREFERENCES_DATABASE_URL);
  });

  it('maps the stored preferences document', async () => {
    const connection = createConnection();
    connection.select.mockResolvedValue([
      {
        schema_version: 3,
        state_json: '{"theme":"dark"}',
        updated_at: '2026-09-10T00:00:00.000Z',
      },
    ]);
    vi.mocked(DatabasePlugin.load).mockResolvedValue(connection as unknown as DatabasePlugin);
    const repository = new PreferencesRepository();

    await expect(repository.load()).resolves.toEqual({
      schemaVersion: 3,
      stateJson: '{"theme":"dark"}',
      updatedAt: '2026-09-10T00:00:00.000Z',
    });
  });

  it('upserts the single preferences row', async () => {
    const connection = createConnection();
    connection.execute.mockResolvedValue(undefined);
    vi.mocked(DatabasePlugin.load).mockResolvedValue(connection as unknown as DatabasePlugin);
    const repository = new PreferencesRepository();

    await repository.save({ schemaVersion: 1, stateJson: '{"theme":"system"}' });

    expect(connection.execute).toHaveBeenCalledOnce();
    const [query, parameters] = connection.execute.mock.calls[0];
    expect(query).toContain('ON CONFLICT(id) DO UPDATE');
    expect(parameters).toEqual([1, '{"theme":"system"}', expect.any(String)]);
  });

  it('resets the document without deleting the database', async () => {
    const connection = createConnection();
    connection.execute.mockResolvedValue(undefined);
    vi.mocked(DatabasePlugin.load).mockResolvedValue(connection as unknown as DatabasePlugin);
    const repository = new PreferencesRepository();

    await repository.reset();

    expect(connection.execute).toHaveBeenCalledWith('DELETE FROM preferences WHERE id = 1');
  });

  it('closes an initialized connection', async () => {
    const connection = createConnection();
    connection.select.mockResolvedValue([]);
    vi.mocked(DatabasePlugin.load).mockResolvedValue(connection as unknown as DatabasePlugin);
    const repository = new PreferencesRepository();

    await repository.load();
    await repository.close();

    expect(connection.close).toHaveBeenCalledOnce();
  });
});
