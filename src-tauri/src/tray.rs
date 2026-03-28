use std::sync::{LazyLock, Mutex};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder, TrayIconEvent, TrayIconId},
    Emitter, Manager, Theme,
};

use log::{debug, error};

// Runtime type alias - switches between Wry and Cef based on feature flag
#[cfg(not(feature = "cef"))]
type AppRuntime = tauri::Wry;

#[cfg(feature = "cef")]
type AppRuntime = tauri::Cef;

// global storage for the last sync menu item updater function
static MENU_UPDATER: LazyLock<Mutex<Option<Box<dyn Fn(String) + Send>>>> =
    LazyLock::new(|| Mutex::new(None));
static SYNC_ITEM: LazyLock<Mutex<Option<MenuItem<AppRuntime>>>> =
    LazyLock::new(|| Mutex::new(None));
static TRAY_VISIBLE: LazyLock<Mutex<bool>> = LazyLock::new(|| Mutex::new(true));
static TRAY_ENABLED: LazyLock<Mutex<bool>> = LazyLock::new(|| Mutex::new(true));

/// Check if we're running on GNOME
#[cfg(target_os = "linux")]
pub fn is_gnome() -> bool {
    // Check XDG_CURRENT_DESKTOP first, then XDG_SESSION_DESKTOP
    std::env::var("XDG_CURRENT_DESKTOP")
        .or_else(|_| std::env::var("XDG_SESSION_DESKTOP"))
        .map(|desktop| desktop.to_lowercase().contains("gnome"))
        .unwrap_or(false)
}

/// Check if we're running on Linux/GNOME for frontend
#[tauri::command]
pub async fn is_gnome_desktop() -> Result<bool, String> {
    #[cfg(target_os = "linux")]
    {
        Ok(is_gnome())
    }

    #[cfg(not(target_os = "linux"))]
    {
        Ok(false)
    }
}

/// Get the current system theme
#[cfg(target_os = "linux")]
fn get_current_theme(_app_handle: &tauri::AppHandle<AppRuntime>) -> Theme {
    // GNOME's top bar is ALWAYS dark, even in light theme
    // So always return Dark theme to load the light icon
    if is_gnome() {
        debug!("[Tray] GNOME detected - top bar is always dark, using light icon");
        return Theme::Dark;
    }

    debug!("[Tray] Linux detected - using gsettings for theme detection");

    match std::process::Command::new("gsettings")
        .args(["get", "org.gnome.desktop.interface", "color-scheme"])
        .output()
    {
        Ok(output) => {
            let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
            debug!("[Tray] gsettings color-scheme result: {:?}", result);

            // Returns: 'prefer-dark', 'prefer-light', or 'default'
            // 'prefer-dark' = Dark theme (use light icon)
            // 'prefer-light' or 'default' = Light theme (use dark icon)
            if result.contains("prefer-dark") {
                debug!("[Tray] Detected dark theme via gsettings");
                Theme::Dark
            } else if result.contains("prefer-light") || result.contains("default") {
                debug!("[Tray] Detected light theme via gsettings");
                Theme::Light
            } else {
                debug!("[Tray] Unknown gsettings result, defaulting to Dark theme");
                Theme::Dark
            }
        }
        Err(e) => {
            debug!(
                "[Tray] Failed to run gsettings command: {}, defaulting to Dark theme",
                e
            );
            Theme::Dark
        }
    }
}

/// Get the current system theme
#[cfg(not(target_os = "linux"))]
fn get_current_theme(app_handle: &tauri::AppHandle<AppRuntime>) -> Theme {
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

/// Load the appropriate tray icon based on system theme
fn load_tray_icon(app_handle: &tauri::AppHandle<AppRuntime>) -> Result<Image<'static>, String> {
    let theme = get_current_theme(app_handle);

    match theme {
        Theme::Light => {
            // Light menu bar needs dark icon to be visible
            debug!("[Tray] Loading dark icon for light theme");
            let icon_bytes = include_bytes!("../icons/monochrome_dark.png");
            Image::from_bytes(icon_bytes).map_err(|e| {
                error!("[Tray] Failed to load dark icon: {}", e);
                format!("Failed to load tray icon: {}", e)
            })
        }
        Theme::Dark => {
            // Dark menu bar needs light icon to be visible
            debug!("[Tray] Loading light icon for dark theme");
            let icon_bytes = include_bytes!("../icons/monochrome_light.png");
            Image::from_bytes(icon_bytes).map_err(|e| {
                error!("[Tray] Failed to load light icon: {}", e);
                format!("Failed to load tray icon: {}", e)
            })
        }
        _ => {
            // Default to light icon for dark theme
            debug!("[Tray] Unknown theme, loading light icon as default");
            let icon_bytes = include_bytes!("../icons/monochrome_light.png");
            Image::from_bytes(icon_bytes).map_err(|e| {
                error!("[Tray] Failed to load default icon: {}", e);
                format!("Failed to load tray icon: {}", e)
            })
        }
    }
}

/// check if the system tray is currently enabled
pub fn is_tray_enabled() -> bool {
    *TRAY_ENABLED.lock().expect("Failed to lock TRAY_ENABLED")
}

/// initialize the system tray (called from frontend after reading settings)
#[tauri::command]
pub async fn initialize_tray(
    app_handle: tauri::AppHandle<AppRuntime>,
    enabled: bool,
) -> Result<(), String> {
    debug!("[Tray] initialize_tray called with enabled={}", enabled);

    // in dev mode the frontend can reload (Cmd+R / HMR) while the Rust process stays alive
    // guard against creating a second tray icon on top of the existing one
    let tray_id = TrayIconId::new("main");
    if app_handle.tray_by_id(&tray_id).is_some() {
        debug!("[Tray] Tray already exists, skipping re-initialization");
        *TRAY_VISIBLE.lock().expect("Failed to lock TRAY_VISIBLE") = enabled;
        *TRAY_ENABLED.lock().expect("Failed to lock TRAY_ENABLED") = enabled;
        if let Some(tray) = app_handle.tray_by_id(&tray_id) {
            let _ = tray.set_visible(enabled);
        }
        return Ok(());
    }

    // update the global state
    *TRAY_VISIBLE.lock().expect("Failed to lock TRAY_VISIBLE") = enabled;
    *TRAY_ENABLED.lock().expect("Failed to lock TRAY_ENABLED") = enabled;

    // if tray is disabled, don't create it at all
    if !enabled {
        debug!("[Tray] Tray disabled, skipping initialization");
        return Ok(());
    }

    let show_item = MenuItem::with_id(&app_handle, "show", "Show Window", true, None::<&str>)
        .map_err(|e| e.to_string())?;

    let separator_item1 = PredefinedMenuItem::separator(&app_handle).map_err(|e| e.to_string())?;

    let last_sync_item = MenuItem::with_id(
        &app_handle,
        "last_sync",
        "Last sync: Never",
        false,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let sync_item = MenuItem::with_id(&app_handle, "sync", "Sync Now", true, None::<&str>)
        .map_err(|e| e.to_string())?;

    // Store a closure that can update the last sync item text
    let item_clone = last_sync_item.clone();
    *MENU_UPDATER.lock().expect("Failed to lock MENU_UPDATER") =
        Some(Box::new(move |text: String| {
            let _ = item_clone.set_text(&text);
        }));

    // Store the sync item for enable/disable updates
    *SYNC_ITEM.lock().expect("Failed to lock SYNC_ITEM") = Some(sync_item.clone());

    let separator_item2 = PredefinedMenuItem::separator(&app_handle).map_err(|e| e.to_string())?;
    let quit_item = MenuItem::with_id(&app_handle, "quit", "Quit", true, None::<&str>)
        .map_err(|e| e.to_string())?;

    let menu = Menu::with_items(
        &app_handle,
        &[
            &show_item,
            &separator_item1,
            &last_sync_item,
            &sync_item,
            &separator_item2,
            &quit_item,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Load tray icon
    debug!("[Tray] Loading tray icon based on system theme");
    let tray_icon = load_tray_icon(&app_handle)?;
    debug!("[Tray] Tray icon loaded successfully");

    let mut tray_builder = TrayIconBuilder::with_id("main")
        .icon(tray_icon)
        .menu(&menu)
        .tooltip("Chiri");

    // On macOS, use template icon for automatic light/dark mode adaptation
    #[cfg(target_os = "macos")]
    {
        tray_builder = tray_builder.icon_as_template(true);
    }

    let _tray = tray_builder
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();

                    // On macOS, restore the dock icon when showing the window
                    #[cfg(target_os = "macos")]
                    {
                        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                    }
                }
            }
            "sync" => {
                // emit event to frontend to trigger sync
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("tray-sync", ());
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|_tray, event| {
            // on macOS, clicking the tray icon shows the menu (handled automatically)
            // on other platforms, we could add custom behavior here if needed... hm
            if let TrayIconEvent::Click { .. } = event {
                // menu is shown automatically on click for macOS
            }
        })
        .build(&app_handle)
        .map_err(|e| {
            error!("[Tray] Failed to build tray: {}", e);
            e.to_string()
        })?;
    Ok(())
}

/// get the current tray enabled state (for frontend to read on startup)
#[tauri::command]
pub async fn get_tray_enabled() -> Result<bool, String> {
    Ok(is_tray_enabled())
}

#[tauri::command]
pub async fn update_tray_sync_time(
    _app_handle: tauri::AppHandle<AppRuntime>,
    time_str: String,
) -> Result<(), String> {
    if let Some(updater) = MENU_UPDATER
        .lock()
        .expect("Failed to lock MENU_UPDATER")
        .as_ref()
    {
        updater(time_str);
    }
    Ok(())
}

/// enable/disable the tray sync button based on account availability
#[tauri::command]
pub async fn update_tray_sync_enabled(
    _app_handle: tauri::AppHandle<AppRuntime>,
    enabled: bool,
) -> Result<(), String> {
    if let Some(sync_item) = SYNC_ITEM.lock().expect("Failed to lock SYNC_ITEM").as_ref() {
        sync_item.set_enabled(enabled).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// set the system tray visibility
#[tauri::command]
pub async fn set_tray_visible(
    app_handle: tauri::AppHandle<AppRuntime>,
    visible: bool,
) -> Result<(), String> {
    let tray_id = TrayIconId::new("main");
    if let Some(tray) = app_handle.tray_by_id(&tray_id) {
        tray.set_visible(visible).map_err(|e| {
            error!("[Tray] Failed to set visibility: {}", e);
            e.to_string()
        })?;
        *TRAY_VISIBLE.lock().expect("Failed to lock TRAY_VISIBLE") = visible;
        *TRAY_ENABLED.lock().expect("Failed to lock TRAY_ENABLED") = visible;
    }
    Ok(())
}
