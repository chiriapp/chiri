use tauri_plugin_sql::{Migration, MigrationKind};

/// Adds WebDAV Push support fields to calendars table and creates push_subscriptions table
pub fn migration() -> Migration {
    Migration {
        version: 19,
        description: "add_webdav_push_support",
        sql: r#"
            -- Add push-related columns to calendars table
            ALTER TABLE calendars ADD COLUMN push_topic TEXT;
            ALTER TABLE calendars ADD COLUMN push_supported INTEGER DEFAULT 0;
            ALTER TABLE calendars ADD COLUMN push_vapid_key TEXT;

            -- Push subscriptions table for tracking active subscriptions
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id TEXT PRIMARY KEY NOT NULL,
                calendar_id TEXT NOT NULL,
                account_id TEXT NOT NULL,
                registration_url TEXT NOT NULL,
                push_resource TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE CASCADE,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );

            -- Index for faster subscription lookups
            CREATE INDEX IF NOT EXISTS idx_push_subscriptions_calendar_id ON push_subscriptions(calendar_id);
            CREATE INDEX IF NOT EXISTS idx_push_subscriptions_expires_at ON push_subscriptions(expires_at);
        "#,
        kind: MigrationKind::Up,
    }
}
