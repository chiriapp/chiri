use tauri_plugin_sql::{Migration, MigrationKind};

/// Splits CalDAV-specific fields from accounts into a dedicated caldav_configs table.
/// Local-only accounts will simply have no row in caldav_configs.
pub fn migration() -> Migration {
    Migration {
        version: 22,
        description: "split_caldav_config_from_accounts",
        sql: r#"
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

            -- Drop only the CalDAV columns from accounts. Rebuilding or dropping
            -- the parent accounts table would cascade through calendars/tasks
            -- while sqlx runs migrations with SQLite foreign keys enabled
            ALTER TABLE accounts DROP COLUMN server_url;
            ALTER TABLE accounts DROP COLUMN username;
            ALTER TABLE accounts DROP COLUMN password;
            ALTER TABLE accounts DROP COLUMN server_type;
            ALTER TABLE accounts DROP COLUMN calendar_home_url;
            ALTER TABLE accounts DROP COLUMN principal_url;
            ALTER TABLE accounts DROP COLUMN accept_invalid_certs;
            ALTER TABLE accounts DROP COLUMN auth_type;
            ALTER TABLE accounts DROP COLUMN refresh_token;
            ALTER TABLE accounts DROP COLUMN token_expiry;
        "#,
        kind: MigrationKind::Up,
    }
}
