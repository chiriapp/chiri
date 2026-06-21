use tauri_plugin_sql::{Migration, MigrationKind};

/// adds optional calendar_home_url override to accounts
pub fn migration() -> Migration {
    Migration {
        version: 16,
        description: "add_account_calendar_home_url",
        sql: r#"
            ALTER TABLE accounts ADD COLUMN calendar_home_url TEXT;
        "#,
        kind: MigrationKind::Up,
    }
}
