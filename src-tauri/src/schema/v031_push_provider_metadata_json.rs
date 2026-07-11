use tauri_plugin_sql::{Migration, MigrationKind};

/// stores provider-specific restore/remove/listen metadata as JSON
pub fn migration() -> Migration {
    Migration {
        version: 31,
        description: "add_push_provider_metadata_json",
        sql: r#"
            ALTER TABLE push_subscriptions ADD COLUMN provider_metadata TEXT;
        "#,
        kind: MigrationKind::Up,
    }
}
