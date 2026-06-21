use tauri_plugin_sql::{Migration, MigrationKind};

/// adds RFC 5545 recurrence fields to tasks
pub fn migration() -> Migration {
    Migration {
        version: 15,
        description: "add_recurrence_fields",
        sql: r#"
            ALTER TABLE tasks ADD COLUMN rrule TEXT;
            ALTER TABLE tasks ADD COLUMN repeat_from INTEGER NOT NULL DEFAULT 0;
        "#,
        kind: MigrationKind::Up,
    }
}
