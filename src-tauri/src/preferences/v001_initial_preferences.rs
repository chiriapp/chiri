use tauri_plugin_sql::{Migration, MigrationKind};

/// creates the single-row preferences document table
pub fn migration() -> Migration {
    Migration {
        version: 1,
        description: "create_preferences_table",
        sql: r#"
            CREATE TABLE preferences (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                schema_version INTEGER NOT NULL,
                state_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        "#,
        kind: MigrationKind::Up,
    }
}
