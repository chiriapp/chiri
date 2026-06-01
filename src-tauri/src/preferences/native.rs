use std::process::Command;

use super::{formats, types::NativeRegionPreferences, week};

#[cfg(target_os = "macos")]
pub(super) fn get_region_preferences() -> NativeRegionPreferences {
    let forced_time_format = run_command_output(
        "defaults",
        &["read", "NSGlobalDomain", "AppleICUForce24HourTime"],
    )
    .and_then(|value| match value.trim() {
        "1" | "true" | "TRUE" | "YES" => Some("24"),
        "0" | "false" | "FALSE" | "NO" => Some("12"),
        _ => None,
    });

    NativeRegionPreferences {
        locale: run_command_output("defaults", &["read", "NSGlobalDomain", "AppleLocale"]),
        date_format: run_command_output(
            "defaults",
            &["read", "NSGlobalDomain", "AppleICUDateFormatStrings"],
        )
        .and_then(|value| formats::infer_date_format(&value)),
        time_format: forced_time_format.or_else(|| {
            run_command_output(
                "defaults",
                &["read", "NSGlobalDomain", "AppleICUTimeFormatStrings"],
            )
            .and_then(|value| formats::infer_time_format(&value))
        }),
        start_of_week: run_command_output(
            "defaults",
            &["read", "NSGlobalDomain", "AppleFirstWeekday"],
        )
        .and_then(|value| extract_first_u8(&value))
        .and_then(week::start_of_week_from_sunday_based_number),
    }
}

#[cfg(target_os = "linux")]
pub(super) fn get_region_preferences() -> NativeRegionPreferences {
    NativeRegionPreferences {
        locale: sys_locale::get_locale(),
        date_format: run_command_output("locale", &["d_fmt"])
            .and_then(|value| formats::infer_date_format(&value)),
        time_format: run_command_output("locale", &["t_fmt"])
            .and_then(|value| formats::infer_time_format(&value)),
        start_of_week: run_command_output("locale", &["first_weekday"])
            .and_then(|value| value.trim().parse::<u8>().ok())
            .and_then(week::start_of_week_from_sunday_based_number),
    }
}

#[cfg(target_os = "windows")]
pub(super) fn get_region_preferences() -> NativeRegionPreferences {
    NativeRegionPreferences {
        locale: read_windows_international_value("LocaleName"),
        date_format: read_windows_international_value("sShortDate")
            .and_then(|value| formats::infer_date_format(&value)),
        time_format: read_windows_international_value("sShortTime")
            .and_then(|value| formats::infer_time_format(&value)),
        start_of_week: read_windows_international_value("iFirstDayOfWeek")
            .and_then(|value| value.trim().parse::<u8>().ok())
            .and_then(week::start_of_week_from_windows_number),
    }
}

#[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
pub(super) fn get_region_preferences() -> NativeRegionPreferences {
    NativeRegionPreferences::default()
}

fn run_command_output(command: &str, args: &[&str]) -> Option<String> {
    let output = Command::new(command).args(args).output().ok()?;
    if !output.status.success() {
        return None;
    }

    let text = String::from_utf8(output.stdout).ok()?;
    let trimmed = text.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

#[cfg(target_os = "windows")]
fn read_windows_international_value(name: &str) -> Option<String> {
    let output = run_command_output(
        "reg",
        &["query", r"HKCU\Control Panel\International", "/v", name],
    )?;

    output
        .lines()
        .find(|line| line.split_whitespace().next() == Some(name))
        .map(|line| {
            line.split_whitespace()
                .skip(2)
                .collect::<Vec<_>>()
                .join(" ")
        })
        .filter(|value| !value.is_empty())
}

#[cfg(target_os = "macos")]
fn extract_first_u8(value: &str) -> Option<u8> {
    let digits: String = value
        .chars()
        .skip_while(|ch| !ch.is_ascii_digit())
        .take_while(|ch| ch.is_ascii_digit())
        .collect();

    digits.parse().ok()
}
