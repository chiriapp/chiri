use log::error;
use tauri::{tray::TrayIconId, State};

use super::{menu, AppRuntime, TrayState};

/// initialize the system tray (called from frontend after reading settings)
#[tauri::command]
pub async fn initialize_tray(
    app_handle: tauri::AppHandle<AppRuntime>,
    state: State<'_, TrayState>,
    enabled: bool,
) -> Result<(), String> {
    menu::initialize(app_handle, &state, enabled)
}

/// get the current tray enabled state (for frontend to read on startup)
#[tauri::command]
pub async fn get_tray_enabled(state: State<'_, TrayState>) -> Result<bool, String> {
    state.is_enabled()
}

#[tauri::command]
pub async fn update_tray_sync_time(
    _app_handle: tauri::AppHandle<AppRuntime>,
    state: State<'_, TrayState>,
    time_str: String,
) -> Result<(), String> {
    state.update_sync_time(time_str)
}

/// enable/disable the tray sync button based on account availability
#[tauri::command]
pub async fn update_tray_sync_enabled(
    _app_handle: tauri::AppHandle<AppRuntime>,
    state: State<'_, TrayState>,
    enabled: bool,
) -> Result<(), String> {
    state.update_sync_enabled(enabled)
}

/// set the system tray visibility
#[tauri::command]
pub async fn set_tray_visible(
    app_handle: tauri::AppHandle<AppRuntime>,
    state: State<'_, TrayState>,
    visible: bool,
) -> Result<(), String> {
    let tray_id = TrayIconId::new("main");
    if let Some(tray) = app_handle.tray_by_id(&tray_id) {
        tray.set_visible(visible).map_err(|e| {
            error!("[Tray] Failed to set visibility: {}", e);
            e.to_string()
        })?;
        state.set_enabled(visible)?;
    } else if visible {
        menu::initialize(app_handle, &state, true)?;
    } else {
        state.set_enabled(false)?;
    }
    Ok(())
}
