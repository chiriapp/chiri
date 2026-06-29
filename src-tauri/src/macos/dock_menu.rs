use std::{
    ffi::{CStr, CString},
    os::raw::{c_char, c_int},
    sync::{
        atomic::{AtomicBool, Ordering},
        OnceLock,
    },
};

use serde::Deserialize;
use tauri::{Emitter, Manager};

static APP_HANDLE: OnceLock<tauri::AppHandle<tauri::Wry>> = OnceLock::new();
static DOCK_SYNC_ENABLED: AtomicBool = AtomicBool::new(false);

const MENU_NEW_TASK: &str = "menu:new-task";
const MENU_SYNC: &str = "menu:sync";
const MENU_SELECT_FILTER: &str = "menu:select-filter";

#[derive(Deserialize)]
pub struct DockMenuFilter {
    id: String,
    label: String,
}

#[derive(Clone, serde::Serialize)]
struct SelectFilterPayload<'a> {
    #[serde(rename = "filterId")]
    filter_id: &'a str,
}

#[cfg(target_os = "macos")]
extern "C" {
    fn chiri_macos_install_dock_menu();
    fn chiri_macos_set_dock_menu_items(
        sync_enabled: c_int,
        filter_count: c_int,
        filter_ids: *const *const c_char,
        filter_labels: *const *const c_char,
    );
}

pub fn initialize(app: &tauri::AppHandle<tauri::Wry>) {
    let _ = APP_HANDLE.set(app.clone());
    let _ = app.run_on_main_thread(|| unsafe {
        chiri_macos_install_dock_menu();
    });
}

#[tauri::command]
pub fn update_macos_dock_menu(
    app: tauri::AppHandle<tauri::Wry>,
    sync_enabled: bool,
    filters: Vec<DockMenuFilter>,
) -> Result<(), String> {
    DOCK_SYNC_ENABLED.store(sync_enabled, Ordering::Relaxed);

    let filter_ids: Vec<CString> = filters
        .iter()
        .map(|filter| CString::new(filter.id.as_str()))
        .collect::<Result<_, _>>()
        .map_err(|_| "Dock menu filter IDs cannot contain NUL bytes".to_string())?;
    let filter_labels: Vec<CString> = filters
        .iter()
        .map(|filter| CString::new(filter.label.as_str()))
        .collect::<Result<_, _>>()
        .map_err(|_| "Dock menu filter labels cannot contain NUL bytes".to_string())?;

    let filter_count = filters.len() as c_int;
    let sync_enabled: c_int = i32::from(sync_enabled);

    app.run_on_main_thread(move || unsafe {
        let filter_id_ptrs: Vec<*const c_char> = filter_ids.iter().map(|id| id.as_ptr()).collect();
        let filter_label_ptrs: Vec<*const c_char> =
            filter_labels.iter().map(|label| label.as_ptr()).collect();

        chiri_macos_install_dock_menu();
        chiri_macos_set_dock_menu_items(
            sync_enabled,
            filter_count,
            filter_id_ptrs.as_ptr(),
            filter_label_ptrs.as_ptr(),
        );
    })
    .map_err(|error| error.to_string())
}

fn focus_main_window(app: &tauri::AppHandle<tauri::Wry>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        crate::window::show_dock_icon(app);
    }
}

#[no_mangle]
pub extern "C" fn chiri_macos_dock_menu_item_selected(action: *const c_char) {
    if action.is_null() {
        return;
    }

    let Some(app) = APP_HANDLE.get() else {
        return;
    };

    let Ok(action) = (unsafe { CStr::from_ptr(action) }).to_str() else {
        return;
    };

    match action {
        "new-task" => {
            focus_main_window(app);
            let _ = app.emit(MENU_NEW_TASK, ());
        }
        "sync" => {
            if !DOCK_SYNC_ENABLED.load(Ordering::Relaxed) {
                return;
            }

            let _ = app.emit(MENU_SYNC, ());
        }
        action if action.starts_with("filter:") => {
            let filter_id = &action["filter:".len()..];
            focus_main_window(app);
            let _ = app.emit(MENU_SELECT_FILTER, SelectFilterPayload { filter_id });
        }
        _ => {}
    }
}
