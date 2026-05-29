import ApplicationServices
import Darwin
import Foundation
import ServiceManagement

private enum LoginItemStatus: Int32 {
    case unsupported = -1
    case notRegistered = 0
    case enabled = 1
    case requiresApproval = 2
    case notFound = 3
}

private let procPidPathInfoMaxSize = 4096

private func copiedCString(_ value: String) -> UnsafeMutablePointer<CChar>? {
    strdup(value)
}

private func setError(
    _ output: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>?,
    _ message: String
) {
    output?.pointee = copiedCString(message)
}

@available(macOS 13.0, *)
private func mainAppServiceStatus() -> LoginItemStatus {
    switch SMAppService.mainApp.status {
    case .enabled:
        return .enabled
    case .requiresApproval:
        return .requiresApproval
    case .notFound:
        return .notFound
    case .notRegistered:
        return .notRegistered
    @unknown default:
        return .notRegistered
    }
}

@_cdecl("chiri_macos_login_item_free_string")
public func chiriMacOSLoginItemFreeString(_ value: UnsafeMutablePointer<CChar>?) {
    if let value {
        free(value)
    }
}

@_cdecl("chiri_macos_was_launched_as_login_item")
public func chiriMacOSWasLaunchedAsLoginItem() -> Int32 {
    if let event = NSAppleEventManager.shared().currentAppleEvent,
       event.eventID == kAEOpenApplication,
       let launchDescriptor = event.paramDescriptor(forKeyword: keyAEPropData),
       launchDescriptor.enumCodeValue == keyAELaunchedAsLogInItem
    {
        return 1
    }

    return parentProcessPathContainsLoginWindow() ? 1 : 0
}

private func parentProcessPathContainsLoginWindow() -> Bool {
    var parentPath = [CChar](repeating: 0, count: procPidPathInfoMaxSize)
    let pathLength = parentPath.withUnsafeMutableBufferPointer { buffer -> Int32 in
        guard let baseAddress = buffer.baseAddress else {
            return 0
        }

        return proc_pidpath(getppid(), baseAddress, UInt32(buffer.count))
    }

    guard pathLength > 0 else {
        return false
    }

    return String(cString: parentPath).contains("/loginwindow.app/")
}

@_cdecl("chiri_macos_login_item_status")
public func chiriMacOSLoginItemStatus() -> Int32 {
    guard #available(macOS 13.0, *) else {
        return LoginItemStatus.unsupported.rawValue
    }

    return mainAppServiceStatus().rawValue
}

@_cdecl("chiri_macos_login_item_enable")
public func chiriMacOSLoginItemEnable(
    _ outputError: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>?
) -> Int32 {
    guard #available(macOS 13.0, *) else {
        setError(outputError, "Launch at login requires macOS 13 or later.")
        return 0
    }

    let status = mainAppServiceStatus()
    if status == .enabled || status == .requiresApproval {
        return 1
    }

    do {
        try SMAppService.mainApp.register()
        return 1
    } catch {
        setError(outputError, error.localizedDescription)
        return 0
    }
}

@_cdecl("chiri_macos_login_item_disable")
public func chiriMacOSLoginItemDisable(
    _ outputError: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>?
) -> Int32 {
    guard #available(macOS 13.0, *) else {
        setError(outputError, "Launch at login requires macOS 13 or later.")
        return 0
    }

    let status = mainAppServiceStatus()
    if status == .notRegistered || status == .notFound {
        return 1
    }

    do {
        try SMAppService.mainApp.unregister()
        return 1
    } catch {
        setError(outputError, error.localizedDescription)
        return 0
    }
}
