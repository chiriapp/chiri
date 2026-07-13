use tauri::Manager;

use super::NotificationManagerState;

pub fn initialize<R: tauri::Runtime>(app: &mut tauri::App<R>) {
    let bundle_id = app.config().identifier.clone();
    let notification_manager = NotificationManagerState::new(bundle_id.clone());

    #[cfg(target_os = "macos")]
    {
        let app_handle = app.handle().clone();
        let nm = notification_manager.clone();
        let _ = app.handle().run_on_main_thread(move || {
            nm.register_categories_and_handler(app_handle, &nm.config());
        });
    }

    app.manage(notification_manager);

    #[cfg(target_os = "windows")]
    register_windows_platform(app, &bundle_id);
}

#[cfg(target_os = "windows")]
fn register_windows_platform<R: tauri::Runtime>(app: &tauri::App<R>, bundle_id: &str) {
    let display_name = app.package_info().name.clone();
    let icon_path = super::windows::ensure_notification_icon();
    match winrt_toast_reborn::register(bundle_id, &display_name, icon_path.as_deref()) {
        Ok(()) => log::info!(
            "[Notifications] Windows notification platform registration succeeded with AUM ID {bundle_id:?}"
        ),
        Err(e) => log::info!(
            "[Notifications] Windows notification platform registration failed for AUM ID {bundle_id:?}: {e:?}"
        ),
    }
}
