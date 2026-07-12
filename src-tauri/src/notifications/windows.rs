use tauri::AppHandle;

use super::{
    actions,
    types::{
        NotificationActionConfig, NotificationType, SendNotificationRequest,
        SimpleNotificationRequest,
    },
};

/// ensure the app notification icon is present at a stable, known path
///
/// embeds the 128x128 PNG at compile time and writes it to
/// `%LOCALAPPDATA%\Chiri\notification-icon.png` on every launch so the path
/// is always valid regardless of install type or working directory
/// returns the absolute path to the icon file, or `None` if writing failed
pub fn ensure_notification_icon() -> Option<std::path::PathBuf> {
    const ICON_BYTES: &[u8] = include_bytes!("../../icons/128x128.png");

    let icon_dir = match dirs::data_local_dir() {
        Some(d) => d.join("Chiri"),
        None => {
            log::info!("[Notifications] Could not determine %LOCALAPPDATA%, icon will not be set");
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

pub fn send_notification(
    app: &AppHandle,
    request: &SendNotificationRequest,
    config: &NotificationActionConfig,
) -> Result<(), String> {
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
        NotificationType::Overdue | NotificationType::Reminder => {
            for key in &config.action_order {
                match key.as_str() {
                    "complete" if config.show_complete => {
                        toast.action(Action::new("Complete", actions::COMPLETE, ""));
                    }
                    "snooze" if config.show_snooze => {
                        let snooze_id = actions::snooze_action_id(config.snooze_duration_minutes);
                        toast.action(Action::new(
                            &format!("Snooze {}min", config.snooze_duration_minutes),
                            &snooze_id,
                            "",
                        ));
                    }
                    _ => {}
                }
            }
        }
    }

    let app = app.clone();

    ToastManager::new(&app_id)
        .on_activated(None, move |action| {
            let action_name = match &action {
                Some(act) => match actions::plain_action_name(act.arg.as_str()) {
                    Some(action_name) => action_name,
                    None => return,
                },
                // body click with no button arg → just bring the main window forward.
                // highlight/focus-task behavior will be added in a follow-up.
                None => {
                    actions::show_main_window(&app);
                    return;
                }
            };

            actions::emit_action(
                &app,
                &action_name,
                task_id.clone(),
                notification_type.clone(),
            );
        })
        .show(&toast)
        .map_err(|e| e.to_string())
}

pub fn send_simple_notification(
    app: &AppHandle,
    request: &SimpleNotificationRequest,
) -> Result<(), String> {
    use winrt_toast_reborn::{Toast, ToastManager};

    let app_id = app.config().identifier.clone();
    let mut toast = Toast::new();
    toast
        .text1(request.title.as_str())
        .text2(request.body.as_str());

    ToastManager::new(&app_id)
        .show(&toast)
        .map_err(|e| e.to_string())
}
