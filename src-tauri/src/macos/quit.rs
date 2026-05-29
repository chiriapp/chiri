/// Returns true only when the triggering event is a raw NSEventTypeKeyDown — i.e. Cmd+Q
/// pressed while no app menu was open. Mouse clicks and keyboard presses during menu
/// tracking yield different AppKit event types, so those (direct "Quit Chiri" clicks and
/// Cmd+Q while a submenu is visible) correctly return false and bypass the confirm-quit
/// flow. Mirrors Chrome/Edge's "Hold ⌘Q to Quit" behaviour.
#[cfg(target_os = "macos")]
pub fn is_keyboard_shortcut() -> bool {
    unsafe { chiri_macos_current_event_is_key_down() != 0 }
}

#[cfg(target_os = "macos")]
extern "C" {
    fn chiri_macos_current_event_is_key_down() -> std::os::raw::c_int;
}
