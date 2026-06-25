use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;

static USE_INTEGRATED_TITLEBAR: AtomicBool = AtomicBool::new(true);

/// Scales the standard macOS traffic lights slightly larger than the AppKit
/// default. AppKit may relayout the buttons while opening or resizing, so
/// callers can safely reapply this.
pub fn apply_traffic_light_scale<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) {
    if !USE_INTEGRATED_TITLEBAR.load(Ordering::Relaxed) {
        return;
    }

    let Ok(ns_window) = window.ns_window() else {
        return;
    };

    unsafe {
        chiri_macos_update_window_controls(ns_window, true);
    }
}

pub fn scale_traffic_lights(app: &tauri::AppHandle<impl tauri::Runtime>) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    apply_traffic_light_scale(&window);

    let _ = app.run_on_main_thread(move || {
        apply_traffic_light_scale(&window);
    });
}

#[tauri::command]
pub fn set_macos_window_decoration_style(
    window: tauri::WebviewWindow,
    style: &str,
) -> Result<(), String> {
    let integrated = match style {
        "integrated" => true,
        "native" => false,
        _ => return Err(format!("Unknown window decoration style: {style}")),
    };

    let was_integrated = USE_INTEGRATED_TITLEBAR.swap(integrated, Ordering::Relaxed);
    if was_integrated == integrated {
        return Ok(());
    }

    window
        .set_title_bar_style(if integrated {
            tauri::TitleBarStyle::Overlay
        } else {
            tauri::TitleBarStyle::Visible
        })
        .map_err(|error| error.to_string())?;

    let app_handle = window.app_handle().clone();
    app_handle
        .run_on_main_thread(move || {
            let Ok(ns_window) = window.ns_window() else {
                return;
            };
            unsafe {
                chiri_macos_update_window_controls(ns_window, integrated);
            }
        })
        .map_err(|error| error.to_string())?;

    Ok(())
}

extern "C" {
    fn chiri_macos_update_window_controls(
        ns_window: *mut std::ffi::c_void,
        integrated_titlebar: bool,
    );
}
