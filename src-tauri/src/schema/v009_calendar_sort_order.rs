use tauri_plugin_sql::{Migration, MigrationKind};

/// adds sort_order field to calendars table
/// allows users to manually reorder calendars in the sidebar
pub fn migration() -> Migration {
    Migration {
        version: 9,
        description: "add_sort_order_to_calendars",
        sql: r#"
            ALTER TABLE calendars ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
        "#,
        kind: MigrationKind::Up,
    }
}
