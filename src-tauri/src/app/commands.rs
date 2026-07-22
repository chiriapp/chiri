use tauri::Manager;

use crate::window::state::WindowStateManager;

/// exits the process directly via the OS, bypassing Tauri's RunEvent::ExitRequested
/// must be used instead of tauri-plugin-process's exit(), which calls AppHandle::exit()
/// and re-triggers ExitRequested, causing an infinite prevent/exit loop
#[tauri::command]
pub fn force_quit(app: tauri::AppHandle) {
    app.state::<WindowStateManager>().save(&app);
    std::process::exit(0);
}

pub const AUTOSTART_LAUNCH_ARG: &str = "--chiri-autostart";

#[tauri::command]
pub fn was_launched_from_autostart() -> bool {
    std::env::args_os().any(|arg| arg == std::ffi::OsStr::new(AUTOSTART_LAUNCH_ARG))
}
