#[cfg(not(target_os = "linux"))]
use log::error;
use tauri::State;

#[cfg(not(target_os = "linux"))]
use tauri::tray::TrayIconId;

use super::{menu, AppRuntime, TrayState};

/// probe the session bus for a StatusNotifierItem host and cache the result so
/// the window close handler can decide whether to hide or quit even when the
/// tray toggle is enabled
#[cfg(target_os = "linux")]
async fn refresh_tray_host_availability(state: &TrayState) {
    match crate::linux::desktop::is_tray_host_available().await {
        Ok(available) => {
            if let Err(e) = state.set_host_available(available) {
                log::warn!("[Tray] Failed to cache host availability: {e}");
            }
        }
        Err(e) => log::warn!("[Tray] Failed to detect tray host availability: {e}"),
    }
}

/// initialize the system tray (called from frontend after reading settings)
#[tauri::command]
pub async fn initialize_tray(
    app_handle: tauri::AppHandle<AppRuntime>,
    state: State<'_, TrayState>,
    enabled: bool,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    refresh_tray_host_availability(&state).await;

    #[cfg(target_os = "linux")]
    {
        menu::initialize(app_handle, &state, enabled).await
    }

    #[cfg(not(target_os = "linux"))]
    {
        menu::initialize(app_handle, &state, enabled)
    }
}

/// get the current tray enabled state (for frontend to read on startup)
#[tauri::command]
pub async fn get_tray_enabled(state: State<'_, TrayState>) -> Result<bool, String> {
    state.is_enabled()
}

/// get the cached tray host availability (for startup window visibility checks)
#[tauri::command]
pub fn get_tray_host_available(state: State<'_, TrayState>) -> Result<bool, String> {
    state.is_host_available()
}

#[tauri::command]
pub async fn update_tray_sync_time(
    _app_handle: tauri::AppHandle<AppRuntime>,
    state: State<'_, TrayState>,
    time_str: String,
) -> Result<(), String> {
    state.update_sync_time(time_str)
}

/// point the tray sync entry at account setup while no account can sync
#[tauri::command]
pub async fn update_tray_accounts(
    _app_handle: tauri::AppHandle<AppRuntime>,
    state: State<'_, TrayState>,
    has_caldav_account: bool,
) -> Result<(), String> {
    state.update_accounts(has_caldav_account)
}

/// set the system tray visibility
#[tauri::command]
pub async fn set_tray_visible(
    app_handle: tauri::AppHandle<AppRuntime>,
    state: State<'_, TrayState>,
    visible: bool,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    refresh_tray_host_availability(&state).await;

    #[cfg(target_os = "linux")]
    {
        if let Some(handle) = state.linux_tray_handle()? {
            let _ = handle.update(|tray| tray.visible = visible).await;
            state.set_enabled(visible)?;
        } else if visible {
            menu::initialize(app_handle, &state, true).await?;
        } else {
            state.set_enabled(false)?;
        }

        Ok(())
    }

    #[cfg(not(target_os = "linux"))]
    {
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
}
