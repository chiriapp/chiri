use tauri_plugin_sql::{Migration, MigrationKind};

/// adds RFC 5545 STATUS and PERCENT-COMPLETE fields to tasks
pub fn migration() -> Migration {
    Migration {
        version: 8,
        description: "add_task_status_and_percent_complete",
        sql: r#"
            ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'needs-action';
            ALTER TABLE tasks ADD COLUMN percent_complete INTEGER;
            UPDATE tasks SET status = 'completed' WHERE completed = 1;
        "#,
        kind: MigrationKind::Up,
    }
}
