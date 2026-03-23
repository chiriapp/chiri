#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod app_nap;
mod data_migration;
mod logging;
mod migrations;
mod notification_manager;
mod notifications;
mod plist_utils;
mod tray;
mod window_decorations;
mod window_events;

use tauri::{Manager, RunEvent};
use tauri_plugin_sql::Builder;

#[cfg_attr(feature = "cef", tauri::cef_entry_point)]
fn main() {
    // Initialize default crypto provider for rustls (required for reqwest in CEF)
    #[cfg(feature = "cef")]
    {
        let _ = rustls::crypto::aws_lc_rs::default_provider().install_default();
    }

    // Disable App Nap on macOS to ensure periodic sync and notifications work
    // when the window is hidden in tray mode
    #[cfg(target_os = "macos")]
    {
        app_nap::disable_app_nap();
    }

    let db_migrations = migrations::get_migrations();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When a second instance is launched, focus the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();

                // on macOS, show the dock icon when the window is shown
                #[cfg(target_os = "macos")]
                {
                    let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                }
            }
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(logging::build_logging_plugin().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            Builder::default()
                .add_migrations("sqlite:chiri.db", db_migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            tray::update_tray_sync_time,
            tray::update_tray_sync_enabled,
            tray::set_tray_visible,
            tray::get_tray_enabled,
            tray::initialize_tray,
            tray::is_gnome_desktop,
            plist_utils::convert_plist_to_xml,
            plist_utils::read_file_bytes,
            notifications::check_notification_permission,
            notifications::request_notification_permission,
            notification_manager::send_notification_with_actions
        ])
        .setup(|_app| {
            // Migrate data from old caldav-tasks app
            data_migration::migrate_from_caldav_tasks(_app);

            // Configure titlebar BEFORE window is shown (must happen before realization)
            #[cfg(target_os = "linux")]
            if let Some(window) = _app.get_webview_window("main") {
                window_decorations::configure_titlebar_for_de(&window);
            }

            // Initialize notification manager with actions
            #[cfg(target_os = "macos")]
            {
                let bundle_id = _app.config().identifier.clone();
                let notification_manager = notification_manager::NotificationManagerState::new(bundle_id);
                notification_manager.register_categories_and_handler(_app.handle().clone());
                _app.manage(notification_manager);
            }

            // tray will be initialized from frontend after reading settings
            Ok(())
        })
        .on_window_event(|window, event| {
            window_events::handle_window_event(window, event);
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            // handle app reactivation (e.g., from Spotlight, Dock, Cmd+Tab)
            #[cfg(target_os = "macos")]
            {
                if let RunEvent::Reopen { .. } = event {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();

                        // restore the dock icon
                        let _ = app_handle.set_activation_policy(tauri::ActivationPolicy::Regular);
                    }
                }
            }
        });
}
