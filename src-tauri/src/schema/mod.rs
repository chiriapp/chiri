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
mod v019_webdav_push;
mod v020_account_icon;
mod v021_oauth_tokens;
mod v022_caldav_config_table;
mod v023_recently_deleted;
mod v024_saved_filters;
mod v025_filter_preset_id;
mod v026_push_provider_metadata;
mod v027_remove_completed_task_history;
mod v028_pending_deletion_metadata;
mod v029_caldav_task_objects;
mod v030_push_provider_distributor;

use tauri_plugin_sql::Migration;

/// returns all database migrations for the application
pub fn get_migrations() -> Vec<Migration> {
    vec![
        v001_initial_tables::migration(),
        v002_nullable_account_calendar::migration(),
        v003_add_url_field::migration(),
        v004_add_emoji_field::migration(),
        v005_add_show_unstarted::migration(),
        v006_remove_subtasks_column::migration(),
        v007_task_history::migration(),
        v008_task_status::migration(),
        v009_calendar_sort_order::migration(),
        v010_calendar_sort_config::migration(),
        v011_tag_sort_order::migration(),
        v012_tag_sort_config::migration(),
        v013_account_sort_order::migration(),
        v014_account_sort_config::migration(),
        v015_recurrence_fields::migration(),
        v016_account_calendar_home_url::migration(),
        v017_trusted_cert::migration(),
        v018_account_principal_url::migration(),
        v019_webdav_push::migration(),
        v020_account_icon::migration(),
        v021_oauth_tokens::migration(),
        v022_caldav_config_table::migration(),
        v023_recently_deleted::migration(),
        v024_saved_filters::migration(),
        v025_filter_preset_id::migration(),
        v026_push_provider_metadata::migration(),
        v027_remove_completed_task_history::migration(),
        v028_pending_deletion_metadata::migration(),
        v029_caldav_task_objects::migration(),
        v030_push_provider_distributor::migration(),
    ]
}
