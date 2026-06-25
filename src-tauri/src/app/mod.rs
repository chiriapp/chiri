mod commands;
mod events;
mod setup;

#[cfg(any(windows, target_os = "linux"))]
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_sql::Builder as SqlBuilder;

#[cfg(target_os = "linux")]
use crate::linux;
#[cfg(target_os = "macos")]
use crate::macos;

use crate::{
    http, install, logging, notifications, preferences, push, schema, tray, utils, window,
};

type AppRuntime = tauri::Wry;

pub fn run() {
    setup::configure_process_environment();

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // on Linux and Windows, forward args to the deep-link plugin so
            // onOpenUrl fires for URLs opened while the app is already running
            #[cfg(any(windows, target_os = "linux"))]
            app.deep_link().handle_cli_arguments(_args.iter());

            setup::focus_main_window(app);
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![commands::AUTOSTART_LAUNCH_ARG]),
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
        .manage(tray::TrayState::default())
        .manage(push::maintenance::PushMaintenanceState::default())
        .manage(push::ntfy::NtfySseState::default());

    #[cfg(target_os = "linux")]
    let builder = builder.manage(push::kunifiedpush::UnifiedPushState::default());

    builder
        .invoke_handler(tauri::generate_handler![
            commands::force_quit,
            commands::was_launched_from_autostart,
            http::http_request,
            install::get_install_type,
            install::should_disable_updates,
            #[cfg(target_os = "linux")]
            linux::desktop::is_gnome_desktop,
            #[cfg(target_os = "linux")]
            linux::desktop::is_kde_desktop,
            #[cfg(target_os = "linux")]
            push::kunifiedpush::kunifiedpush_available,
            #[cfg(target_os = "linux")]
            push::kunifiedpush::kunifiedpush_register,
            #[cfg(target_os = "linux")]
            push::kunifiedpush::kunifiedpush_unregister,
            #[cfg(target_os = "macos")]
            macos::login_item::disable_macos_launch_at_login,
            #[cfg(target_os = "macos")]
            macos::login_item::enable_macos_launch_at_login,
            #[cfg(target_os = "macos")]
            macos::login_item::get_macos_launch_at_login_status,
            #[cfg(target_os = "macos")]
            macos::login_item::was_macos_launched_as_login_item,
            #[cfg(target_os = "macos")]
            macos::menu::apply_macos_menu_fixes,
            #[cfg(target_os = "macos")]
            macos::window_controls::set_macos_window_decoration_style,
            notifications::commands::send_notification_with_actions,
            notifications::commands::send_simple_notification,
            notifications::permission::check_notification_permission,
            notifications::permission::request_notification_permission,
            preferences::get_system_region_preferences,
            push::ntfy::start_ntfy_sse_listener,
            push::ntfy::stop_all_ntfy_sse_listeners,
            push::ntfy::stop_ntfy_sse_listener,
            push::maintenance::start_webdav_push_maintenance,
            push::maintenance::stop_webdav_push_maintenance,
            tray::commands::get_tray_enabled,
            tray::commands::initialize_tray,
            tray::commands::set_tray_visible,
            tray::commands::update_tray_sync_enabled,
            tray::commands::update_tray_sync_time,
            utils::fs::read_file_bytes,
            utils::markdown::parse_and_sanitize_markdown,
            utils::mobileconfig::decode_mobile_config,
            utils::plist::convert_plist_to_xml,
            #[cfg(target_os = "macos")]
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
