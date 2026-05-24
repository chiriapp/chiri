use tauri_plugin_sql::{Migration, MigrationKind};

/// Stores the local provider used to create each WebDAV Push endpoint.
pub fn migration() -> Migration {
    Migration {
        version: 26,
        description: "add_push_provider_metadata",
        sql: r#"
            ALTER TABLE push_subscriptions ADD COLUMN provider_id TEXT NOT NULL DEFAULT 'ntfy-direct';
            ALTER TABLE push_subscriptions ADD COLUMN provider_token TEXT;
        "#,
        kind: MigrationKind::Up,
    }
}
