use tauri_plugin_sql::{Migration, MigrationKind};

/// adds local saved task filters and one-time bootstrap metadata
pub fn migration() -> Migration {
    Migration {
        version: 24,
        description: "add_saved_filters",
        sql: r#"
            CREATE TABLE IF NOT EXISTS filters (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                icon TEXT,
                emoji TEXT,
                color TEXT,
                combinator TEXT NOT NULL DEFAULT 'all',
                criteria_json TEXT NOT NULL,
                sort_order INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT NOT NULL
            );

            ALTER TABLE ui_state ADD COLUMN active_filter_id TEXT;
            CREATE INDEX IF NOT EXISTS idx_filters_sort_order ON filters(sort_order);
        "#,
        kind: MigrationKind::Up,
    }
}
