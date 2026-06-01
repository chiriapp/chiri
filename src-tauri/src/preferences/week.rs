use icu_calendar::{types::Weekday, week::WeekInformation};
use icu_locale::Locale;

use super::locale::{locale_identifier_for_cldr, region_from_locale};

#[cfg(any(target_os = "macos", target_os = "linux", test))]
pub(super) fn start_of_week_from_sunday_based_number(value: u8) -> Option<&'static str> {
    match value {
        1 => Some("sunday"),
        2 => Some("monday"),
        3 => Some("tuesday"),
        4 => Some("wednesday"),
        5 => Some("thursday"),
        6 => Some("friday"),
        7 => Some("saturday"),
        _ => None,
    }
}

#[cfg(target_os = "windows")]
pub(super) fn start_of_week_from_windows_number(value: u8) -> Option<&'static str> {
    match value {
        0 => Some("monday"),
        1 => Some("tuesday"),
        2 => Some("wednesday"),
        3 => Some("thursday"),
        4 => Some("friday"),
        5 => Some("saturday"),
        6 => Some("sunday"),
        _ => None,
    }
}

pub(super) fn start_of_week_from_locale(locale: &str) -> Option<&'static str> {
    first_weekday_from_locale(locale).or_else(|| {
        region_from_locale(locale).and_then(|region| default_start_of_week_for_region(&region))
    })
}

fn first_weekday_from_locale(locale: &str) -> Option<&'static str> {
    let locale = locale_identifier_for_cldr(locale);
    let locale = Locale::try_from_str(&locale).ok()?;
    let info = WeekInformation::try_new(locale.into()).ok()?;

    Some(weekday_to_start_of_week(info.first_weekday))
}

fn weekday_to_start_of_week(weekday: Weekday) -> &'static str {
    match weekday {
        Weekday::Sunday => "sunday",
        Weekday::Monday => "monday",
        Weekday::Tuesday => "tuesday",
        Weekday::Wednesday => "wednesday",
        Weekday::Thursday => "thursday",
        Weekday::Friday => "friday",
        Weekday::Saturday => "saturday",
    }
}

fn default_start_of_week_for_region(region: &str) -> Option<&'static str> {
    match region {
        "AF" | "BH" | "DJ" | "DZ" | "EG" | "IQ" | "IR" | "JO" | "KW" | "LY" | "OM" | "QA"
        | "SD" | "SY" | "YE" => Some("saturday"),
        "CA" | "HK" | "IL" | "JP" | "MO" | "PH" | "TW" | "US" => Some("sunday"),
        _ => Some("monday"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_sunday_based_week_numbers() {
        assert_eq!(start_of_week_from_sunday_based_number(1), Some("sunday"));
        assert_eq!(start_of_week_from_sunday_based_number(2), Some("monday"));
        assert_eq!(start_of_week_from_sunday_based_number(7), Some("saturday"));
        assert_eq!(start_of_week_from_sunday_based_number(8), None);
    }

    #[test]
    fn honors_unicode_locale_overrides_for_week_start() {
        assert_eq!(start_of_week_from_locale("en_US@rg=gbzzzz"), Some("monday"));
        assert_eq!(
            start_of_week_from_locale("en_US@rg=gbzzzz;fw=wed"),
            Some("wednesday")
        );
    }
}
