use tauri_plugin_sql::{Migration, MigrationKind};

/// Removes legacy boolean completion entries from task history.
pub fn migration() -> Migration {
    Migration {
        version: 27,
        description: "remove_completed_task_history",
        sql: r#"
            DELETE FROM task_history WHERE field = 'completed';
        "#,
        kind: MigrationKind::Up,
    }
}
