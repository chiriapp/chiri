use tauri_plugin_sql::{Migration, MigrationKind};

/// Adds optional principal_url override to accounts
pub fn migration() -> Migration {
    Migration {
        version: 18,
        description: "add_account_principal_url",
        sql: r#"
            ALTER TABLE accounts ADD COLUMN principal_url TEXT;
        "#,
        kind: MigrationKind::Up,
    }
}
