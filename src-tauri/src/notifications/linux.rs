use tauri::AppHandle;

use super::{
    actions::{self, MAX_NOTIFICATION_ACTIONS},
    types::{
        NotificationActionConfig, NotificationType, SendNotificationRequest,
        SimpleNotificationRequest,
    },
};

/// search the system hicolor icon theme for the first matching candidate name
/// the icon name differs by package type:
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
    let bundle_id = app.config().identifier.clone();
    let pkg_name = app.package_info().name.clone();

    // the AppImage config overrides productName with the bundle identifier, so
    // app_name would otherwise be "garden.chiri.Chiri". KDE displays that as the
    // notification source, so fall back to the identifier's trailing segment as
    // the human-readable display name (e.g. "Chiri"). GNOME already uses the
    // .desktop file's Name, which is unaffected
    let display_name = pkg_name
        .split('.')
        .last()
        .map(|s| s.to_string())
        .unwrap_or(pkg_name);
    notif.appname(&display_name);

    // on AppImage the .desktop file is named after the identifier, not the
    // display name. pin the desktop-entry hint so notification servers still
    // resolve the correct icon and launcher entry
    if std::env::var_os("APPIMAGE").is_some() {
        notif.hint(notify_rust::Hint::DesktopEntry(bundle_id.clone()));
    }

    // Flatpak uses the bundle ID as the icon name; other installs vary (AUR uses
    // the binary name, deb/rpm use the package name), so probe the hicolor theme
    if std::env::var("FLATPAK_ID").is_ok() {
        notif.icon(&app.config().identifier);
    } else {
        let pkg_name = app.package_info().name.clone();
        let pkg_name_lower = pkg_name.to_lowercase();
        let icon_name =
            find_installed_icon_name(&[&bundle_id, &pkg_name, &pkg_name_lower]).unwrap_or(pkg_name);
        notif.icon(&icon_name);
    }
}

pub fn send_notification(
    app: &AppHandle,
    request: &SendNotificationRequest,
    config: &NotificationActionConfig,
) -> Result<(), String> {
    let mut notif = notify_rust::Notification::new();
    notif.summary(&request.title).body(&request.body);
    apply_notification_identity(app, &mut notif);

    match request.notification_type {
        NotificationType::Overdue | NotificationType::Reminder => {
            let mut action_count = 0usize;

            for key in &config.action_order {
                if action_count >= MAX_NOTIFICATION_ACTIONS {
                    break;
                }

                match key.as_str() {
                    "complete" if config.show_complete => {
                        notif.action(actions::COMPLETE, actions::COMPLETE_LABEL);
                        action_count += 1;
                    }
                    "snooze" if config.show_snooze => {
                        for duration in &config.snooze_durations {
                            if action_count >= MAX_NOTIFICATION_ACTIONS {
                                break;
                            }
                            let snooze_id = actions::snooze_action_id(*duration);
                            notif.action(&snooze_id, &actions::compact_snooze_label(*duration));
                            action_count += 1;
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    let task_id = request.task_id.clone();
    let notification_type =
        serde_json::to_string(&request.notification_type).map_err(|e| e.to_string())?;
    let app = app.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let handle = match notif.show() {
            Ok(h) => h,
            Err(e) => {
                log::warn!("[Notifications] Failed to show notification: {e}");
                return;
            }
        };
        handle.wait_for_action(|action| {
            // body click on Linux is reported as the default action; bring the
            // main window forward and ask the frontend to highlight the task.
            if action == "__default" {
                actions::show_main_window(&app);
                actions::emit_action(&app, actions::HIGHLIGHT, task_id, notification_type);
                return;
            }

            let Some(action_name) = actions::plain_action_name(action) else {
                return;
            };

            actions::emit_action(&app, &action_name, task_id, notification_type);
        });
    });

    Ok(())
}

pub fn send_simple_notification(
    app: &AppHandle,
    request: &SimpleNotificationRequest,
) -> Result<(), String> {
    let mut notif = notify_rust::Notification::new();
    notif.summary(&request.title).body(&request.body);
    apply_notification_identity(app, &mut notif);
    tauri::async_runtime::spawn_blocking(move || {
        if let Err(e) = notif.show() {
            log::warn!("[Notifications] Failed to show simple notification: {e}");
        }
    });
    Ok(())
}
