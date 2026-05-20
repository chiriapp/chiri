use tauri_plugin_sql::{Migration, MigrationKind};

/// Adds soft-deletion support for tasks and a sidebar view selector.
pub fn migration() -> Migration {
    Migration {
        version: 23,
        description: "add_recently_deleted",
        sql: r#"
            ALTER TABLE tasks ADD COLUMN deleted_at TEXT;
            ALTER TABLE ui_state ADD COLUMN active_view TEXT NOT NULL DEFAULT 'tasks';
            CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
        "#,
        kind: MigrationKind::Up,
    }
}
