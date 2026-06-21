use tauri_plugin_sql::{Migration, MigrationKind};

/// stores remote CalDAV object metadata and the last synced VTODO baseline
pub fn migration() -> Migration {
    Migration {
        version: 29,
        description: "create_caldav_task_objects",
        sql: r#"
            CREATE TABLE IF NOT EXISTS caldav_task_objects (
                task_uid TEXT PRIMARY KEY NOT NULL,
                account_id TEXT NOT NULL,
                calendar_id TEXT NOT NULL,
                href TEXT NOT NULL,
                etag TEXT,
                vtodo TEXT NOT NULL,
                last_sync_at TEXT NOT NULL,
                UNIQUE(account_id, href)
            );

            CREATE INDEX IF NOT EXISTS idx_caldav_task_objects_calendar_id
                ON caldav_task_objects(calendar_id);
        "#,
        kind: MigrationKind::Up,
    }
}
