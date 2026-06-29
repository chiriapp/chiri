use tauri::Manager;
#[cfg(any(windows, target_os = "linux"))]
use tauri_plugin_deep_link::DeepLinkExt;

use super::AppRuntime;
use crate::{legacy, notifications};

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
    // register deep link URL scheme handler (macOS uses Info.plist; Windows/Linux
    // need explicit runtime registration so the OS knows which binary to call)
    #[cfg(any(windows, target_os = "linux"))]
    if let Err(e) = app.deep_link().register_all() {
        log::warn!("[Setup] Failed to register deep link scheme: {e}");
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

    legacy::migrate_identifier(app);
    legacy::migrate_name(app);

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

    // tray will be initialized from frontend after reading settings
    Ok(())
}
