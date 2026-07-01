#[cfg(target_os = "macos")]
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Manager, WindowEvent};

#[cfg(target_os = "macos")]
static HIDE_DOCK_ICON_WHEN_WINDOW_CLOSED: AtomicBool = AtomicBool::new(true);

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn set_hide_dock_icon_when_window_closed(enabled: bool) {
    HIDE_DOCK_ICON_WHEN_WINDOW_CLOSED.store(enabled, Ordering::Relaxed);
}

/// show the dock icon on macOS when the window is shown
#[cfg(target_os = "macos")]
pub fn show_dock_icon<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>) {
    let _ = app_handle.set_activation_policy(tauri::ActivationPolicy::Regular);
}

/// hide the dock icon on macOS when the window is hidden
#[cfg(target_os = "macos")]
fn hide_dock_icon<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>) {
    let _ = app_handle.set_activation_policy(tauri::ActivationPolicy::Accessory);
}

#[cfg(not(target_os = "macos"))]
fn hide_dock_icon<R: tauri::Runtime>(_app_handle: &tauri::AppHandle<R>) {}

fn hide_dock_icon_if_configured<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>) {
    #[cfg(target_os = "macos")]
    if !HIDE_DOCK_ICON_WHEN_WINDOW_CLOSED.load(Ordering::Relaxed) {
        return;
    }

    hide_dock_icon(app_handle);
}

fn is_tray_enabled<R: tauri::Runtime>(window: &tauri::Window<R>) -> bool {
    match window
        .app_handle()
        .state::<crate::tray::TrayState>()
        .is_enabled()
    {
        Ok(enabled) => enabled,
        Err(e) => {
            log::warn!("[Window] Failed to read tray state: {e}");
            false
        }
    }
}

/// handle window focus event
///
/// workaround for KDE/Wayland environments on Linux:
/// on KDE with Wayland, after hiding and showing the window,
/// the title-bar buttons (close, minimize, maximize) may stop working
/// toggling the resizable property appears to resolve this issue
///
/// references:
/// - https://github.com/tauri-apps/tao/issues/1046
/// - https://github.com/safing/portmaster/issues/1909
/// - https://github.com/nymtech/nym-vpn-client/issues/2768
#[cfg(target_os = "linux")]
pub fn handle_focus_event<R: tauri::Runtime>(window: &tauri::Window<R>) {
    let _ = window.set_resizable(false);
    let _ = window.set_resizable(true);
}

#[cfg(not(target_os = "linux"))]
pub fn handle_focus_event<R: tauri::Runtime>(_window: &tauri::Window<R>) {}

pub fn handle_window_event<R: tauri::Runtime>(window: &tauri::Window<R>, event: &WindowEvent) {
    match event {
        WindowEvent::CloseRequested { api, .. } if is_tray_enabled(window) => {
            // handle close request with tray integration
            // when the close button is clicked:
            // - If tray is enabled: hide the window instead of closing
            // - If tray is disabled: allow normal close behavior
            api.prevent_close();

            let _ = window.hide();
            hide_dock_icon_if_configured(window.app_handle());
        }
        WindowEvent::CloseRequested { .. } => {}
        #[cfg(target_os = "macos")]
        WindowEvent::Resized(_) | WindowEvent::ScaleFactorChanged { .. } => {
            if let Some(webview_window) = window.app_handle().get_webview_window(window.label()) {
                crate::macos::window_controls::apply_traffic_light_scale(&webview_window);
            }
        }
        WindowEvent::Focused(true) => {
            handle_focus_event(window);
        }
        _ => {}
    }
}
