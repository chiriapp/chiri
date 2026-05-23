#import <Foundation/Foundation.h>
#import <ApplicationServices/ApplicationServices.h>
#import <objc/message.h>
#import <objc/runtime.h>
#include <libproc.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

enum {
  ChiriSMAppServiceStatusNotRegistered = 0,
  ChiriSMAppServiceStatusEnabled = 1,
  ChiriSMAppServiceStatusRequiresApproval = 2,
  ChiriSMAppServiceStatusNotFound = 3,
};

typedef id (*ChiriObjectMessageSend)(id, SEL);
typedef NSInteger (*ChiriIntegerMessageSend)(id, SEL);
typedef BOOL (*ChiriErrorMessageSend)(id, SEL, NSError **);

static id chiri_main_app_service(void) {
  Class serviceClass = NSClassFromString(@"SMAppService");
  SEL selector = NSSelectorFromString(@"mainAppService");
  if (serviceClass == Nil || ![serviceClass respondsToSelector:selector]) {
    return nil;
  }

  return ((ChiriObjectMessageSend)objc_msgSend)((id)serviceClass, selector);
}

static void chiri_set_error(char **out_error, NSString *message) {
  if (out_error == NULL) {
    return;
  }

  const char *utf8 = message.UTF8String ?: "Unknown login item error";
  *out_error = strdup(utf8);
}

void chiri_macos_login_item_free_string(char *value) {
  free(value);
}

int chiri_macos_was_launched_as_login_item(void) {
  NSAppleEventDescriptor *event =
      NSAppleEventManager.sharedAppleEventManager.currentAppleEvent;
  if (event != nil && event.eventID == kAEOpenApplication) {
    NSAppleEventDescriptor *launchDescriptor =
        [event paramDescriptorForKeyword:keyAEPropData];
    if (launchDescriptor != nil &&
        launchDescriptor.enumCodeValue == keyAELaunchedAsLogInItem) {
      return 1;
    }
  }

  char parentPath[PROC_PIDPATHINFO_MAXSIZE] = {0};
  int pathLength =
      proc_pidpath(getppid(), parentPath, sizeof(parentPath));
  if (pathLength <= 0) {
    return 0;
  }

  return strstr(parentPath, "/loginwindow.app/") != NULL;
}

int chiri_macos_login_item_status(void) {
  id service = chiri_main_app_service();
  SEL statusSelector = NSSelectorFromString(@"status");
  if (service == nil || ![service respondsToSelector:statusSelector]) {
    return -1;
  }

  NSInteger status =
      ((ChiriIntegerMessageSend)objc_msgSend)(service, statusSelector);

  if (status == ChiriSMAppServiceStatusEnabled) {
    return 1;
  }

  if (status == ChiriSMAppServiceStatusRequiresApproval) {
    return 2;
  }

  if (status == ChiriSMAppServiceStatusNotFound) {
    return 3;
  }

  return 0;
}

int chiri_macos_login_item_enable(char **out_error) {
  id service = chiri_main_app_service();
  SEL registerSelector = NSSelectorFromString(@"registerAndReturnError:");
  if (service == nil || ![service respondsToSelector:registerSelector]) {
    chiri_set_error(out_error, @"Launch at login requires macOS 13 or later.");
    return 0;
  }

  NSError *error = nil;
  BOOL success =
      ((ChiriErrorMessageSend)objc_msgSend)(service, registerSelector, &error);
  if (!success) {
    chiri_set_error(out_error, error.localizedDescription);
    return 0;
  }

  return 1;
}

int chiri_macos_login_item_disable(char **out_error) {
  id service = chiri_main_app_service();
  SEL unregisterSelector = NSSelectorFromString(@"unregisterAndReturnError:");
  if (service == nil || ![service respondsToSelector:unregisterSelector]) {
    chiri_set_error(out_error, @"Launch at login requires macOS 13 or later.");
    return 0;
  }

  NSError *error = nil;
  BOOL success = ((ChiriErrorMessageSend)objc_msgSend)(
      service, unregisterSelector, &error);
  if (!success) {
    chiri_set_error(out_error, error.localizedDescription);
    return 0;
  }

  return 1;
}
