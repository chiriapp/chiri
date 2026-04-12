#import <Foundation/Foundation.h>
#import <UserNotifications/UserNotifications.h>
#import <AppKit/AppKit.h>

// Callback function pointer types
typedef void (*PermissionStatusCallback)(const char *);
typedef void (*PermissionRequestCallback)(bool, const char *);

void check_notification_permission_ffi(PermissionStatusCallback callback) {
    // Check if we have a valid bundle identifier first.
    // In development mode, Tauri assumes Terminal.app... 😭
    // UNUserNotificationCenter crashes if accessed without a bundle identifier.
    NSString *bundleId = [[NSBundle mainBundle] bundleIdentifier];
    if (!bundleId || [bundleId length] == 0) {
        // We're (most likely) in dev mode. We can't natively query UNUserNotificationCenter,
        // so we'll mock the permission as "granted" to allow the app to function.
        char *statusCopy = strdup("default");
        callback(statusCopy);
        return;
    }

    // Check if UNUserNotificationCenter class is available (macOS 10.14+)
    // This uses dynamic class checking instead of @available to avoid linker issues
    Class UNClass = NSClassFromString(@"UNUserNotificationCenter");
    if (UNClass == nil) {
        // UNUserNotificationCenter not available on this OS version
        char *statusCopy = strdup("default");
        callback(statusCopy);
        return;
    }

    @try {
        UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];

        [center getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings *settings) {
            const char *status;

            switch (settings.authorizationStatus) {
                case UNAuthorizationStatusAuthorized:
                    status = "granted";
                    break;
                case UNAuthorizationStatusDenied:
                    status = "denied";
                    break;
                case UNAuthorizationStatusNotDetermined:
                    status = "default";
                    break;
                case UNAuthorizationStatusProvisional:
                    status = "provisional";
                    break;
                default:
                    status = "default";
                    break;
            }

            // Make a copy of the string that won't be deallocated
            char *statusCopy = strdup(status);
            callback(statusCopy);
        }];
    } @catch (NSException *exception) {
        // If UNUserNotificationCenter fails, return "default"
        char *statusCopy = strdup("default");
        callback(statusCopy);
    }
}

void request_notification_permission_ffi(PermissionRequestCallback callback) {
    // Check if we have a valid bundle identifier first.
    // In development mode (running from Cargo/Terminal without an App bundle), this will be nil.
    // UNUserNotificationCenter crashes if accessed without a bundle identifier.
    NSString *bundleId = [[NSBundle mainBundle] bundleIdentifier];
    if (!bundleId || [bundleId length] == 0) {
        // We're (most likely) in dev mode. We can't request natively, so we mock a successful response.
        char *statusCopy = strdup("granted");
        callback(true, statusCopy);
        return;
    }

    // Check if UNUserNotificationCenter class is available (macOS 10.14+)
    // This uses dynamic class checking instead of @available to avoid linker issues
    Class UNClass = NSClassFromString(@"UNUserNotificationCenter");
    if (UNClass == nil) {
        // UNUserNotificationCenter not available on this OS version
        char *statusCopy = strdup("denied");
        callback(false, statusCopy);
        return;
    }

    // Ensure the entire operation happens on the main thread
    // This is CRITICAL - permission requests must be made from the main thread
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            // Activate the app to bring it to the foreground
            // This is required for the permission dialog to appear
            [[NSApplication sharedApplication] activateIgnoringOtherApps:YES];

            UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];

            UNAuthorizationOptions options = UNAuthorizationOptionAlert |
                                             UNAuthorizationOptionSound |
                                             UNAuthorizationOptionBadge;

            [center requestAuthorizationWithOptions:options
                                  completionHandler:^(BOOL granted, NSError *error) {
                if (error) {
                    NSLog(@"[Notifications] Permission request error: %@", error);
                    const char *errorMsg = [[error localizedDescription] UTF8String];
                    char *errorCopy = strdup(errorMsg);
                    callback(false, errorCopy);
                    return;
                }

                NSLog(@"[Notifications] Permission granted: %d", granted);

                // Send a test notification to ensure the permission dialog appears
                // and to confirm notifications are working
                if (granted) {
                    UNMutableNotificationContent *content = [[UNMutableNotificationContent alloc] init];
                    content.title = @"Notifications Enabled";
                    content.body = @"You'll now receive reminders for your tasks";
                    content.sound = [UNNotificationSound defaultSound];

                    // Send immediately (nil trigger)
                    UNNotificationRequest *request = [UNNotificationRequest
                        requestWithIdentifier:@"permission-granted-test"
                        content:content
                        trigger:nil];

                    [center addNotificationRequest:request withCompletionHandler:^(NSError *notifError) {
                        if (notifError) {
                            NSLog(@"[Notifications] Failed to send test notification: %@", notifError);
                        } else {
                            NSLog(@"[Notifications] Test notification sent successfully");
                        }
                    }];
                }

                const char *status = granted ? "granted" : "denied";
                char *statusCopy = strdup(status);
                callback(granted, statusCopy);
            }];
        } @catch (NSException *exception) {
            // If UNUserNotificationCenter fails, return denied
            NSLog(@"Exception in request_notification_permission_ffi: %@", exception);
            char *statusCopy = strdup("denied");
            callback(false, statusCopy);
        }
    });
}

void free_notification_string_ffi(char *ptr) {
    if (ptr) {
        free(ptr);
    }
}
