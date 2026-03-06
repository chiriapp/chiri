// Window event handling logic
//
// This module contains window event handlers that need to be separate from main.rs
// to keep the main file clean and focused on application setup.

use tauri::{Manager, WindowEvent};

/// Hide the dock icon on macOS when the window is hidden
#[cfg(target_os = "macos")]
fn hide_dock_icon<R: tauri::Runtime>(window: &tauri::Window<R>) {
    let _ = window
        .app_handle()
        .set_activation_policy(tauri::ActivationPolicy::Accessory);
}

#[cfg(not(target_os = "macos"))]
fn hide_dock_icon<R: tauri::Runtime>(_window: &tauri::Window<R>) {
    // No-op on non-macOS platforms
}

/// Handle window focus event
///
/// Workaround for KDE/Wayland environments on Linux:
/// On KDE with Wayland, after hiding and showing the window,
/// the title-bar buttons (close, minimize, maximize) may stop working.
/// Toggling the resizable property appears to resolve this issue.
///
/// References:
/// - https://github.com/tauri-apps/tao/issues/1046
/// - https://github.com/safing/portmaster/issues/1909
/// - https://github.com/nymtech/nym-vpn-client/issues/2768
#[cfg(target_os = "linux")]
pub fn handle_focus_event<R: tauri::Runtime>(window: &tauri::Window<R>) {
    let _ = window.set_resizable(false);
    let _ = window.set_resizable(true);
}

#[cfg(not(target_os = "linux"))]
pub fn handle_focus_event<R: tauri::Runtime>(_window: &tauri::Window<R>) {
    // No-op on non-Linux platforms
}

/// Main window event dispatcher
///
/// This function routes window events to their appropriate handlers.
pub fn handle_window_event<R: tauri::Runtime>(window: &tauri::Window<R>, event: &WindowEvent) {
    match event {
        WindowEvent::CloseRequested { api, .. } => {
            // Handle close request with tray integration
            // When the close button is clicked:
            // - If tray is enabled: hide the window instead of closing
            // - If tray is disabled: allow normal close behavior
            if crate::tray::is_tray_enabled() {
                api.prevent_close();

                // CEF: spawn hide operation asynchronously to avoid blocking the message loop
                #[cfg(feature = "cef")]
                {
                    let window = window.clone();
                    std::thread::spawn(move || {
                        let _ = window.hide();
                        hide_dock_icon(&window);
                    });
                }

                // Wry: can do synchronously
                #[cfg(not(feature = "cef"))]
                {
                    let _ = window.hide();
                    hide_dock_icon(window);
                }
            }
        }
        WindowEvent::Focused(true) => {
            handle_focus_event(window);
        }
        _ => {}
    }
}
