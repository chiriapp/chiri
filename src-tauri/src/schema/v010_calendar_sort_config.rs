use tauri_plugin_sql::{Migration, MigrationKind};

/// adds calendar sort config columns to ui_state table
/// allows persisting the user's preferred calendar sort mode and direction
pub fn migration() -> Migration {
    Migration {
        version: 10,
        description: "add_calendar_sort_config_to_ui_state",
        sql: r#"
            ALTER TABLE ui_state ADD COLUMN calendar_sort_mode TEXT NOT NULL DEFAULT 'manual';
            ALTER TABLE ui_state ADD COLUMN calendar_sort_direction TEXT NOT NULL DEFAULT 'asc';
        "#,
        kind: MigrationKind::Up,
    }
}
