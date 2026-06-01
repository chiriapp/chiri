use log::{debug, error};
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
            let theme = main_window.theme().unwrap_or(Theme::Dark);
            debug!(
                "[Tray] Detected system theme via window.theme(): {:?}",
                theme
            );
            theme
        } else {
            debug!("[Tray] No main window found, defaulting to Dark theme");
            Theme::Dark
        }
    }
}

pub(in crate::tray) fn load(
    app_handle: &tauri::AppHandle<AppRuntime>,
) -> Result<Image<'static>, String> {
    let theme = current_theme(app_handle);

    match theme {
        Theme::Light => {
            debug!("[Tray] Loading dark icon for light theme");
            load_image(include_bytes!("../../icons/monochrome_dark.png"), "dark")
        }
        Theme::Dark => {
            debug!("[Tray] Loading light icon for dark theme");
            load_image(include_bytes!("../../icons/monochrome_light.png"), "light")
        }
        _ => {
            debug!("[Tray] Unknown theme, loading light icon as default");
            load_image(
                include_bytes!("../../icons/monochrome_light.png"),
                "default",
            )
        }
    }
}

fn load_image(bytes: &'static [u8], label: &str) -> Result<Image<'static>, String> {
    Image::from_bytes(bytes).map_err(|e| {
        error!("[Tray] Failed to load {label} icon: {e}");
        format!("Failed to load tray icon: {e}")
    })
}
