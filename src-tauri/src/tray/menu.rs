use log::{debug, error};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder, TrayIconEvent, TrayIconId},
    Emitter, Manager,
};

use super::{icon, AppRuntime, TrayState};

#[cfg(target_os = "macos")]
use crate::macos::quit::is_keyboard_shortcut;

pub(in crate::tray) fn initialize(
    app_handle: tauri::AppHandle<AppRuntime>,
    state: &TrayState,
    enabled: bool,
) -> Result<(), String> {
    // in dev mode the frontend can reload while the Rust process stays alive
    // guard against creating a second tray icon on top of the existing one
    let tray_id = TrayIconId::new("main");
    if app_handle.tray_by_id(&tray_id).is_some() {
        debug!("[Tray] Tray already exists, skipping re-initialization");
        state.set_enabled(enabled)?;
        if let Some(tray) = app_handle.tray_by_id(&tray_id) {
            let _ = tray.set_visible(enabled);
        }
        return Ok(());
    }

    state.set_enabled(enabled)?;

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

    let item_clone = last_sync_item.clone();
    state.set_menu_updater(Box::new(move |text: String| {
        let _ = item_clone.set_text(&text);
    }))?;
    state.set_sync_item(sync_item.clone())?;

    let separator_item2 = PredefinedMenuItem::separator(&app_handle).map_err(|e| e.to_string())?;
    let quit_item = MenuItem::with_id(&app_handle, "tray-quit", "Quit", true, None::<&str>)
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

    let (tray_icon, theme, icon_label) = icon::load(&app_handle)?;
    debug!(
        "[Tray] Tray icon loaded (theme: {:?}, icon: {})",
        theme, icon_label
    );

    let tray_builder = TrayIconBuilder::with_id("main")
        .icon(tray_icon)
        .menu(&menu)
        .tooltip("Chiri");

    #[cfg(target_os = "macos")]
    let tray_builder = tray_builder.icon_as_template(true);

    // inside Flatpak, the default tray-icon temp path is private to the sandbox
    // /tmp is shared with the host tray manager, so the SNI icon path resolves
    #[cfg(target_os = "linux")]
    let tray_builder = tray_builder.temp_dir_path("/tmp");

    let _tray = tray_builder
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();

                    #[cfg(target_os = "macos")]
                    crate::window::show_dock_icon(app);
                }
            }
            "sync" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("tray-sync", ());
                }
            }
            "quit" => {
                #[cfg(target_os = "macos")]
                {
                    if is_keyboard_shortcut() {
                        app.exit(0);
                    } else {
                        std::process::exit(0);
                    }
                }
                #[cfg(not(target_os = "macos"))]
                app.exit(0);
            }
            "tray-quit" => {
                std::process::exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|_tray, event| {
            if let TrayIconEvent::Click { .. } = event {
                // menu display is platform-handled
            }
        })
        .build(&app_handle)
        .map_err(|e| {
            error!("[Tray] Failed to build tray: {}", e);
            e.to_string()
        })?;
    Ok(())
}
