use tauri::{AppHandle, Emitter, Manager};

use super::types::NotificationActionEvent;

pub const COMPLETE: &str = "complete";

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
