#import <ApplicationServices/ApplicationServices.h>
#import <Foundation/Foundation.h>
#import <ServiceManagement/ServiceManagement.h>
#import <libproc.h>
#import <stdlib.h>
#import <string.h>
#import <unistd.h>

typedef NS_ENUM(int, ChiriLoginItemStatus) {
  ChiriLoginItemStatusUnsupported = -1,
  ChiriLoginItemStatusNotRegistered = 0,
  ChiriLoginItemStatusEnabled = 1,
  ChiriLoginItemStatusRequiresApproval = 2,
  ChiriLoginItemStatusNotFound = 3,
};

static char *ChiriCopyCString(NSString *value) {
  const char *utf8 = value.UTF8String;
  return utf8 == NULL ? NULL : strdup(utf8);
}

static void ChiriSetError(char **output, NSString *message) {
  if (output == NULL) {
    return;
  }

  *output = ChiriCopyCString(message);
}

static BOOL ChiriIsOperatingSystemAtLeast(NSInteger majorVersion, NSInteger minorVersion) {
  NSOperatingSystemVersion version = {
      .majorVersion = majorVersion,
      .minorVersion = minorVersion,
      .patchVersion = 0,
  };
  return [[NSProcessInfo processInfo] isOperatingSystemAtLeastVersion:version];
}

static int ChiriLoginItemStatusFromServiceStatus(SMAppServiceStatus status) {
  switch (status) {
  case SMAppServiceStatusEnabled:
    return ChiriLoginItemStatusEnabled;
  case SMAppServiceStatusRequiresApproval:
    return ChiriLoginItemStatusRequiresApproval;
  case SMAppServiceStatusNotFound:
    return ChiriLoginItemStatusNotFound;
  case SMAppServiceStatusNotRegistered:
  default:
    return ChiriLoginItemStatusNotRegistered;
  }
}

static BOOL ChiriParentProcessPathContainsLoginWindow(void) {
  char parentPath[PROC_PIDPATHINFO_MAXSIZE] = {0};
  int pathLength = proc_pidpath(getppid(), parentPath, sizeof(parentPath));
  if (pathLength <= 0) {
    return NO;
  }

  return strstr(parentPath, "/loginwindow.app/") != NULL;
}

void chiri_macos_login_item_free_string(char *value) {
  free(value);
}

int chiri_macos_was_launched_as_login_item(void) {
  NSAppleEventDescriptor *event =
      [NSAppleEventManager sharedAppleEventManager].currentAppleEvent;
  if (event != nil && event.eventID == kAEOpenApplication) {
    NSAppleEventDescriptor *launchDescriptor =
        [event paramDescriptorForKeyword:keyAEPropData];
    if (launchDescriptor != nil &&
        launchDescriptor.enumCodeValue == keyAELaunchedAsLogInItem) {
      return 1;
    }
  }

  return ChiriParentProcessPathContainsLoginWindow() ? 1 : 0;
}

int chiri_macos_login_item_status(void) {
  if (ChiriIsOperatingSystemAtLeast(13, 0)) {
    return ChiriLoginItemStatusFromServiceStatus([SMAppService mainAppService].status);
  }

  return ChiriLoginItemStatusUnsupported;
}

int chiri_macos_login_item_enable(char **outputError) {
  if (ChiriIsOperatingSystemAtLeast(13, 0)) {
    int status = chiri_macos_login_item_status();
    if (status == ChiriLoginItemStatusEnabled ||
        status == ChiriLoginItemStatusRequiresApproval) {
      return 1;
    }

    NSError *__autoreleasing error = nil;
    if ([[SMAppService mainAppService] registerAndReturnError:&error]) {
      return 1;
    }

    ChiriSetError(outputError, error.localizedDescription ?: @"Unknown login item error");
    return 0;
  }

  ChiriSetError(outputError, @"Launch at login requires macOS 13 or later.");
  return 0;
}

int chiri_macos_login_item_disable(char **outputError) {
  if (ChiriIsOperatingSystemAtLeast(13, 0)) {
    int status = chiri_macos_login_item_status();
    if (status == ChiriLoginItemStatusNotRegistered ||
        status == ChiriLoginItemStatusNotFound) {
      return 1;
    }

    NSError *__autoreleasing error = nil;
    if ([[SMAppService mainAppService] unregisterAndReturnError:&error]) {
      return 1;
    }

    ChiriSetError(outputError, error.localizedDescription ?: @"Unknown login item error");
    return 0;
  }

  ChiriSetError(outputError, @"Launch at login requires macOS 13 or later.");
  return 0;
}
