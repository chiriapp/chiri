use tauri_plugin_sql::{Migration, MigrationKind};

/// Adds local display icon fields to accounts
pub fn migration() -> Migration {
    Migration {
        version: 20,
        description: "add_account_icon",
        sql: r#"
            ALTER TABLE accounts ADD COLUMN icon TEXT;
            ALTER TABLE accounts ADD COLUMN emoji TEXT;
        "#,
        kind: MigrationKind::Up,
    }
}
