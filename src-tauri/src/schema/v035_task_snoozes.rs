use tauri_plugin_sql::{Migration, MigrationKind};

/// persists notification snoozes; migration state reuses app_metadata from v024
pub fn migration() -> Migration {
    Migration {
        version: 35,
        description: "add_task_snoozes",
        sql: r#"
            CREATE TABLE IF NOT EXISTS task_snoozes (
                task_id TEXT PRIMARY KEY NOT NULL,
                snoozed_until INTEGER NOT NULL CHECK (snoozed_until > 0)
            );
        "#,
        kind: MigrationKind::Up,
    }
}
