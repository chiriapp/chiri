use tauri_plugin_sql::{Migration, MigrationKind};

/// stores the UnifiedPush distributor that owns provider tokens
pub fn migration() -> Migration {
    Migration {
        version: 30,
        description: "add_push_provider_distributor",
        sql: r#"
            ALTER TABLE push_subscriptions ADD COLUMN provider_distributor TEXT;
        "#,
        kind: MigrationKind::Up,
    }
}
