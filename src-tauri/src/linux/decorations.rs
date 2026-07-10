// desktop environment detection and GTK titlebar management for Linux

#[cfg(target_os = "linux")]
use std::env;

/// detects if the current desktop environment needs GTK client-side decorations
/// returns true for GNOME, COSMIC, and other DEs that work better with GTK decorations
#[cfg(target_os = "linux")]
fn needs_gtk_decorations() -> bool {
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

/// returns true for tiling/scrolling WMs that don't need any window decorations
#[cfg(target_os = "linux")]
fn is_tiling_wm() -> bool {
    let tiling_wms = [
        "hyprland",
        "sway",
        "i3",
        "niri",
        "bspwm",
        "dwm",
        "awesome",
        "qtile",
        "xmonad",
        "herbstluftwm",
        "river",
        "leftwm",
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
///
/// must be called BEFORE the window is shown/realized. that is the only moment
/// at which GTK's Wayland backend negotiates the `zxdg_decoration_manager_v1`
/// mode with the compositor. runtime calls to `set_decorated` do not reliably
/// trigger a Wayland protocol update on KDE
///
/// note: the wayland xdg_toplevel app_id is set explicitly via `enableGTKAppId`
/// (garden.chiri.Chiri) to match the .desktop filename for KWin icon lookup.
/// the binary itself can keep the friendly `Chiri` name; the gtk application id
/// is what matters for the window's identity.
#[cfg(target_os = "linux")]
pub fn configure_titlebar_for_de(window: &tauri::WebviewWindow) {
    use gtk::prelude::GtkWindowExt;

    let desktop = env::var("XDG_CURRENT_DESKTOP").unwrap_or_else(|_| "Unknown".to_string());

    log::info!("[Decorations] Desktop='{}'", desktop);

    if let Ok(gtk_window) = window.gtk_window() {
        if is_tiling_wm() {
            log::info!(
                "[Decorations] Desktop '{}' detected - disabling all window decorations (tiling WM)",
                desktop
            );
            gtk_window.set_decorated(false);
            return;
        }

        if needs_gtk_decorations() {
            log::info!(
                "[Decorations] Desktop '{}' detected - keeping GTK client-side decorations",
                desktop
            );
            return;
        }

        log::info!(
            "[Decorations] Desktop '{}' detected - using native window decorations",
            desktop
        );

        // remove the GTK titlebar widget so GTK falls back to requesting
        // server-side decorations from the compositor (KWin adds its own
        // native titlebar at this point)
        gtk_window.set_titlebar(Option::<&gtk::Widget>::None);
    }
}
