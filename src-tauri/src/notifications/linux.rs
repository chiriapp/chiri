use tauri::AppHandle;

use super::{
    actions,
    types::{NotificationType, SendNotificationRequest, SimpleNotificationRequest},
};

/// Search the system hicolor icon theme for the first matching candidate name.
/// The icon name differs by package type:
///   Flatpak  → garden.chiri.Chiri (bundle ID, detected separately via FLATPAK_ID)
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

fn apply_notification_identity(app: &AppHandle, notif: &mut notify_rust::Notification) {
    notif.appname(&app.package_info().name);

    // Flatpak uses the bundle ID as the icon name; other installs vary (AUR uses
    // the binary name, deb/rpm use the package name), so probe the hicolor theme.
    if std::env::var("FLATPAK_ID").is_ok() {
        notif.icon(&app.config().identifier);
    } else {
        let bundle_id = app.config().identifier.clone();
        let pkg_name = app.package_info().name.clone();
        let pkg_name_lower = pkg_name.to_lowercase();
        let icon_name =
            find_installed_icon_name(&[&bundle_id, &pkg_name, &pkg_name_lower]).unwrap_or(pkg_name);
        notif.icon(&icon_name);
    }
}

pub async fn send_notification(
    app: &AppHandle,
    request: &SendNotificationRequest,
) -> Result<(), String> {
    let mut notif = notify_rust::Notification::new();
    notif.summary(&request.title).body(&request.body);
    apply_notification_identity(app, &mut notif);

    match request.notification_type {
        NotificationType::Overdue => {
            notif
                .action(actions::COMPLETE, "Complete")
                .action(actions::SNOOZE_1HR, "Snooze 1hr")
                .action(actions::VIEW, "View Task");
        }
        NotificationType::Reminder => {
            notif
                .action(actions::COMPLETE, "Complete")
                .action(actions::SNOOZE_15MIN, "Snooze 15min")
                .action(actions::VIEW, "View Task");
        }
    }

    let handle = notif.show().map_err(|e| e.to_string())?;

    let task_id = request.task_id.clone();
    let notification_type =
        serde_json::to_string(&request.notification_type).map_err(|e| e.to_string())?;
    let app = app.clone();

    tauri::async_runtime::spawn_blocking(move || {
        handle.wait_for_action(|action| {
            let Some(action_name) = actions::plain_action_name(action) else {
                return;
            };

            if action_name == actions::VIEW {
                actions::show_main_window(&app);
            }

            actions::emit_action(&app, action_name, task_id, notification_type);
        });
    });

    Ok(())
}

pub async fn send_simple_notification(
    app: &AppHandle,
    request: &SimpleNotificationRequest,
) -> Result<(), String> {
    let mut notif = notify_rust::Notification::new();
    notif.summary(&request.title).body(&request.body);
    apply_notification_identity(app, &mut notif);
    notif.show().map_err(|e| e.to_string())?;
    Ok(())
}
