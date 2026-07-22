use tauri::Manager;
#[cfg(any(windows, target_os = "linux"))]
use tauri_plugin_deep_link::DeepLinkExt;

use super::AppRuntime;
use crate::{legacy, notifications, window};

pub(super) fn configure_process_environment() {
    // on Linux, WebKitGTK 2.42+ allocates DMA-BUF buffers via GBM, which is broken
    // on NVIDIA proprietary drivers under Wayland and causes an immediate crash ("Error 71: Protocol error")
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

pub(super) fn focus_main_window(app: &tauri::AppHandle<AppRuntime>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.unminimize();

        #[cfg(target_os = "macos")]
        crate::window::show_dock_icon(app);
    }
}

pub(super) fn setup_app(
    app: &mut tauri::App<AppRuntime>,
) -> Result<(), Box<dyn std::error::Error>> {
    app.manage(window::state::WindowStateManager::load(app.handle()));

    if let Some(window) = app.get_webview_window("main") {
        window::restore_state(&window);
    }

    // macOS uses Info.plist. Windows needs explicit runtime registration. on
    // Linux, packaged installs advertise the scheme through installed .desktop
    // files; only AppImage needs runtime registration as a desktop-integration
    // fallback
    #[cfg(windows)]
    if let Err(e) = app.deep_link().register_all() {
        log::warn!("[Setup] Failed to register deep link scheme: {e}");
    }

    #[cfg(target_os = "linux")]
    if app.env().appimage.is_some() {
        if let Err(e) = app.deep_link().register_all() {
            log::warn!("[Setup] Failed to register AppImage deep link scheme: {e}");
        }

        // AppImage launched from the terminal has no installed icon in the
        // user's icon theme, so the window/dock/alt+tab icon falls back to the
        // default Wayland icon. install the bundled icon and a hidden desktop
        // file as a best-effort fix before the window is shown.
        crate::linux::appimage::install_desktop_file_for_appimage_on_startup(app.handle());
    }

    // disable App Nap after logging has been initialized so App Nap
    // messages follow the same format as the rest of the app logs
    #[cfg(target_os = "macos")]
    {
        crate::macos::login_item::capture_launch_context();
        crate::macos::app_nap::disable_app_nap();
        crate::macos::dock_menu::initialize(app.handle());
        crate::macos::window_controls::scale_traffic_lights(app.handle());
    }

    legacy::migrate_name(app);
    legacy::migrate_identifier(app);

    #[cfg(target_os = "linux")]
    if let Some(window) = app.get_webview_window("main") {
        crate::linux::decorations::configure_titlebar_for_de(&window);
    }

    #[cfg(target_os = "linux")]
    {
        let state = app.state::<crate::push::kunifiedpush::UnifiedPushState>();
        if let Err(error) = state.ensure_connector(app.handle()) {
            log::warn!(
                "[UnifiedPush] Failed to register connector during setup: {}",
                error
            );
        }
    }

    notifications::initialize(app);

    #[cfg(target_os = "linux")]
    {
        // probe for an SNI host early so the window close handler knows whether
        // hiding the window is safe before the frontend initializes the tray
        let app_handle = app.handle().clone();
        tauri::async_runtime::spawn(async move {
            match crate::linux::desktop::is_tray_host_available().await {
                Ok(available) => {
                    if let Err(e) = app_handle
                        .state::<crate::tray::TrayState>()
                        .set_host_available(available)
                    {
                        log::warn!("[Tray] Failed to cache initial host availability: {e}");
                    } else {
                        log::info!("[Tray] SNI host available: {available}");
                    }
                }
                Err(e) => log::warn!("[Tray] Failed to detect SNI host availability: {e}"),
            }
        });
    }

    // tray will be initialized from frontend after reading settings
    Ok(())
}
