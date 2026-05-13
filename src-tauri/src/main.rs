#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod data_migration;
mod legacy_migration;
mod http_client;
mod install_type;
mod linux;
mod logging;
mod macos;
mod migrations;
mod notifications;
mod plist;
mod tray;
mod window_events;

#[cfg(target_os = "macos")]
use tauri::Emitter;
use tauri::Manager;
#[cfg(target_os = "macos")]
use tauri::RunEvent;
#[cfg(any(windows, target_os = "linux"))]
use tauri_plugin_deep_link::DeepLinkExt;
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
    // On Linux, WebKitGTK 2.42+ allocates DMA-BUF buffers via GBM, which is broken
    // on NVIDIA proprietary drivers under Wayland and causes an immediate crash ("Error 71: Protocol error").
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    // Initialize default crypto provider for rustls (required for reqwest in CEF)
    #[cfg(feature = "cef")]
    {
        let _ = rustls::crypto::aws_lc_rs::default_provider().install_default();
    }

    let db_migrations = migrations::get_migrations();

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
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
            force_quit,
            http_client::caldav_request,
            install_type::get_install_type,
            install_type::should_disable_updates,
            linux::desktop::is_gnome_desktop,
            linux::fs::read_file_bytes,
            linux::window_decorations::set_window_decorations,
            macos::menu::apply_macos_menu_fixes,
            notifications::manager::send_notification_with_actions,
            notifications::manager::send_simple_notification,
            notifications::permissions::check_notification_permission,
            notifications::permissions::request_notification_permission,
            plist::convert_plist_to_xml,
            tray::get_tray_enabled,
            tray::initialize_tray,
            tray::set_tray_visible,
            tray::update_tray_sync_enabled,
            tray::update_tray_sync_time,
        ])
        .setup(|_app| {
            // Register deep link URL scheme handler (macOS uses Info.plist; Windows/Linux
            // need explicit runtime registration so the OS knows which binary to call).
            #[cfg(any(windows, target_os = "linux"))]
            _app.deep_link().register_all()?;

            // Disable App Nap after logging has been initialized so App Nap
            // messages follow the same format as the rest of the app logs.
            #[cfg(target_os = "macos")]
            {
                macos::app_nap::disable_app_nap();
            }

            // Migrate data from legacy moe.sapphic.Chiri identifier (pre-0.9.0)
            legacy_migration::migrate_from_legacy_identifier(_app);

            // Migrate data from old caldav-tasks app
            data_migration::migrate_from_caldav_tasks(_app);

            // Configure titlebar BEFORE window is shown (must happen before realization)
            #[cfg(target_os = "linux")]
            if let Some(window) = _app.get_webview_window("main") {
                linux::window_decorations::configure_titlebar_for_de(&window);
            }

            // Initialize notification manager with actions
            #[cfg(target_os = "macos")]
            {
                let bundle_id = _app.config().identifier.clone();
                let notification_manager =
                    notifications::NotificationManagerState::new(bundle_id);
                notification_manager.register_categories_and_handler(_app.handle().clone());
                _app.manage(notification_manager);
            }
            #[cfg(not(target_os = "macos"))]
            {
                let bundle_id = _app.config().identifier.clone();
                let notification_manager =
                    notifications::NotificationManagerState::new(bundle_id.clone());
                _app.manage(notification_manager);
            }

            // Register with the Windows notification platform so toasts show the correct
            // app name and icon. The icon is embedded in the binary at compile time and
            // written to %LOCALAPPDATA%\Chiri\ so the path is always valid.
            #[cfg(target_os = "windows")]
            {
                let bundle_id = _app.config().identifier.clone();
                let display_name = _app.package_info().name.clone();
                let icon_path = notifications::ensure_notification_icon();
                match winrt_toast_reborn::register(
                    &bundle_id,
                    &display_name,
                    icon_path.as_deref(),
                ) {
                    Ok(()) => log::info!("[Notifications] Windows notification platform registration succeeded with AUM ID {bundle_id:?}"),
                    Err(e) => log::info!("[Notifications] Windows notification platform registration failed for AUM ID {bundle_id:?}: {e:?}"),
                }
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
