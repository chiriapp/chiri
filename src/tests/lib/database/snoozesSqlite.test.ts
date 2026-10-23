import { readFileSync, rmSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';

const migrationSource = readFileSync(
  resolve(process.cwd(), 'src-tauri/src/schema/v035_task_snoozes.rs'),
  'utf8',
);
const migrationSql = migrationSource.match(/sql: r#"\s*([\s\S]*?)\s*"#,/u)?.[1];
if (!migrationSql) throw new Error('Could not extract the task snooze migration SQL');

describe('task snooze SQLite migration', () => {
  let temporaryDirectory: string | undefined;
  let database: DatabaseSync | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
    if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  });

  it('creates durable snoozes while preserving the existing metadata table', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'chiri-snoozes-'));
    database = new DatabaseSync(join(temporaryDirectory, 'chiri.db'));
    database.exec('CREATE TABLE tasks (id TEXT PRIMARY KEY NOT NULL)');
    database.exec('CREATE TABLE app_metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)');
    database
      .prepare('INSERT INTO app_metadata (key, value) VALUES (?, ?)')
      .run('default_filters_created', 'complete');
    database.exec(migrationSql);

    database.prepare('INSERT INTO tasks (id) VALUES (?)').run('task-1');
    database
      .prepare('INSERT INTO task_snoozes (task_id, snoozed_until) VALUES (?, ?)')
      .run('task-1', 2_000);
    database
      .prepare('INSERT INTO app_metadata (key, value) VALUES (?, ?)')
      .run('task_snoozes_local_storage_v1', 'complete');

    expect(database.prepare('SELECT * FROM task_snoozes').get()).toMatchObject({
      task_id: 'task-1',
      snoozed_until: 2_000,
    });
    expect(
      database.prepare("SELECT * FROM app_metadata WHERE key = 'default_filters_created'").get(),
    ).toMatchObject({
      key: 'default_filters_created',
      value: 'complete',
    });
  });
});
