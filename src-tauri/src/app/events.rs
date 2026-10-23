use super::AppRuntime;
use std::time::Duration;
use tauri::Emitter;

#[cfg(target_os = "macos")]
use tauri::{Manager, RunEvent};

/// asks the frontend to flush transient writes before exiting, with a fallback
/// so a failed or unresponsive webview can never prevent the app from quitting
pub(crate) fn request_frontend_quit(app_handle: &tauri::AppHandle<tauri::Wry>) {
    let _ = app_handle.emit("app:flush-and-quit-requested", ());
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_secs(2)).await;
        std::process::exit(0);
    });
}

#[cfg(target_os = "macos")]
pub(super) fn handle_run_event(app_handle: &tauri::AppHandle<AppRuntime>, event: RunEvent) {
    match event {
        // intercept all quit requests (Cmd+Q, Dock quit, window close) so the
        // frontend can flush preferences and apply double-press confirmation
        RunEvent::ExitRequested { api, .. } => {
            api.prevent_exit();
            let _ = app_handle.emit("app:quit-requested", ());
        }

        RunEvent::Exit => {}

        // handle app reactivation (e.g., from Spotlight, Dock, Cmd+Tab)
        RunEvent::Reopen { .. } => {
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                crate::window::show_dock_icon(app_handle);
            }
        }

        _ => {}
    }
}

#[cfg(not(target_os = "macos"))]
pub(super) fn handle_run_event(_app_handle: &tauri::AppHandle<AppRuntime>, event: tauri::RunEvent) {
    if let tauri::RunEvent::Exit = event {}
}
