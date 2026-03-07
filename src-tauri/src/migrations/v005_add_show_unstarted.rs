use tauri_plugin_sql::{Migration, MigrationKind};

/// Adds show_unstarted_tasks field to ui_state table
/// Controls whether tasks with future start dates are displayed
pub fn migration() -> Migration {
    Migration {
        version: 5,
        description: "add_show_unstarted_tasks_to_ui_state",
        sql: r#"
            -- Add show_unstarted_tasks field to ui_state table
            ALTER TABLE ui_state ADD COLUMN show_unstarted_tasks INTEGER NOT NULL DEFAULT 1;
        "#,
        kind: MigrationKind::Up,
    }
}
