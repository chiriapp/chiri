use tauri_plugin_sql::{Migration, MigrationKind};

/// Splits CalDAV-specific fields from accounts into a dedicated caldav_configs table.
/// Local-only accounts will simply have no row in caldav_configs.
pub fn migration() -> Migration {
    Migration {
        version: 22,
        description: "split_caldav_config_from_accounts",
        sql: r#"
            PRAGMA foreign_keys = OFF;

            -- Create caldav_configs table
            CREATE TABLE caldav_configs (
                account_id TEXT PRIMARY KEY NOT NULL,
                server_url TEXT NOT NULL,
                username TEXT NOT NULL,
                password TEXT NOT NULL,
                server_type TEXT,
                calendar_home_url TEXT,
                principal_url TEXT,
                accept_invalid_certs INTEGER DEFAULT 0,
                auth_type TEXT NOT NULL DEFAULT 'basic',
                refresh_token TEXT,
                token_expiry TEXT,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );

            -- Backfill from existing accounts
            INSERT INTO caldav_configs (
                account_id, server_url, username, password, server_type,
                calendar_home_url, principal_url, accept_invalid_certs,
                auth_type, refresh_token, token_expiry
            )
            SELECT
                id, server_url, username, password, server_type,
                calendar_home_url, principal_url, accept_invalid_certs,
                COALESCE(auth_type, 'basic'), refresh_token, token_expiry
            FROM accounts;

            -- Rebuild accounts without caldav columns
            CREATE TABLE accounts_new (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                icon TEXT,
                emoji TEXT,
                last_sync TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                sort_order INTEGER DEFAULT 0
            );

            INSERT INTO accounts_new (id, name, icon, emoji, last_sync, is_active, sort_order)
            SELECT id, name, icon, emoji, last_sync, is_active, sort_order
            FROM accounts;

            DROP TABLE accounts;
            ALTER TABLE accounts_new RENAME TO accounts;

            PRAGMA foreign_keys = ON;
        "#,
        kind: MigrationKind::Up,
    }
}
