use tauri_plugin_sql::{Migration, MigrationKind};

/// adds tag sort config columns to ui_state table
/// allows persisting the user's preferred tag sort mode and direction
pub fn migration() -> Migration {
    Migration {
        version: 12,
        description: "add_tag_sort_config_to_ui_state",
        sql: r#"
            ALTER TABLE ui_state ADD COLUMN tag_sort_mode TEXT NOT NULL DEFAULT 'manual';
            ALTER TABLE ui_state ADD COLUMN tag_sort_direction TEXT NOT NULL DEFAULT 'asc';
        "#,
        kind: MigrationKind::Up,
    }
}
