import AppKit
import Darwin
import Foundation
import UserNotifications

public typealias PermissionStatusCallback = @convention(c) (UnsafeMutablePointer<CChar>?) -> Void
public typealias PermissionRequestCallback = @convention(c) (Bool, UnsafeMutablePointer<CChar>?) -> Void

private func copiedCString(_ value: String) -> UnsafeMutablePointer<CChar>? {
    strdup(value)
}

private func hasBundleIdentifier() -> Bool {
    guard let bundleIdentifier = Bundle.main.bundleIdentifier else {
        return false
    }

    return !bundleIdentifier.isEmpty
}

@available(macOS 10.14, *)
private func authorizationStatusName(_ authorizationStatus: UNAuthorizationStatus) -> String {
    switch authorizationStatus {
    case .authorized:
        return "granted"
    case .denied:
        return "denied"
    case .notDetermined:
        return "default"
    case .provisional:
        return "provisional"
    @unknown default:
        return "default"
    }
}

@_cdecl("check_notification_permission_ffi")
public func checkNotificationPermissionFFI(_ callback: @escaping PermissionStatusCallback) {
    guard hasBundleIdentifier() else {
        callback(copiedCString("default"))
        return
    }

    guard #available(macOS 10.14, *) else {
        callback(copiedCString("default"))
        return
    }

    UNUserNotificationCenter.current().getNotificationSettings { settings in
        callback(copiedCString(authorizationStatusName(settings.authorizationStatus)))
    }
}

@_cdecl("request_notification_permission_ffi")
public func requestNotificationPermissionFFI(_ callback: @escaping PermissionRequestCallback) {
    guard hasBundleIdentifier() else {
        callback(true, copiedCString("granted"))
        return
    }

    guard #available(macOS 10.14, *) else {
        callback(false, copiedCString("denied"))
        return
    }

    DispatchQueue.main.async {
        NSApplication.shared.activate(ignoringOtherApps: true)

        let options: UNAuthorizationOptions = [.alert, .sound, .badge]
        UNUserNotificationCenter.current().requestAuthorization(options: options) { granted, error in
            if let error {
                NSLog("[Notifications] Permission request error: %@", error.localizedDescription)
                callback(false, copiedCString(error.localizedDescription))
                return
            }

            NSLog("[Notifications] Permission granted: %@", granted ? "true" : "false")

            if granted {
                sendPermissionGrantedNotification()
            }

            callback(granted, copiedCString(granted ? "granted" : "denied"))
        }
    }
}

@available(macOS 10.14, *)
private func sendPermissionGrantedNotification() {
    let content = UNMutableNotificationContent()
    content.title = "Notifications Enabled"
    content.body = "You'll now receive reminders for your tasks"
    content.sound = .default

    let request = UNNotificationRequest(
        identifier: "permission-granted-test",
        content: content,
        trigger: nil
    )

    UNUserNotificationCenter.current().add(request) { error in
        if let error {
            NSLog("[Notifications] Failed to send test notification: %@", error.localizedDescription)
        } else {
            NSLog("[Notifications] Test notification sent successfully")
        }
    }
}

@_cdecl("free_notification_string_ffi")
public func freeNotificationStringFFI(_ pointer: UnsafeMutablePointer<CChar>?) {
    if let pointer {
        free(pointer)
    }
}
