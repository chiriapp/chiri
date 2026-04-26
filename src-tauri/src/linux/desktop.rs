#[cfg(target_os = "linux")]
use log::debug;
#[cfg(target_os = "linux")]
use tauri::Theme;

/// Returns true when running inside a GNOME session.
/// Checks XDG_CURRENT_DESKTOP first, then XDG_SESSION_DESKTOP.
#[cfg(target_os = "linux")]
fn is_gnome() -> bool {
    std::env::var("XDG_CURRENT_DESKTOP")
        .or_else(|_| std::env::var("XDG_SESSION_DESKTOP"))
        .map(|desktop| desktop.to_lowercase().contains("gnome"))
        .unwrap_or(false)
}

/// Returns true when running on Linux/GNOME.
#[tauri::command]
pub async fn is_gnome_desktop() -> Result<bool, String> {
    #[cfg(target_os = "linux")]
    return Ok(is_gnome());
    #[cfg(not(target_os = "linux"))]
    Ok(false)
}

/// Returns the appropriate tray icon theme for the current Linux desktop.
/// GNOME's top bar is always dark; other DEs query the XDG portal or gsettings.
#[cfg(target_os = "linux")]
pub fn get_tray_theme() -> Theme {
    if is_gnome() {
        debug!("[Linux] GNOME detected — top bar is always dark, using light icon");
        return Theme::Dark;
    }
    if let Some(theme) = query_portal_color_scheme() {
        return theme;
    }
    query_gsettings_color_scheme()
}

/// Queries color-scheme from the XDG Settings portal via gdbus.
/// Returns None if the portal is unavailable or returns no preference.
#[cfg(target_os = "linux")]
fn query_portal_color_scheme() -> Option<Theme> {
    let output = std::process::Command::new("gdbus")
        .args([
            "call",
            "--session",
            "--dest",
            "org.freedesktop.portal.Desktop",
            "--object-path",
            "/org/freedesktop/portal/desktop",
            "--method",
            "org.freedesktop.portal.Settings.Read",
            "org.freedesktop.appearance",
            "color-scheme",
        ])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !output.status.success() {
        debug!("[Linux] XDG portal unavailable, falling back to gsettings");
        return None;
    }

    // gdbus output format: (<uint32 N>,)  where N = 0/1/2
    if stdout.contains("uint32 1") {
        debug!("[Linux] Portal: dark theme");
        Some(Theme::Dark)
    } else if stdout.contains("uint32 2") {
        debug!("[Linux] Portal: light theme");
        Some(Theme::Light)
    } else {
        debug!("[Linux] Portal: no preference, trying gsettings");
        None
    }
}

/// Falls back to gsettings for environments where the XDG portal isn't available.
#[cfg(target_os = "linux")]
fn query_gsettings_color_scheme() -> Theme {
    match std::process::Command::new("gsettings")
        .args(["get", "org.gnome.desktop.interface", "color-scheme"])
        .output()
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            debug!("[Linux] gsettings color-scheme: {:?}", stdout);
            if stdout.contains("prefer-dark") {
                Theme::Dark
            } else {
                Theme::Light
            }
        }
        Err(e) => {
            debug!("[Linux] gsettings failed: {}, defaulting to dark icon", e);
            Theme::Dark
        }
    }
}
