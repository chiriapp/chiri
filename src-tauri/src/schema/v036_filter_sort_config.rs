use tauri_plugin_sql::{Migration, MigrationKind};

/// stores the user's preferred sort mode and direction for saved filters
pub fn migration() -> Migration {
    Migration {
        version: 36,
        description: "add_filter_sort_config",
        sql: r#"
            ALTER TABLE ui_state ADD COLUMN filter_sort_mode TEXT NOT NULL DEFAULT 'manual';
            ALTER TABLE ui_state ADD COLUMN filter_sort_direction TEXT NOT NULL DEFAULT 'asc';
        "#,
        kind: MigrationKind::Up,
    }
}
