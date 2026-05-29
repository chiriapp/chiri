mod formats;
mod locale;
mod native;
mod types;
mod week;

pub use types::SystemRegionPreferences;

#[tauri::command]
pub fn get_system_region_preferences() -> SystemRegionPreferences {
    let native = native::get_region_preferences();
    let locale = native.locale.or_else(sys_locale::get_locale);
    let locale_ref = locale.as_deref();

    SystemRegionPreferences {
        timezone: iana_time_zone::get_timezone().ok(),
        date_format: native
            .date_format
            .or_else(|| locale_ref.and_then(formats::date_format_from_locale)),
        time_format: native
            .time_format
            .or_else(|| locale_ref.and_then(formats::time_format_from_locale)),
        start_of_week: native
            .start_of_week
            .or_else(|| locale_ref.and_then(week::start_of_week_from_locale)),
        locale,
    }
}
