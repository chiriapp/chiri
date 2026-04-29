use tauri::{AppHandle, Emitter, Manager};

use super::manager::{NotificationActionEvent, NotificationType, SendNotificationRequest};

/// Search the system hicolor icon theme for the first matching candidate name.
/// The icon name differs by package type:
///   Flatpak  → moe.sapphic.Chiri  (bundle ID, detected separately via FLATPAK_ID)
///   AUR      → chiri              (lowercase binary name)
///   deb/rpm  → Chiri              (package name)
fn find_installed_icon_name(candidates: &[&str]) -> Option<String> {
    let mut search_dirs = vec![
        std::path::PathBuf::from("/usr/share/icons/hicolor"),
        std::path::PathBuf::from("/usr/local/share/icons/hicolor"),
    ];
    if let Some(home) = dirs::home_dir() {
        search_dirs.push(home.join(".local/share/icons/hicolor"));
    }

    for candidate in candidates {
        for dir in &search_dirs {
            for (size, ext) in &[
                ("scalable", "svg"),
                ("128x128", "png"),
                ("256x256", "png"),
                ("64x64", "png"),
                ("48x48", "png"),
            ] {
                if dir
                    .join(size)
                    .join("apps")
                    .join(format!("{candidate}.{ext}"))
                    .exists()
                {
                    return Some(candidate.to_string());
                }
            }
        }
    }
    None
}

pub async fn send_notification(
    app: &AppHandle,
    request: &SendNotificationRequest,
) -> Result<(), String> {
    let mut notif = notify_rust::Notification::new();
    notif
        .summary(&request.title)
        .body(&request.body)
        .appname(&app.package_info().name);

    // Flatpak uses the bundle ID as the icon name; other installs vary (AUR uses
    // the binary name, deb/rpm use the package name), so probe the hicolor theme.
    if std::env::var("FLATPAK_ID").is_ok() {
        notif.icon(&app.config().identifier);
    } else {
        let bundle_id = app.config().identifier.clone();
        let pkg_name = app.package_info().name.clone();
        let pkg_name_lower = pkg_name.to_lowercase();
        let icon_name = find_installed_icon_name(&[&bundle_id, &pkg_name, &pkg_name_lower])
            .unwrap_or(pkg_name);
        notif.icon(&icon_name);
    }

    match request.notification_type {
        NotificationType::Overdue => {
            notif
                .action("complete", "Complete")
                .action("snooze-1hr", "Snooze 1hr")
                .action("view", "View Task");
        }
        NotificationType::Reminder => {
            notif
                .action("complete", "Complete")
                .action("snooze-15min", "Snooze 15min")
                .action("view", "View Task");
        }
    }

    let handle = notif.show().map_err(|e| e.to_string())?;

    let task_id = request.task_id.clone();
    let notification_type =
        serde_json::to_string(&request.notification_type).map_err(|e| e.to_string())?;
    let app = app.clone();

    tauri::async_runtime::spawn_blocking(move || {
        handle.wait_for_action(|action| {
            let action_name = match action {
                "complete" => "complete",
                "snooze-15min" => "snooze-15min",
                "snooze-1hr" => "snooze-1hr",
                "view" | "__default" => "view",
                _ => return,
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
                    task_id,
                    notification_type,
                },
            );
        });
    });

    Ok(())
}
