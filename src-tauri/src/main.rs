#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod app_nap;
mod data_migration;
mod http_client;
mod install_type;
mod logging;
mod macos_menu;
mod migrations;
mod notification_manager;
mod notifications;
mod plist_utils;
mod tray;
mod window_decorations;
mod window_events;

#[cfg(target_os = "macos")]
use tauri::Emitter;
use tauri::Manager;
#[cfg(target_os = "macos")]
use tauri::RunEvent;
use tauri_plugin_sql::Builder;

/// Exits the process directly via the OS, bypassing Tauri's RunEvent::ExitRequested.
/// Must be used instead of tauri-plugin-process's exit(), which calls AppHandle::exit()
/// and re-triggers ExitRequested, causing an infinite prevent/exit loop.

#[tauri::command]
fn force_quit() {
    std::process::exit(0);
}

#[cfg_attr(feature = "cef", tauri::cef_entry_point)]
fn main() {
    // Initialize default crypto provider for rustls (required for reqwest in CEF)
    #[cfg(feature = "cef")]
    {
        let _ = rustls::crypto::aws_lc_rs::default_provider().install_default();
    }

    let db_migrations = migrations::get_migrations();

    let builder = tauri::Builder::default()
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
            notification_manager::send_notification_with_actions,
            notification_manager::send_simple_notification,
            macos_menu::apply_macos_menu_fixes,
            force_quit,
            install_type::should_disable_updates,
            install_type::get_install_type,
            http_client::caldav_request
        ])
        .setup(|_app| {
            // Disable App Nap after logging has been initialized so App Nap
            // messages follow the same format as the rest of the app logs.
            #[cfg(target_os = "macos")]
            {
                app_nap::disable_app_nap();
            }

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
                let notification_manager =
                    notification_manager::NotificationManagerState::new(bundle_id);
                notification_manager.register_categories_and_handler(_app.handle().clone());
                _app.manage(notification_manager);
            }

            // tray will be initialized from frontend after reading settings
            Ok(())
        })
        .on_window_event(|window, event| {
            window_events::handle_window_event(window, event);
        });

    // CEF/macOS runs without an application menu.
    #[cfg(all(target_os = "macos", feature = "cef"))]
    let builder = builder.enable_macos_default_menu(false);

    #[cfg(not(all(target_os = "macos", feature = "cef")))]
    let builder = builder;

    builder
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| {
            match event {
                // On macOS + CEF, going through NSApplication terminate can trigger
                // a CEF shutdown crash report even on normal quits. Exit directly.
                #[cfg(all(target_os = "macos", feature = "cef"))]
                RunEvent::ExitRequested { .. } => {
                    std::process::exit(0);
                }

                // Intercept all quit requests (Cmd+Q, Dock quit, window close) so the
                // frontend can apply double-press confirmation when enabled. The frontend
                // calls exit(0) via tauri-plugin-process, which bypasses this handler.
                #[cfg(all(target_os = "macos", not(feature = "cef")))]
                RunEvent::ExitRequested { api, .. } => {
                    api.prevent_exit();
                    let _ = _app_handle.emit("app:quit-requested", ());
                }

                // handle app reactivation (e.g., from Spotlight, Dock, Cmd+Tab)
                #[cfg(target_os = "macos")]
                RunEvent::Reopen { .. } => {
                    if let Some(window) = _app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();

                        // restore the dock icon
                        let _ = _app_handle.set_activation_policy(tauri::ActivationPolicy::Regular);
                    }
                }

                _ => {}
            }
        });
}
