/// macOS Help menu fix.
///
/// Workaround for muda's broken `set_as_help_menu_for_nsapp()`.
/// The muda implementation calls `setHelpMenu` on a detached `NSMenu` that is
/// never part of the app's main menu, so macOS silently ignores it and the
/// Help search bar never appears.
///
/// The fix: after the Tauri menu is applied with `setAsAppMenu()`, call back
/// into Objective-C to find the live "Help" submenu in the real `mainMenu`
/// and register it with `NSApplication.setHelpMenu()`.
///
/// See: https://github.com/tauri-apps/muda/pull/322
///      https://github.com/tauri-apps/tauri/issues/12652

/// Applies the fix on the calling thread.
/// Must be called on the main thread (use `AppHandle::run_on_main_thread`).
#[cfg(target_os = "macos")]
fn fix_help_menu() {
    use objc2_app_kit::NSApplication;
    use objc2_foundation::MainThreadMarker;
    use objc2_foundation::NSString;

    // This function is only ever called via `run_on_main_thread`, so the
    // main-thread marker is always valid here.
    let mtm = unsafe { MainThreadMarker::new_unchecked() };

    unsafe {
        let app = NSApplication::sharedApplication(mtm);

        let Some(main_menu) = app.mainMenu() else {
            return;
        };

        let help_title = NSString::from_str("Help");

        let Some(help_item) = main_menu.itemWithTitle(&help_title) else {
            return;
        };

        let Some(help_submenu) = help_item.submenu() else {
            return;
        };

        app.setHelpMenu(Some(&help_submenu));
    }
}

/// Tauri command — call from JS after every `menu.setAsAppMenu()`.
///
/// Schedules `fix_help_menu` on the main thread and returns immediately.
/// On non-macOS platforms this is a no-op.
#[tauri::command]
#[allow(unused_variables)]
pub fn apply_macos_menu_fixes(app: tauri::AppHandle<impl tauri::Runtime>) {
    #[cfg(target_os = "macos")]
    let _ = app.run_on_main_thread(fix_help_menu);
}
