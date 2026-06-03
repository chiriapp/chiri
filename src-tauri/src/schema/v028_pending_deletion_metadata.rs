use tauri_plugin_sql::{Migration, MigrationKind};

/// Tracks CalDAV DELETE retry metadata for queued task tombstones.
pub fn migration() -> Migration {
    Migration {
        version: 28,
        description: "add_pending_deletion_metadata",
        sql: r#"
            ALTER TABLE pending_deletions ADD COLUMN etag TEXT;
            ALTER TABLE pending_deletions ADD COLUMN deleted_at TEXT;
            ALTER TABLE pending_deletions ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
            ALTER TABLE pending_deletions ADD COLUMN last_attempt_at TEXT;
            ALTER TABLE pending_deletions ADD COLUMN last_error TEXT;
        "#,
        kind: MigrationKind::Up,
    }
}
