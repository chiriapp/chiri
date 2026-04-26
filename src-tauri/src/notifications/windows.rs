use tauri::{AppHandle, Emitter, Manager};

use super::manager::{NotificationActionEvent, NotificationType, SendNotificationRequest};

/// Ensure the app notification icon is present at a stable, known path.
///
/// Embeds the 128x128 PNG at compile time and writes it to
/// `%LOCALAPPDATA%\Chiri\notification-icon.png` on every launch so the path
/// is always valid regardless of install type or working directory.
/// Returns the absolute path to the icon file, or `None` if writing failed.
pub fn ensure_notification_icon() -> Option<std::path::PathBuf> {
    const ICON_BYTES: &[u8] = include_bytes!("../../icons/128x128.png");

    let icon_dir = match dirs::data_local_dir() {
        Some(d) => d.join("Chiri"),
        None => {
            log::info!("[Notifications] Could not determine %LOCALAPPDATA% — icon will not be set");
            return None;
        }
    };

    if let Err(e) = std::fs::create_dir_all(&icon_dir) {
        log::info!("[Notifications] Failed to create icon dir {icon_dir:?}: {e}");
        return None;
    }

    let icon_path = icon_dir.join("notification-icon.png");

    if let Err(e) = std::fs::write(&icon_path, ICON_BYTES) {
        log::info!("[Notifications] Failed to write notification icon: {e}");
        return None;
    }

    Some(icon_path)
}

pub fn send_notification(app: &AppHandle, request: &SendNotificationRequest) -> Result<(), String> {
    use winrt_toast_reborn::{Action, Toast, ToastManager};

    let app_id = app.config().identifier.clone();
    let task_id = request.task_id.clone();
    let notification_type =
        serde_json::to_string(&request.notification_type).map_err(|e| e.to_string())?;

    let mut toast = Toast::new();
    toast
        .text1(request.title.as_str())
        .text2(request.body.as_str());

    match request.notification_type {
        NotificationType::Overdue => {
            toast
                .action(Action::new("Complete", "complete", ""))
                .action(Action::new("Snooze 1hr", "snooze-1hr", ""))
                .action(Action::new("View Task", "view", ""));
        }
        NotificationType::Reminder => {
            toast
                .action(Action::new("Complete", "complete", ""))
                .action(Action::new("Snooze 15min", "snooze-15min", ""))
                .action(Action::new("View Task", "view", ""));
        }
    }

    let app = app.clone();

    ToastManager::new(&app_id)
        .on_activated(None, move |action| {
            let action_name = match &action {
                Some(act) => match act.arg.as_str() {
                    "complete" => "complete",
                    "snooze-15min" => "snooze-15min",
                    "snooze-1hr" => "snooze-1hr",
                    "view" => "view",
                    _ => return,
                },
                // Body click with no button arg → treat as view/open
                None => "view",
            };

            if action_name == "view" {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }

            let _ = app.emit(
                "notification-action",
                NotificationActionEvent {
                    action: action_name.to_string(),
                    task_id: task_id.clone(),
                    notification_type: notification_type.clone(),
                },
            );
        })
        .show(&toast)
        .map_err(|e| e.to_string())
}
