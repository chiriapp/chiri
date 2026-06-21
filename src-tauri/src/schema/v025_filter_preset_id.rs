use tauri_plugin_sql::{Migration, MigrationKind};

/// tracks which built-in preset created a saved filter
pub fn migration() -> Migration {
    Migration {
        version: 25,
        description: "add_filter_preset_id",
        sql: r#"
            ALTER TABLE filters ADD COLUMN preset_id TEXT;

            UPDATE filters SET preset_id = 'today' WHERE id = 'default-filter-today';
            UPDATE filters SET preset_id = 'overdue' WHERE id = 'default-filter-overdue';
            UPDATE filters SET preset_id = 'scheduled' WHERE id = 'default-filter-scheduled';
            UPDATE filters SET preset_id = 'this-week' WHERE id = 'default-filter-this-week';
        "#,
        kind: MigrationKind::Up,
    }
}
