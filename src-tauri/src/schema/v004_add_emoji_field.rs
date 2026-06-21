use tauri_plugin_sql::{Migration, MigrationKind};

/// adds emoji field to tags and calendars tables
/// allows users to use emojis alongside or instead of icons
pub fn migration() -> Migration {
    Migration {
        version: 4,
        description: "add_emoji_field_to_tags_and_calendars",
        sql: r#"
            -- Add emoji field to tags table
            ALTER TABLE tags ADD COLUMN emoji TEXT;

            -- Add emoji field to calendars table
            ALTER TABLE calendars ADD COLUMN emoji TEXT;
        "#,
        kind: MigrationKind::Up,
    }
}
