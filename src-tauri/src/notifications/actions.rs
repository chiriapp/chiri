use tauri::{AppHandle, Emitter, Manager};

use super::types::NotificationActionEvent;

pub const COMPLETE: &str = "complete";
pub const HIGHLIGHT: &str = "highlight";

pub const MAX_NOTIFICATION_ACTIONS: usize = 5;

/// label shown on the complete action button
#[cfg(target_os = "macos")]
pub const COMPLETE_LABEL: &str = "Complete";

#[cfg(any(target_os = "linux", target_os = "windows"))]
pub const COMPLETE_LABEL: &str = "Done";

const SECONDS_PER_MINUTE: u32 = 60;
const SECONDS_PER_HOUR: u32 = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY: u32 = 24 * SECONDS_PER_HOUR;
const SECONDS_PER_WEEK: u32 = 7 * SECONDS_PER_DAY;

/// formats a snooze duration in seconds into a human-readable label
/// - 15 -> "15 seconds"
/// - 60 -> "1 minute"
/// - 900 -> "15 minutes"
/// - 3600 -> "1 hour"
/// - 86400 -> "1 day"
/// - 604800 -> "1 week"
#[cfg(target_os = "macos")]
pub fn format_snooze_duration(total_seconds: u32) -> String {
    if total_seconds >= SECONDS_PER_WEEK {
        let weeks = total_seconds / SECONDS_PER_WEEK;
        if weeks == 1 {
            "1 week".to_string()
        } else {
            format!("{weeks} weeks")
        }
    } else if total_seconds >= SECONDS_PER_DAY {
        let days = total_seconds / SECONDS_PER_DAY;
        if days == 1 {
            "1 day".to_string()
        } else {
            format!("{days} days")
        }
    } else if total_seconds >= SECONDS_PER_HOUR {
        let hours = total_seconds / SECONDS_PER_HOUR;
        if hours == 1 {
            "1 hour".to_string()
        } else {
            format!("{hours} hours")
        }
    } else if total_seconds >= SECONDS_PER_MINUTE {
        let minutes = total_seconds / SECONDS_PER_MINUTE;
        if minutes == 1 {
            "1 minute".to_string()
        } else {
            format!("{minutes} minutes")
        }
    } else if total_seconds == 1 {
        "1 second".to_string()
    } else {
        format!("{total_seconds} seconds")
    }
}

/// label shown on macOS notification action buttons
/// macOS has space in its Options dropdown, so we can use full wording
#[cfg(target_os = "macos")]
pub fn macos_snooze_label(total_seconds: u32) -> String {
    format!("Snooze for {}", format_snooze_duration(total_seconds))
}

/// formats a snooze duration in seconds into a compact label for Windows/Linux
/// - 15 -> "15s"
/// - 60 -> "1m"
/// - 900 -> "15m"
/// - 3600 -> "1h"
/// - 86400 -> "1d"
/// - 604800 -> "1w"
#[cfg(any(target_os = "linux", target_os = "windows"))]
pub fn format_compact_snooze_duration(total_seconds: u32) -> String {
    if total_seconds >= SECONDS_PER_WEEK {
        format!("{}w", total_seconds / SECONDS_PER_WEEK)
    } else if total_seconds >= SECONDS_PER_DAY {
        format!("{}d", total_seconds / SECONDS_PER_DAY)
    } else if total_seconds >= SECONDS_PER_HOUR {
        format!("{}h", total_seconds / SECONDS_PER_HOUR)
    } else if total_seconds >= SECONDS_PER_MINUTE {
        format!("{}m", total_seconds / SECONDS_PER_MINUTE)
    } else {
        format!("{}s", total_seconds)
    }
}

/// label shown on Windows and Linux notification action buttons
/// these platforms have constrained button widths, so we use a short "+" prefix
#[cfg(any(target_os = "linux", target_os = "windows"))]
pub fn compact_snooze_label(total_seconds: u32) -> String {
    format!("+ {}", format_compact_snooze_duration(total_seconds))
}

#[cfg(target_os = "macos")]
pub const MACOS_COMPLETE: &str = "garden.chiri.Chiri.action.complete";

#[cfg(any(target_os = "linux", target_os = "windows"))]
pub fn snooze_action_id(total_seconds: u32) -> String {
    format!("snooze-{total_seconds}s")
}

#[cfg(target_os = "macos")]
pub fn macos_snooze_action_id(total_seconds: u32) -> String {
    format!("garden.chiri.Chiri.action.snooze-{total_seconds}s")
}

pub fn parse_snooze_duration(action_id: &str) -> Option<u32> {
    let suffix = action_id.strip_prefix("snooze-")?.strip_suffix("s")?;
    suffix.parse().ok()
}

#[cfg(any(target_os = "linux", target_os = "windows"))]
pub fn plain_action_name(action_id: &str) -> Option<String> {
    match action_id {
        COMPLETE => Some(COMPLETE.to_string()),
        _ => parse_snooze_duration(action_id).map(|_| action_id.to_string()),
    }
}

#[cfg(target_os = "macos")]
pub fn macos_action_name(action_id: &str) -> Option<String> {
    let canonical = match action_id {
        MACOS_COMPLETE => COMPLETE,
        _ => action_id
            .strip_prefix("garden.chiri.Chiri.action.")
            .unwrap_or(action_id),
    };

    if canonical == COMPLETE || parse_snooze_duration(canonical).is_some() {
        Some(canonical.to_string())
    } else {
        None
    }
}

pub fn show_main_window<R: tauri::Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();

        #[cfg(target_os = "macos")]
        crate::window::show_dock_icon(app);
    }
}

pub fn emit_action<R: tauri::Runtime>(
    app: &AppHandle<R>,
    action: &str,
    task_id: String,
    notification_type: String,
) {
    let _ = app.emit(
        "notification-action",
        NotificationActionEvent {
            action: action.to_string(),
            task_id,
            notification_type,
        },
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "macos")]
    #[test]
    fn formats_snooze_durations() {
        assert_eq!(format_snooze_duration(15), "15 seconds");
        assert_eq!(format_snooze_duration(60), "1 minute");
        assert_eq!(format_snooze_duration(900), "15 minutes");
        assert_eq!(format_snooze_duration(3600), "1 hour");
        assert_eq!(format_snooze_duration(7200), "2 hours");
        assert_eq!(format_snooze_duration(86400), "1 day");
        assert_eq!(format_snooze_duration(172800), "2 days");
        assert_eq!(format_snooze_duration(604800), "1 week");
        assert_eq!(format_snooze_duration(1209600), "2 weeks");
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_snooze_labels_use_full_phrasing() {
        assert_eq!(macos_snooze_label(900), "Snooze for 15 minutes");
        assert_eq!(macos_snooze_label(3600), "Snooze for 1 hour");
        assert_eq!(macos_snooze_label(7200), "Snooze for 2 hours");
        assert_eq!(macos_snooze_label(86400), "Snooze for 1 day");
        assert_eq!(macos_snooze_label(604800), "Snooze for 1 week");
    }

    #[cfg(any(target_os = "linux", target_os = "windows"))]
    #[test]
    fn compact_snooze_labels_use_plus_prefix() {
        assert_eq!(compact_snooze_label(15), "+ 15s");
        assert_eq!(compact_snooze_label(60), "+ 1m");
        assert_eq!(compact_snooze_label(900), "+ 15m");
        assert_eq!(compact_snooze_label(3600), "+ 1h");
        assert_eq!(compact_snooze_label(7200), "+ 2h");
        assert_eq!(compact_snooze_label(86400), "+ 1d");
        assert_eq!(compact_snooze_label(604800), "+ 1w");
    }
}
