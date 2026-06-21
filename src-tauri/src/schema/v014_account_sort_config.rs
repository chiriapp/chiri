use tauri_plugin_sql::{Migration, MigrationKind};

/// adds account sort config columns to ui_state table
/// allows persisting the user's preferred account sort mode and direction
pub fn migration() -> Migration {
    Migration {
        version: 14,
        description: "add_account_sort_config_to_ui_state",
        sql: r#"
            ALTER TABLE ui_state ADD COLUMN account_sort_mode TEXT NOT NULL DEFAULT 'manual';
            ALTER TABLE ui_state ADD COLUMN account_sort_direction TEXT NOT NULL DEFAULT 'asc';
        "#,
        kind: MigrationKind::Up,
    }
}
