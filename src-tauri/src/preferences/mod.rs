mod v001_initial_preferences;

use tauri_plugin_sql::Migration;

/// returns all migrations for the preferences database
pub fn get_migrations() -> Vec<Migration> {
    vec![v001_initial_preferences::migration()]
}
