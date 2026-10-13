pub mod commands;
mod icon;
mod menu;
mod state;

#[cfg(target_os = "linux")]
mod linux;

pub use state::TrayState;

type AppRuntime = tauri::Wry;

#[cfg(windows)]
pub(crate) fn update_windows_tray_icon<R: tauri::Runtime>(
    app_handle: &tauri::AppHandle<R>,
    scale_factor: f64,
) -> Result<(), String> {
    use tauri::tray::TrayIconId;

    let tray_id = TrayIconId::new("main");
    let Some(tray) = app_handle.tray_by_id(&tray_id) else {
        return Ok(());
    };

    let (tray_icon, theme, icon_label) = icon::load_at_scale_factor(app_handle, scale_factor)?;
    log::debug!(
        "[Tray] Updating Windows tray icon (theme: {:?}, icon: {})",
        theme,
        icon_label
    );
    tray.set_icon(Some(tray_icon))
        .map_err(|e| format!("Failed to update Windows tray icon: {e}"))
}
