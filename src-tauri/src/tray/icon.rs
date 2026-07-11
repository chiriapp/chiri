use log::error;
#[cfg(not(target_os = "linux"))]
use tauri::Manager;
use tauri::{image::Image, Theme};

use super::AppRuntime;

fn current_theme(app_handle: &tauri::AppHandle<AppRuntime>) -> Theme {
    #[cfg(target_os = "linux")]
    {
        let _ = app_handle;
        crate::linux::desktop::get_tray_theme()
    }

    #[cfg(not(target_os = "linux"))]
    {
        if let Some(main_window) = app_handle.get_webview_window("main") {
            main_window.theme().unwrap_or(Theme::Dark)
        } else {
            Theme::Dark
        }
    }
}

pub(in crate::tray) fn load(
    app_handle: &tauri::AppHandle<AppRuntime>,
) -> Result<(Image<'static>, Theme, &'static str), String> {
    let theme = current_theme(app_handle);
    let (label, bytes) = icon_bytes(theme);
    let image = load_image(bytes, label)?;
    Ok((image, theme, label))
}

fn icon_bytes(theme: Theme) -> (&'static str, &'static [u8]) {
    match theme {
        Theme::Light => ("dark", include_bytes!("../../icons/monochrome_dark.png")),
        Theme::Dark => ("light", include_bytes!("../../icons/monochrome_light.png")),
        _ => ("light", include_bytes!("../../icons/monochrome_light.png")),
    }
}

fn load_image(bytes: &[u8], label: &str) -> Result<Image<'static>, String> {
    Image::from_bytes(bytes).map_err(|e| {
        error!("[Tray] Failed to load {label} icon: {e}");
        format!("Failed to load tray icon: {e}")
    })
}
