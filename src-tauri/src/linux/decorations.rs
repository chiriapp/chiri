// Desktop environment detection and GTK titlebar management for Linux.

#[cfg(target_os = "linux")]
use std::env;

/// Detects if the current desktop environment needs GTK client-side decorations
/// Returns true for GNOME, COSMIC, and other DEs that work better with GTK decorations
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

/// Returns true for tiling/scrolling WMs that don't need any window decorations
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

/// returns the path to the decoration hint file.
///
/// bridges the js settings store (localStorage) and Rust startup
/// js writes the user's decoration preference here when it changes, and
/// `configure_titlebar_for_de` reads it before the window is realized so the
/// correct decoration mode is negotiated with the Wayland compositor at
/// surface-creation time (the only moment it reliably works on KDE... i think)
#[cfg(target_os = "linux")]
fn decoration_hint_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join("window_decorations_hint"))
}

/// reads the saved decoration hint: "on", "off", or "auto" (default)
#[cfg(target_os = "linux")]
fn read_decoration_hint(app: &tauri::AppHandle) -> String {
    decoration_hint_path(app)
        .and_then(|p| std::fs::read_to_string(p).ok())
        .map(|s| s.trim().to_lowercase())
        .filter(|s| matches!(s.as_str(), "on" | "off" | "auto"))
        .unwrap_or_else(|| "auto".to_string())
}

/// configures the titlebar based on the desktop environment AND the saved
/// decoration hint, which is written by the frontend whenever the user changes
/// the setting.
///
/// must be called BEFORE the window is shown/realized. that is the only moment
/// at which GTK's Wayland backend negotiates the `zxdg_decoration_manager_v1`
/// mode with the compositor.  runtime calls to `set_decorated` do not reliably
/// trigger a Wayland protocol update on KDE apparently

/// note: the Wayland xdg_toplevel app_id is derived from the binary name,
/// so the Flatpak installs the binary as garden.chiri.Chiri to match the .desktop filename for KWin icon lookup
#[cfg(target_os = "linux")]
pub fn configure_titlebar_for_de(window: &tauri::WebviewWindow, app: &tauri::AppHandle) {
    use gtk::prelude::GtkWindowExt;

    let desktop = env::var("XDG_CURRENT_DESKTOP").unwrap_or_else(|_| "Unknown".to_string());
    let hint = read_decoration_hint(app);

    log::info!("[Decorations] Desktop='{}', hint='{}'", desktop, hint);

    if let Ok(gtk_window) = window.gtk_window() {
        // explicit "always hide". strip all decorations regardless of DE
        if hint == "off" {
            log::info!("[Decorations] hint=off — disabling all decorations");
            gtk_window.set_titlebar(Option::<&gtk::Widget>::None);
            gtk_window.set_decorated(false);
            return;
        }

        // hint=on or hint=auto. apply the normal per-DE logic

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
        // server-side decorations from the compositor (KWin *should* add its own
        // native titlebar at this point)
        gtk_window.set_titlebar(Option::<&gtk::Widget>::None);
    }
}

#[tauri::command]
pub async fn save_window_decorations_hint(
    app: tauri::AppHandle,
    mode: String,
) -> Result<(), String> {
    if !matches!(mode.as_str(), "on" | "off" | "auto") {
        return Err(format!("Invalid decoration mode: {mode}"));
    }
    let path = decoration_hint_path(&app).ok_or("Could not determine app config dir")?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, &mode).map_err(|e| e.to_string())?;
    log::info!("[Decorations] Saved decoration hint: {mode}");
    Ok(())
}

/// Toggle window decorations at runtime via Tauri's WebviewWindow API.
///
/// on GTK-native DEs (GNOME, COSMIC), this works immediately because GTK's
/// CSD state is toggled directly
///
/// on compositor-managed DEs (KDE, etc.), GTK3's `set_decorated()` does NOT
/// send Wayland `zxdg_decoration_manager_v1` protocol messages at runtime.
/// the change therefore has no visible effect until the app is restarted
/// which is why the frontend shows a "restart required" notice on KDE and
/// why `save_window_decorations_hint` is the true persistence mechanism
///
/// this command is still called on KDE as a best-effort attempt and to keep
/// the applied-value state consistent
#[tauri::command]
pub async fn set_window_decorations(
    window: tauri::WebviewWindow,
    enabled: bool,
) -> Result<(), String> {
    let uses_gtk_csd = needs_gtk_decorations();
    let window_for_gtk = window.clone();

    if uses_gtk_csd {
        // GNOME / COSMIC: toggle GTK client-side decorations directly.
        window
            .run_on_main_thread(move || {
                use gtk::prelude::GtkWindowExt;

                if let Ok(gtk_window) = window_for_gtk.gtk_window() {
                    if !enabled {
                        gtk_window.set_titlebar(Option::<&gtk::Widget>::None);
                    }
                    gtk_window.set_decorated(enabled);
                }
            })
            .map_err(|e| e.to_string())?;
    }

    // best-effort Tauri-level call (maps to gtk_window_set_decorated on Linux)
    // works on GNOME; has no reliable effect on KDE Wayland at runtime
    window.set_decorations(enabled).map_err(|e| e.to_string())
}
