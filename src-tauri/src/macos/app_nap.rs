//! macOS App Nap control
//!
//! App Nap is a macOS power-saving feature that throttles background apps.
//! This breaks Chiri's periodic sync and notification timers when the
//! window is hidden in tray mode.
//!
//! Reference:
//! - https://developer.apple.com/library/archive/documentation/Performance/Conceptual/power_efficiency_guidelines_osx/AppNap.html

#[cfg(target_os = "macos")]
pub fn disable_app_nap() {
    use crate::logging;

    unsafe { chiri_macos_disable_app_nap() };

    log::info!(
        "{}",
        logging::scoped_message(
            "AppNap",
            "App Nap has been disabled to periodically sync and serve notifications in the background."
        )
    );
}

#[cfg(target_os = "macos")]
extern "C" {
    fn chiri_macos_disable_app_nap();
}
