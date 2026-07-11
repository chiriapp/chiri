#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>
#import <UserNotifications/UserNotifications.h>
#import <dispatch/dispatch.h>
#import <stdbool.h>
#import <stdlib.h>
#import <string.h>

typedef void (*ChiriPermissionStatusCallback)(char *);
typedef void (*ChiriPermissionRequestCallback)(bool, char *);

static char *ChiriCopyCString(NSString *value) {
  const char *utf8 = value.UTF8String;
  return utf8 == NULL ? NULL : strdup(utf8);
}

static BOOL ChiriHasBundleIdentifier(void) {
  NSString *bundleIdentifier = [NSBundle mainBundle].bundleIdentifier;
  return bundleIdentifier != nil && bundleIdentifier.length > 0;
}

static BOOL ChiriIsOperatingSystemAtLeast(NSInteger majorVersion, NSInteger minorVersion) {
  NSOperatingSystemVersion version = {
      .majorVersion = majorVersion,
      .minorVersion = minorVersion,
      .patchVersion = 0,
  };
  return [[NSProcessInfo processInfo] isOperatingSystemAtLeastVersion:version];
}

static NSString *ChiriAuthorizationStatusName(UNAuthorizationStatus status) {
  switch (status) {
  case UNAuthorizationStatusAuthorized:
    return @"granted";
  case UNAuthorizationStatusDenied:
    return @"denied";
  case UNAuthorizationStatusNotDetermined:
    return @"default";
  case UNAuthorizationStatusProvisional:
    return @"provisional";
  default:
    return @"default";
  }
}

static void ChiriSendPermissionGrantedNotification(void) {
  UNMutableNotificationContent *content = [[UNMutableNotificationContent alloc] init];
  content.title = @"Notifications Enabled";
  content.body = @"You'll now receive reminders for your tasks";
  content.sound = [UNNotificationSound defaultSound];

  UNNotificationRequest *request =
      [UNNotificationRequest requestWithIdentifier:@"permission-granted-test"
                                           content:content
                                           trigger:nil];

  [[UNUserNotificationCenter currentNotificationCenter]
      addNotificationRequest:request
       withCompletionHandler:^(NSError *_Nullable error) {
         if (error != nil) {
           NSLog(@"[Notifications] Failed to send test notification: %@",
                 error.localizedDescription);
         } else {
           NSLog(@"[Notifications] Test notification sent successfully");
         }
       }];
}

void check_notification_permission_ffi(ChiriPermissionStatusCallback callback) {
  if (callback == NULL) {
    return;
  }

  if (!ChiriHasBundleIdentifier()) {
    callback(ChiriCopyCString(@"default"));
    return;
  }

  if (ChiriIsOperatingSystemAtLeast(10, 14)) {
    [[UNUserNotificationCenter currentNotificationCenter]
        getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings *settings) {
          callback(ChiriCopyCString(
              ChiriAuthorizationStatusName(settings.authorizationStatus)));
        }];
    return;
  }

  callback(ChiriCopyCString(@"default"));
}

void request_notification_permission_ffi(ChiriPermissionRequestCallback callback) {
  if (callback == NULL) {
    return;
  }

  if (!ChiriHasBundleIdentifier()) {
    callback(true, ChiriCopyCString(@"granted"));
    return;
  }

  if (ChiriIsOperatingSystemAtLeast(10, 14)) {
    dispatch_async(dispatch_get_main_queue(), ^{
      [[NSApplication sharedApplication] activateIgnoringOtherApps:YES];

      UNAuthorizationOptions options =
          UNAuthorizationOptionAlert | UNAuthorizationOptionSound | UNAuthorizationOptionBadge;
      [[UNUserNotificationCenter currentNotificationCenter]
          requestAuthorizationWithOptions:options
                        completionHandler:^(BOOL granted, NSError *_Nullable error) {
                          if (error != nil) {
                            NSLog(@"[Notifications] Permission request error: %@",
                                  error.localizedDescription);
                            callback(false, ChiriCopyCString(error.localizedDescription));
                            return;
                          }

                          NSLog(@"[Notifications] Permission granted: %@",
                                granted ? @"true" : @"false");

                          if (granted) {
                            ChiriSendPermissionGrantedNotification();
                          }

                          callback(granted ? true : false,
                                   ChiriCopyCString(granted ? @"granted" : @"denied"));
                        }];
    });
    return;
  }

  callback(false, ChiriCopyCString(@"denied"));
}

void free_notification_string_ffi(char *pointer) {
  free(pointer);
}
