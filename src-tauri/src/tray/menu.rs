use log::debug;
#[cfg(not(target_os = "linux"))]
use log::error;
#[cfg(windows)]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconEvent};
#[cfg(not(target_os = "linux"))]
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder, TrayIconId},
    Emitter, Manager,
};

#[cfg(target_os = "linux")]
use ksni::TrayMethods;

use super::{icon, AppRuntime, TrayState};
use crate::app::events::request_frontend_quit;

#[cfg(target_os = "macos")]
use crate::macos::quit::is_keyboard_shortcut;

#[cfg(not(target_os = "linux"))]
fn show_main_window(app: &tauri::AppHandle<AppRuntime>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();

        #[cfg(target_os = "macos")]
        crate::window::show_dock_icon(app);
    }
}

#[cfg(not(target_os = "linux"))]
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

    #[cfg(windows)]
    let tray_builder = tray_builder.show_menu_on_left_click(false);

    let tray_app_handle = app_handle.clone();
    let _tray = tray_builder
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                show_main_window(app);
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
                        request_frontend_quit(app);
                    }
                }
                #[cfg(not(target_os = "macos"))]
                {
                    request_frontend_quit(app);
                }
            }
            "tray-quit" => {
                request_frontend_quit(app);
            }
            _ => {}
        })
        .on_tray_icon_event(move |_tray, event| {
            #[cfg(windows)]
            match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
                | TrayIconEvent::DoubleClick {
                    button: MouseButton::Left,
                    ..
                } => show_main_window(&tray_app_handle),
                _ => {}
            }

            #[cfg(not(windows))]
            let _ = (event, &tray_app_handle);
        })
        .build(&app_handle)
        .map_err(|e| {
            error!("[Tray] Failed to build tray: {}", e);
            e.to_string()
        })?;

    Ok(())
}

#[cfg(target_os = "linux")]
pub(in crate::tray) async fn initialize(
    app_handle: tauri::AppHandle<AppRuntime>,
    state: &TrayState,
    enabled: bool,
) -> Result<(), String> {
    state.set_enabled(enabled)?;

    if let Some(handle) = state.linux_tray_handle()? {
        let _ = handle.update(|tray| tray.visible = enabled).await;
        return Ok(());
    }

    if !enabled {
        debug!("[Tray] Linux tray is disabled");
        return Ok(());
    }

    let (tray_icon, theme, icon_label) = icon::load(&app_handle)?;
    debug!(
        "[Tray] Initializing Linux ksni tray with icon '{}' (theme: {:?})",
        icon_label, theme
    );

    let tray = super::linux::LinuxTray::new(app_handle, tray_icon);
    let handle = tray
        .assume_sni_available(true)
        .spawn()
        .await
        .map_err(|error| format!("Failed to initialize Linux ksni tray: {error}"))?;

    state.set_linux_tray(handle)
}
