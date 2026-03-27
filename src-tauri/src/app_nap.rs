/// macOS App Nap control
///
/// App Nap is a macOS power-saving feature that throttles background apps.
/// This breaks Chiri's periodic sync and notification timers when the
/// window is hidden in tray mode.
///
/// Reference:
/// - https://developer.apple.com/library/archive/documentation/Performance/Conceptual/power_efficiency_guidelines_osx/AppNap.html

#[cfg(target_os = "macos")]
pub fn disable_app_nap() {
    use crate::logging;
    use objc2_foundation::{NSActivityOptions, NSProcessInfo, NSString};

    // NSActivityUserInitiated = 0x00FFFFFF
    // This is Apple's flag for user-initiated work and includes NSActivityIdleSystemSleepDisabled.
    // It prevents App Nap from throttling CPU/timers while allowing manual sleep (lid close).
    //
    // This is stronger than NSActivityUserInitiatedAllowingIdleSystemSleep (0x00EFFFFF)
    // which was found insufficient for preventing WebSocket/timer throttling.
    let options = NSActivityOptions::NSActivityUserInitiated;

    let process_info = NSProcessInfo::processInfo();
    let reason = NSString::from_str(
        "Chiri needs to perform periodic CalDAV sync and check for task notifications",
    );

    let activity = unsafe { process_info.beginActivityWithOptions_reason(options, &reason) };

    // CRITICAL: Leak the activity object to keep the assertion active for the app's lifetime.
    // If we drop it, the assertion is released and App Nap will resume throttling.
    // The OS cleans this up when the app terminates.
    Box::leak(Box::new(activity));

    log::info!(
        "{}",
        logging::scoped_message(
            "AppNap",
            "Activity assertion started (NSActivityUserInitiated)"
        )
    );
    log::info!(
        "{}",
        logging::scoped_message(
            "AppNap",
            "Periodic sync and notifications will continue when window is hidden",
        )
    );
}
