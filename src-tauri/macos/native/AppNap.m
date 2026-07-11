#import <Foundation/Foundation.h>
#import <dispatch/dispatch.h>

static NSLock *ChiriAppNapActivityLock(void) {
  static NSLock *lock;
  static dispatch_once_t onceToken;

  dispatch_once(&onceToken, ^{
    lock = [[NSLock alloc] init];
  });

  return lock;
}

static id<NSObject> chiriAppNapActivity;

void chiri_macos_disable_app_nap(void) {
  NSLock *lock = ChiriAppNapActivityLock();
  [lock lock];

  if (chiriAppNapActivity == nil) {
    chiriAppNapActivity = [[NSProcessInfo processInfo]
        beginActivityWithOptions:NSActivityUserInitiatedAllowingIdleSystemSleep
                          reason:@"Chiri needs to perform periodic CalDAV sync and check for task notifications"];
  }

  [lock unlock];
}
