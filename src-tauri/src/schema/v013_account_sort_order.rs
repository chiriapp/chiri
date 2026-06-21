use tauri_plugin_sql::{Migration, MigrationKind};

/// adds sort_order field to accounts table
/// allows users to manually reorder accounts in the sidebar
pub fn migration() -> Migration {
    Migration {
        version: 13,
        description: "add_sort_order_to_accounts",
        sql: r#"
            ALTER TABLE accounts ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
        "#,
        kind: MigrationKind::Up,
    }
}
