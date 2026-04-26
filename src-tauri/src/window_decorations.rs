// Desktop environment detection and GTK titlebar management for Linux.

#[cfg(target_os = "linux")]
use std::env;

/// Detects if the current desktop environment needs GTK client-side decorations
/// Returns true for GNOME, COSMIC, and other DEs that work better with GTK decorations
#[cfg(target_os = "linux")]
pub fn needs_gtk_decorations() -> bool {
    let desktop = env::var("XDG_CURRENT_DESKTOP")
        .ok()
        .map(|d| d.to_lowercase())
        .unwrap_or_default();

    let session = env::var("DESKTOP_SESSION")
        .ok()
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    // GNOME and GNOME-based DEs
    if desktop.contains("gnome")
        || desktop.contains("ubuntu") // Ubuntu uses GNOME by default
        || session.contains("gnome")
        || env::var("GNOME_DESKTOP_SESSION_ID").is_ok()
    {
        return true;
    }

    // COSMIC DE - has issues with window dragging without GTK decorations
    if desktop.contains("cosmic") || session.contains("cosmic") {
        return true;
    }

    false
}

/// Returns true for tiling/scrolling WMs that don't need any window decorations
#[cfg(target_os = "linux")]
pub fn is_tiling_wm() -> bool {
    let tiling_wms = [
        "hyprland", "sway", "i3", "niri", "bspwm", "dwm",
        "awesome", "qtile", "xmonad", "herbstluftwm", "river", "leftwm",
    ];

    if let Ok(desktop) = env::var("XDG_CURRENT_DESKTOP") {
        let desktop_lower = desktop.to_lowercase();
        if tiling_wms.iter().any(|wm| desktop_lower.contains(wm)) {
            return true;
        }
    }

    if let Ok(session) = env::var("XDG_SESSION_DESKTOP") {
        let session_lower = session.to_lowercase();
        if tiling_wms.iter().any(|wm| session_lower.contains(wm)) {
            return true;
        }
    }

    // WM-specific socket/instance env vars
    env::var("HYPRLAND_INSTANCE_SIGNATURE").is_ok()
        || env::var("SWAYSOCK").is_ok()
        || env::var("I3SOCK").is_ok()
        || env::var("NIRI_SOCKET").is_ok()
}

/// configures the titlebar based on the desktop environment
/// must be called BEFORE the window is shown/realized
///
/// - GNOME, COSMIC: keep GTK client-side decorations (works well, draggable)
/// - KDE, others: use native window decorations (integrates better)
///
/// note: the Wayland xdg_toplevel app_id is derived from the binary name,
/// so the Flatpak installs the binary as moe.sapphic.Chiri to match the .desktop filename for KWin icon lookup
#[cfg(target_os = "linux")]
pub fn configure_titlebar_for_de(window: &tauri::WebviewWindow) {
    use gtk::prelude::GtkWindowExt;

    let desktop = env::var("XDG_CURRENT_DESKTOP").unwrap_or_else(|_| "Unknown".to_string());

    if let Ok(gtk_window) = window.gtk_window() {
        if is_tiling_wm() {
            log::info!(
                "Desktop '{}' detected - disabling all window decorations (tiling WM)",
                desktop
            );
            gtk_window.set_decorated(false);
            return;
        }

        if needs_gtk_decorations() {
            log::info!(
                "Desktop '{}' detected - keeping GTK client-side decorations",
                desktop
            );
            return;
        }

        log::info!(
            "Desktop '{}' detected - using native window decorations",
            desktop
        );

        // remove the GTK titlebar to use native DE decorations
        gtk_window.set_titlebar(Option::<&gtk::Widget>::None);
    }
}

/// Toggle window decorations at runtime via Tauri's WebviewWindow API.
///
/// The initial per-DE decision happens in `configure_titlebar_for_de` during
/// setup; this command lets the user override that choice from settings
/// without restarting the app.
#[tauri::command]
pub async fn set_window_decorations(
    window: tauri::WebviewWindow,
    enabled: bool,
) -> Result<(), String> {
    window.set_decorations(enabled).map_err(|e| e.to_string())
}
