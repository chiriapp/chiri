use tauri_plugin_sql::{Migration, MigrationKind};

/// Adds OAuth token fields to accounts for bearer-token-based auth (e.g. Fastmail OAuth 2.0)
pub fn migration() -> Migration {
    Migration {
        version: 21,
        description: "add_oauth_token_fields",
        sql: r#"
            ALTER TABLE accounts ADD COLUMN auth_type TEXT NOT NULL DEFAULT 'basic';
            ALTER TABLE accounts ADD COLUMN refresh_token TEXT;
            ALTER TABLE accounts ADD COLUMN token_expiry TEXT;
        "#,
        kind: MigrationKind::Up,
    }
}
