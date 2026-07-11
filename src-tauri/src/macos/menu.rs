//! macOS Help menu fix
//!
//! workaround for muda's broken `set_as_help_menu_for_nsapp()`
//! the muda implementation calls `setHelpMenu` on a detached `NSMenu` that is
//! never part of the app's main menu, so macOS silently ignores it and the
//! help search bar never appears
//!
//! the fix: after the Tauri menu is applied with `setAsAppMenu()`, call into
//! the native macOS bridge to find the live "Help" submenu in the real `mainMenu`
//! and register it with `NSApplication.setHelpMenu()`
//!
//! see: https://github.com/tauri-apps/muda/pull/322
//!      https://github.com/tauri-apps/tauri/issues/12652

/// applies macOS menu fixes on the calling thread
/// must be called on the main thread (use `AppHandle::run_on_main_thread`)
#[cfg(target_os = "macos")]
fn fix_help_menu() {
    unsafe {
        chiri_macos_fix_select_all_menu_item();
        chiri_macos_fix_help_menu();
    }
}

#[cfg(target_os = "macos")]
extern "C" {
    fn chiri_macos_fix_select_all_menu_item();
    fn chiri_macos_fix_help_menu();
}

/// Tauri command; call from JS after every `menu.setAsAppMenu()`
///
/// schedules `fix_help_menu` on the main thread and returns immediately
/// on non-macOS platforms this is a no-op
#[tauri::command]
#[allow(unused_variables)]
pub fn apply_macos_menu_fixes(app: tauri::AppHandle<impl tauri::Runtime>) {
    #[cfg(target_os = "macos")]
    let _ = app.run_on_main_thread(fix_help_menu);
}
