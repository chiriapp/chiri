use lazy_static::lazy_static;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder, TrayIconEvent, TrayIconId},
    Emitter, Manager,
};

// Runtime type alias - switches between Wry and Cef based on feature flag
#[cfg(not(feature = "cef"))]
type AppRuntime = tauri::Wry;

#[cfg(feature = "cef")]
type AppRuntime = tauri::Cef;

// global storage for the last sync menu item updater function
lazy_static! {
    static ref MENU_UPDATER: Mutex<Option<Box<dyn Fn(String) + Send>>> = Mutex::new(None);
    static ref SYNC_ITEM: Mutex<Option<MenuItem<AppRuntime>>> = Mutex::new(None);
    static ref TRAY_VISIBLE: Mutex<bool> = Mutex::new(true);
    static ref TRAY_ENABLED: Mutex<bool> = Mutex::new(true);
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
    // update the global state
    *TRAY_VISIBLE.lock().expect("Failed to lock TRAY_VISIBLE") = enabled;
    *TRAY_ENABLED.lock().expect("Failed to lock TRAY_ENABLED") = enabled;

    // if tray is disabled, don't create it at all
    if !enabled {
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

    // get the default window icon
    let icon = app_handle
        .default_window_icon()
        .ok_or_else(|| "No default window icon found".to_string())?
        .clone();

    let _tray = TrayIconBuilder::with_id("main")
        .icon(icon)
        .menu(&menu)
        .tooltip("caldav-tasks")
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
        .map_err(|e| e.to_string())?;

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
        tray.set_visible(visible).map_err(|e| e.to_string())?;
        *TRAY_VISIBLE.lock().expect("Failed to lock TRAY_VISIBLE") = visible;
        *TRAY_ENABLED.lock().expect("Failed to lock TRAY_ENABLED") = visible;
    }
    Ok(())
}
