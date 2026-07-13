use tauri::{AppHandle, Emitter, Manager};

use super::types::NotificationActionEvent;

pub const COMPLETE: &str = "complete";
pub const HIGHLIGHT: &str = "highlight";

pub const MAX_NOTIFICATION_ACTIONS: usize = 5;

/// formats a snooze duration in minutes into a human-readable label
/// - 1 -> "1 min"
/// - 59 -> "59 min"
/// - 60 -> "1 hour"
/// - 120 -> "2 hours"
/// - 90 -> "90 min"
#[cfg(target_os = "macos")]
pub fn format_snooze_duration(minutes: u32) -> String {
    if minutes == 1 {
        "1 min".to_string()
    } else if minutes < 60 {
        format!("{minutes} min")
    } else if minutes == 60 {
        "1 hour".to_string()
    } else if minutes.is_multiple_of(60) {
        format!("{} hours", minutes / 60)
    } else {
        format!("{minutes} min")
    }
}

/// label shown on macOS notification action buttons
/// macOS has space in its Options dropdown, so we can use full wording
#[cfg(target_os = "macos")]
pub fn macos_snooze_label(minutes: u32) -> String {
    format!("Snooze for {}", format_snooze_duration(minutes))
}

/// formats a snooze duration in minutes into a compact label for Windows/Linux
/// - 1 -> "1m"
/// - 59 -> "59m"
/// - 60 -> "1h"
/// - 120 -> "2h"
/// - 90 -> "90m"
#[cfg(any(target_os = "linux", target_os = "windows"))]
pub fn format_compact_snooze_duration(minutes: u32) -> String {
    if minutes == 1 {
        "1m".to_string()
    } else if minutes < 60 {
        format!("{minutes}m")
    } else if minutes == 60 {
        "1h".to_string()
    } else if minutes.is_multiple_of(60) {
        format!("{}h", minutes / 60)
    } else {
        format!("{minutes}m")
    }
}

/// label shown on Windows and Linux notification action buttons
/// these platforms have constrained button widths, so we use a short "+" prefix
#[cfg(any(target_os = "linux", target_os = "windows"))]
pub fn compact_snooze_label(minutes: u32) -> String {
    format!("+ {}", format_compact_snooze_duration(minutes))
}

#[cfg(target_os = "macos")]
pub const MACOS_COMPLETE: &str = "garden.chiri.Chiri.action.complete";

#[cfg(any(target_os = "linux", target_os = "windows"))]
pub fn snooze_action_id(minutes: u32) -> String {
    format!("snooze-{minutes}min")
}

#[cfg(target_os = "macos")]
pub fn macos_snooze_action_id(minutes: u32) -> String {
    format!("garden.chiri.Chiri.action.snooze-{minutes}min")
}

pub fn parse_snooze_duration(action_id: &str) -> Option<u32> {
    let suffix = action_id.strip_prefix("snooze-")?.strip_suffix("min")?;
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
        assert_eq!(format_snooze_duration(1), "1 min");
        assert_eq!(format_snooze_duration(15), "15 min");
        assert_eq!(format_snooze_duration(59), "59 min");
        assert_eq!(format_snooze_duration(60), "1 hour");
        assert_eq!(format_snooze_duration(90), "90 min");
        assert_eq!(format_snooze_duration(120), "2 hours");
        assert_eq!(format_snooze_duration(180), "3 hours");
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_snooze_labels_use_full_phrasing() {
        assert_eq!(macos_snooze_label(15), "Snooze for 15 min");
        assert_eq!(macos_snooze_label(60), "Snooze for 1 hour");
        assert_eq!(macos_snooze_label(120), "Snooze for 2 hours");
    }

    #[cfg(any(target_os = "linux", target_os = "windows"))]
    #[test]
    fn compact_snooze_labels_use_plus_prefix() {
        assert_eq!(compact_snooze_label(15), "+ 15m");
        assert_eq!(compact_snooze_label(60), "+ 1h");
        assert_eq!(compact_snooze_label(120), "+ 2h");
    }
}
