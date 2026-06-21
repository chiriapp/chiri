use super::AppRuntime;

#[cfg(target_os = "macos")]
use tauri::{Emitter, Manager, RunEvent};

#[cfg(target_os = "macos")]
pub(super) fn handle_run_event(app_handle: &tauri::AppHandle<AppRuntime>, event: RunEvent) {
    match event {
        // intercept all quit requests (Cmd+Q, Dock quit, window close) so the
        // frontend can apply double-press confirmation when enabled. The frontend
        // calls exit(0) via tauri-plugin-process, which bypasses this handler
        RunEvent::ExitRequested { api, .. } => {
            api.prevent_exit();
            let _ = app_handle.emit("app:quit-requested", ());
        }

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
pub(super) fn handle_run_event(
    _app_handle: &tauri::AppHandle<AppRuntime>,
    _event: tauri::RunEvent,
) {
}
