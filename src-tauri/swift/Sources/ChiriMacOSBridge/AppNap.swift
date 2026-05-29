import Foundation

private let appNapActivityLock = NSLock()
private var appNapActivity: NSObjectProtocol?

@_cdecl("chiri_macos_disable_app_nap")
public func chiriMacOSDisableAppNap() {
    appNapActivityLock.lock()
    defer { appNapActivityLock.unlock() }

    if appNapActivity != nil {
        return
    }

    appNapActivity = ProcessInfo.processInfo.beginActivity(
        options: .userInitiatedAllowingIdleSystemSleep,
        reason: "Chiri needs to perform periodic CalDAV sync and check for task notifications"
    )
}
