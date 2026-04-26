/// Returns true only when the triggering event is a raw NSEventTypeKeyDown — i.e. Cmd+Q
/// pressed while no app menu was open. Mouse clicks and keyboard presses during menu
/// tracking yield different AppKit event types, so those (direct "Quit Chiri" clicks and
/// Cmd+Q while a submenu is visible) correctly return false and bypass the confirm-quit
/// flow. Mirrors Chrome/Edge's "Hold ⌘Q to Quit" behaviour.
#[cfg(target_os = "macos")]
pub fn is_keyboard_shortcut() -> bool {
    use objc2_app_kit::{NSApplication, NSEventType};
    use objc2_foundation::MainThreadMarker;
    // Menu events on macOS are delivered on the main thread — the unsafe assertion is valid.
    let mtm = unsafe { MainThreadMarker::new_unchecked() };
    let app = NSApplication::sharedApplication(mtm);
    app.currentEvent()
        .map(|e| unsafe { e.r#type() } == NSEventType::KeyDown)
        .unwrap_or(false)
}
