use tauri_plugin_sql::{Migration, MigrationKind};

/// adds a task_history table to track field-level changes to tasks over time
pub fn migration() -> Migration {
    Migration {
        version: 7,
        description: "add_task_history_table",
        sql: r#"
            CREATE TABLE task_history (
                id TEXT PRIMARY KEY,
                task_uid TEXT NOT NULL,
                changed_at TEXT NOT NULL,
                field TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT
            );
            CREATE INDEX idx_task_history_uid ON task_history (task_uid);
            CREATE INDEX idx_task_history_changed_at ON task_history (changed_at);
        "#,
        kind: MigrationKind::Up,
    }
}
