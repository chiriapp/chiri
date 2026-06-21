use tauri_plugin_sql::{Migration, MigrationKind};

/// removes the legacy subtasks column from tasks table
/// subtasks are now implemented as separate Task records with parent_uid set,
/// following RFC 5545 RELATED-TO property standard instead of the non-standard
/// X-CALDAV-TASKS-SUBTASKS approach
pub fn migration() -> Migration {
    Migration {
        version: 6,
        description: "remove_subtasks_column_from_tasks",
        sql: r#"
            -- Remove legacy subtasks column
            -- Subtasks are now proper Task records with parent_uid relationship
            ALTER TABLE tasks DROP COLUMN subtasks;
        "#,
        kind: MigrationKind::Up,
    }
}
