use log::error;
#[cfg(not(target_os = "linux"))]
use tauri::Manager;
use tauri::{image::Image, Runtime, Theme};

fn current_theme<R: Runtime>(app_handle: &tauri::AppHandle<R>) -> Theme {
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

pub(in crate::tray) fn load<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
) -> Result<(Image<'static>, Theme, &'static str), String> {
    let theme = current_theme(app_handle);

    #[cfg(windows)]
    let (label, bytes) = {
        let scale_factor = app_handle
            .get_webview_window("main")
            .and_then(|window| window.scale_factor().ok())
            .unwrap_or(1.0);
        windows_icon_bytes(theme, scale_factor)
    };

    #[cfg(not(windows))]
    let (label, bytes) = icon_bytes(theme);

    let image = load_image(bytes, label)?;
    Ok((image, theme, label))
}

#[cfg(windows)]
pub(in crate::tray) fn load_at_scale_factor<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
    scale_factor: f64,
) -> Result<(Image<'static>, Theme, &'static str), String> {
    let theme = current_theme(app_handle);
    let (label, bytes) = windows_icon_bytes(theme, scale_factor);
    let image = load_image(bytes, label)?;
    Ok((image, theme, label))
}

#[cfg(not(windows))]
fn icon_bytes(theme: Theme) -> (&'static str, &'static [u8]) {
    match theme {
        Theme::Light => ("dark", include_bytes!("../../icons/monochrome_dark.png")),
        Theme::Dark => ("light", include_bytes!("../../icons/monochrome_light.png")),
        _ => ("light", include_bytes!("../../icons/monochrome_light.png")),
    }
}

#[cfg(windows)]
fn windows_icon_bytes(theme: Theme, scale_factor: f64) -> (&'static str, &'static [u8]) {
    const ICON_SIZES: [u32; 4] = [16, 20, 24, 32];
    let scale_factor = if scale_factor.is_finite() && scale_factor > 0.0 {
        scale_factor
    } else {
        1.0
    };
    let target_size = 16.0 * scale_factor;
    if target_size > 32.0 {
        return match theme {
            Theme::Light => (
                "dark high-DPI",
                include_bytes!("../../icons/monochrome_dark.png"),
            ),
            _ => (
                "light high-DPI",
                include_bytes!("../../icons/monochrome_light.png"),
            ),
        };
    }

    let size = ICON_SIZES
        .into_iter()
        .find(|size| *size as f64 >= target_size)
        .unwrap_or(32);

    match (theme, size) {
        (Theme::Light, 16) => (
            "dark 16px",
            include_bytes!("../../icons/monochrome_dark_16.png"),
        ),
        (Theme::Light, 20) => (
            "dark 20px",
            include_bytes!("../../icons/monochrome_dark_20.png"),
        ),
        (Theme::Light, 24) => (
            "dark 24px",
            include_bytes!("../../icons/monochrome_dark_24.png"),
        ),
        (Theme::Light, _) => (
            "dark 32px",
            include_bytes!("../../icons/monochrome_dark_32.png"),
        ),
        (Theme::Dark, 16) => (
            "light 16px",
            include_bytes!("../../icons/monochrome_light_16.png"),
        ),
        (Theme::Dark, 20) => (
            "light 20px",
            include_bytes!("../../icons/monochrome_light_20.png"),
        ),
        (Theme::Dark, 24) => (
            "light 24px",
            include_bytes!("../../icons/monochrome_light_24.png"),
        ),
        (_, _) => (
            "light 32px",
            include_bytes!("../../icons/monochrome_light_32.png"),
        ),
    }
}

fn load_image(bytes: &[u8], label: &str) -> Result<Image<'static>, String> {
    Image::from_bytes(bytes).map_err(|e| {
        error!("[Tray] Failed to load {label} icon: {e}");
        format!("Failed to load tray icon: {e}")
    })
}
