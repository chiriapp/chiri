mod v001_initial_tables;
mod v002_nullable_account_calendar;
mod v003_add_url_field;
mod v004_add_emoji_field;
mod v005_add_show_unstarted;
mod v006_remove_subtasks_column;
mod v007_task_history;
mod v008_task_status;
mod v009_calendar_sort_order;
mod v010_calendar_sort_config;
mod v011_tag_sort_order;
mod v012_tag_sort_config;
mod v013_account_sort_order;
mod v014_account_sort_config;
mod v015_recurrence_fields;
mod v016_account_calendar_home_url;
mod v017_trusted_cert;
mod v018_account_principal_url;

use tauri_plugin_sql::Migration;

pub use v001_initial_tables::migration as migration_v001;
pub use v002_nullable_account_calendar::migration as migration_v002;
pub use v003_add_url_field::migration as migration_v003;
pub use v004_add_emoji_field::migration as migration_v004;
pub use v005_add_show_unstarted::migration as migration_v005;
pub use v006_remove_subtasks_column::migration as migration_v006;
pub use v007_task_history::migration as migration_v007;
pub use v008_task_status::migration as migration_v008;
pub use v009_calendar_sort_order::migration as migration_v009;
pub use v010_calendar_sort_config::migration as migration_v010;
pub use v011_tag_sort_order::migration as migration_v011;
pub use v012_tag_sort_config::migration as migration_v012;
pub use v013_account_sort_order::migration as migration_v013;
pub use v014_account_sort_config::migration as migration_v014;
pub use v015_recurrence_fields::migration as migration_v015;
pub use v016_account_calendar_home_url::migration as migration_v016;
pub use v017_trusted_cert::migration as migration_v017;
pub use v018_account_principal_url::migration as migration_v018;

/// Returns all database migrations for the application
pub fn get_migrations() -> Vec<Migration> {
    vec![
        migration_v001(),
        migration_v002(),
        migration_v003(),
        migration_v004(),
        migration_v005(),
        migration_v006(),
        migration_v007(),
        migration_v008(),
        migration_v009(),
        migration_v010(),
        migration_v011(),
        migration_v012(),
        migration_v013(),
        migration_v014(),
        migration_v015(),
        migration_v016(),
        migration_v017(),
        migration_v018(),
    ]
}
