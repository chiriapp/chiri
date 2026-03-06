// Desktop environment detection and GTK titlebar management for Linux
#![cfg(target_os = "linux")]

use std::env;

/// Detects if the current desktop environment needs GTK client-side decorations
/// Returns true for GNOME, COSMIC, and other DEs that work better with GTK decorations
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

/// Configures the titlebar based on the desktop environment
/// This must be called BEFORE the window is shown/realized
///
/// - GNOME, COSMIC: Keep GTK client-side decorations (works well, draggable)
/// - KDE, others: Use native window decorations (integrates better)
pub fn configure_titlebar_for_de(window: &tauri::WebviewWindow) {
    use gtk::prelude::GtkWindowExt;

    if needs_gtk_decorations() {
        let desktop = env::var("XDG_CURRENT_DESKTOP").unwrap_or_else(|_| "Unknown".to_string());
        log::info!(
            "Desktop '{}' detected - keeping GTK client-side decorations",
            desktop
        );
        // Keep the default GTK titlebar
        return;
    }

    let desktop = env::var("XDG_CURRENT_DESKTOP").unwrap_or_else(|_| "Unknown".to_string());
    log::info!(
        "Desktop '{}' detected - using native window decorations",
        desktop
    );

    // Remove the GTK titlebar to use native DE decorations
    if let Ok(gtk_window) = window.gtk_window() {
        gtk_window.set_titlebar(Option::<&gtk::Widget>::None);
    }
}

#[cfg(not(target_os = "linux"))]
pub fn needs_gtk_decorations() -> bool {
    false
}

#[cfg(not(target_os = "linux"))]
pub fn configure_titlebar_for_de(_window: &tauri::WebviewWindow) {
    // No-op on non-Linux platforms
}
