mod v001_initial_tables;
mod v002_nullable_account_calendar;
mod v003_add_url_field;
mod v004_add_emoji_field;
mod v005_add_show_unstarted;

use tauri_plugin_sql::Migration;

pub use v001_initial_tables::migration as migration_v001;
pub use v002_nullable_account_calendar::migration as migration_v002;
pub use v003_add_url_field::migration as migration_v003;
pub use v004_add_emoji_field::migration as migration_v004;
pub use v005_add_show_unstarted::migration as migration_v005;

/// Returns all database migrations for the application
pub fn get_migrations() -> Vec<Migration> {
    vec![
        migration_v001(),
        migration_v002(),
        migration_v003(),
        migration_v004(),
        migration_v005(),
    ]
}
