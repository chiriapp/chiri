#[cfg(target_os = "linux")]
use log::debug;
#[cfg(target_os = "linux")]
use tauri::Theme;
#[cfg(target_os = "linux")]
use zbus::{fdo::DBusProxy, Connection};

/// returns true when running inside a GNOME session
/// checks XDG_CURRENT_DESKTOP first, then XDG_SESSION_DESKTOP
#[cfg(target_os = "linux")]
fn is_gnome() -> bool {
    linux_desktop_session_values()
        .iter()
        .any(|desktop| desktop.contains("gnome"))
}

/// returns true when running inside a KDE Plasma session
#[cfg(target_os = "linux")]
fn is_kde() -> bool {
    let kde_full_session = std::env::var("KDE_FULL_SESSION")
        .map(|value| {
            let value = value.to_lowercase();
            value == "1" || value == "true"
        })
        .unwrap_or(false);

    kde_full_session
        || linux_desktop_session_values()
            .iter()
            .any(|desktop| desktop.contains("kde") || desktop.contains("plasma"))
}

#[cfg(target_os = "linux")]
fn linux_desktop_session_values() -> Vec<String> {
    [
        "XDG_CURRENT_DESKTOP",
        "XDG_SESSION_DESKTOP",
        "DESKTOP_SESSION",
    ]
    .iter()
    .filter_map(|key| std::env::var(key).ok())
    .flat_map(|value| {
        value
            .split([':', ';'])
            .map(|part| part.trim().to_lowercase())
            .filter(|part| !part.is_empty())
            .collect::<Vec<_>>()
    })
    .collect()
}

/// returns true when running on Linux/GNOME
#[tauri::command]
pub async fn is_gnome_desktop() -> Result<bool, String> {
    Ok(is_gnome())
}

/// returns true when running on Linux/KDE Plasma
#[tauri::command]
pub async fn is_kde_desktop() -> Result<bool, String> {
    Ok(is_kde())
}

const SNI_WATCHER_BUS_NAME: &str = "org.kde.StatusNotifierWatcher";

/// returns true when a StatusNotifierItem/SNI host is present on the session bus
/// (e.g., GNOME's AppIndicator extension, KDE Plasma, etc.)
#[cfg(target_os = "linux")]
async fn tray_host_available() -> Result<bool, String> {
    let connection = Connection::session().await.map_err(|e| e.to_string())?;
    let proxy = DBusProxy::new(&connection)
        .await
        .map_err(|e| e.to_string())?;
    let watcher_name = zbus::names::BusName::try_from(SNI_WATCHER_BUS_NAME)
        .map_err(|e| format!("Invalid SNI watcher bus name: {e}"))?;

    proxy
        .name_has_owner(watcher_name)
        .await
        .map_err(|e| e.to_string())
}

/// returns true when a StatusNotifierItem/SNI host is present on the session bus
#[tauri::command]
#[cfg(target_os = "linux")]
pub async fn is_tray_host_available() -> Result<bool, String> {
    tray_host_available().await
}

/// returns the appropriate tray icon theme for the current Linux desktop
/// GNOME's top bar is always dark; other DEs query the XDG portal or gsettings
#[cfg(target_os = "linux")]
pub fn get_tray_theme() -> Theme {
    if is_gnome() {
        debug!("[Linux] GNOME detected; top bar is always dark, using light icon");
        return Theme::Dark;
    }
    if let Some(theme) = query_portal_color_scheme() {
        return theme;
    }
    query_gsettings_color_scheme()
}

/// queries color-scheme from the XDG Settings portal via gdbus
/// returns None if the portal is unavailable or returns no preference
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

/// falls back to gsettings for environments where the XDG portal isn't available
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
