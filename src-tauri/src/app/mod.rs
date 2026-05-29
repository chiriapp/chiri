mod commands;
mod events;
mod setup;

#[cfg(any(windows, target_os = "linux"))]
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_sql::Builder as SqlBuilder;

use crate::{
    http, install, linux, logging, macos, notifications, preferences, schema, tray, utils, window,
};

type AppRuntime = tauri::Wry;

pub fn run() {
    setup::configure_process_environment();

    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // On Linux and Windows, forward args to the deep-link plugin so
            // onOpenUrl fires for URLs opened while the app is already running.
            #[cfg(any(windows, target_os = "linux"))]
            app.deep_link().handle_cli_arguments(_args.iter());

            setup::focus_main_window(app);
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(logging::build_logging_plugin().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:chiri.db", schema::get_migrations())
                .build(),
        )
        .manage(linux::unifiedpush::UnifiedPushState::default())
        .manage(tray::TrayState::default())
        .invoke_handler(tauri::generate_handler![
            commands::force_quit,
            http::http_request,
            install::get_install_type,
            install::should_disable_updates,
            linux::desktop::is_gnome_desktop,
            linux::unifiedpush::linux_unifiedpush_available,
            linux::unifiedpush::linux_unifiedpush_register,
            linux::unifiedpush::linux_unifiedpush_unregister,
            linux::decorations::set_window_decorations,
            macos::login_item::disable_macos_launch_at_login,
            macos::login_item::enable_macos_launch_at_login,
            macos::login_item::get_macos_launch_at_login_status,
            macos::login_item::was_macos_launched_as_login_item,
            macos::menu::apply_macos_menu_fixes,
            notifications::commands::send_notification_with_actions,
            notifications::commands::send_simple_notification,
            notifications::permission::check_notification_permission,
            notifications::permission::request_notification_permission,
            preferences::get_system_region_preferences,
            tray::commands::get_tray_enabled,
            tray::commands::initialize_tray,
            tray::commands::set_tray_visible,
            tray::commands::update_tray_sync_enabled,
            tray::commands::update_tray_sync_time,
            utils::fs::read_file_bytes,
            utils::plist::convert_plist_to_xml,
            window::set_hide_dock_icon_when_window_closed,
        ])
        .setup(setup::setup_app)
        .on_window_event(|window, event| {
            window::handle_window_event(window, event);
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(events::handle_run_event);
}
