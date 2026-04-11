use tauri_plugin_sql::{Migration, MigrationKind};

/// Adds accept_invalid_certs flag to accounts for self-signed certificate support
pub fn migration() -> Migration {
    Migration {
        version: 17,
        description: "add_account_accept_invalid_certs",
        sql: r#"
            ALTER TABLE accounts ADD COLUMN accept_invalid_certs INTEGER NOT NULL DEFAULT 0;
        "#,
        kind: MigrationKind::Up,
    }
}
