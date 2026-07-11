#import <AppKit/AppKit.h>
#import <objc/runtime.h>
#include <stdbool.h>

static const CGFloat ChiriTrafficLightGap = 8.0;
static const CGFloat ChiriTrafficLightInsetX = 16.0;
static const CGFloat ChiriTitlebarHeight = 52.0;
static const void *ChiriWindowControlsPendingKey = &ChiriWindowControlsPendingKey;
static const void *ChiriWindowControlsPendingCaptureKey =
    &ChiriWindowControlsPendingCaptureKey;
static const void *ChiriIntegratedTitlebarKey = &ChiriIntegratedTitlebarKey;
static const void *ChiriTrafficLightAnchorKey = &ChiriTrafficLightAnchorKey;
static const void *ChiriWindowControlsObserversKey = &ChiriWindowControlsObserversKey;
static const void *ChiriWindowControlsContainerKey =
    &ChiriWindowControlsContainerKey;
static const void *ChiriWindowControlsApplyingKey = &ChiriWindowControlsApplyingKey;

static void ChiriRemoveWindowControlObservers(NSWindow *window) {
  NSArray *observers =
      objc_getAssociatedObject(window, ChiriWindowControlsObserversKey);
  if (observers == nil) {
    return;
  }

  NSNotificationCenter *notificationCenter =
      NSNotificationCenter.defaultCenter;
  for (id observer in observers) {
    [notificationCenter removeObserver:observer];
  }

  objc_setAssociatedObject(window, ChiriWindowControlsObserversKey, nil,
                           OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  objc_setAssociatedObject(window, ChiriWindowControlsContainerKey, nil,
                           OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

static void ChiriPositionWindowButton(NSButton *button, NSPoint origin) {
  if (button == nil) {
    return;
  }

  if (!NSEqualPoints(button.frame.origin, origin)) {
    [button setFrameOrigin:origin];
  }
}

static void ChiriRestoreWindowButton(NSButton *button) {
  if (button == nil) {
    return;
  }

  NSSize nativeSize = button.bounds.size;
  if (nativeSize.width <= 0.0 || nativeSize.height <= 0.0) {
    return;
  }

  NSRect frame = button.frame;
  NSPoint center = NSMakePoint(NSMidX(frame), NSMidY(frame));
  frame.size = nativeSize;
  frame.origin =
      NSMakePoint(center.x - (nativeSize.width / 2.0),
                  center.y - (nativeSize.height / 2.0));
  button.frame = frame;
  button.bounds =
      NSMakeRect(0.0, 0.0, nativeSize.width, nativeSize.height);
}

static void ChiriApplyWindowControls(NSWindow *window, bool integratedTitlebar,
                                     bool captureAnchor);
static void ChiriScheduleWindowControls(NSWindow *window, bool captureAnchor);

static void ChiriInstallWindowControlObservers(
    NSWindow *window, NSArray<NSView *> *observedViews) {
  if (objc_getAssociatedObject(window, ChiriWindowControlsObserversKey) != nil) {
    return;
  }

  NSNotificationCenter *notificationCenter =
      NSNotificationCenter.defaultCenter;
  NSMutableArray *observers = [NSMutableArray array];
  __weak NSWindow *weakWindow = window;

  void (^reapplyWindowControls)(void) = ^{
    NSWindow *strongWindow = weakWindow;
    if (strongWindow == nil ||
        [objc_getAssociatedObject(strongWindow,
                                  ChiriWindowControlsApplyingKey)
            boolValue]) {
      return;
    }

    bool integratedTitlebar =
        [objc_getAssociatedObject(strongWindow, ChiriIntegratedTitlebarKey)
            boolValue];
    ChiriApplyWindowControls(strongWindow, integratedTitlebar, false);
    ChiriScheduleWindowControls(strongWindow, false);
  };

  for (NSView *view in observedViews) {
    view.postsFrameChangedNotifications = YES;
    view.postsBoundsChangedNotifications = YES;

    for (NSNotificationName name in @[
           NSViewFrameDidChangeNotification,
           NSViewBoundsDidChangeNotification,
         ]) {
      id observer =
          [notificationCenter addObserverForName:name
                                          object:view
                                           queue:nil
                                      usingBlock:^(__unused NSNotification *note) {
                                        reapplyWindowControls();
                                      }];
      [observers addObject:observer];
    }
  }

  id windowObserver =
      [notificationCenter addObserverForName:NSWindowDidUpdateNotification
                                      object:window
                                       queue:nil
                                  usingBlock:^(__unused NSNotification *note) {
                                    reapplyWindowControls();
                                  }];
  [observers addObject:windowObserver];

  for (NSNotificationName name in @[
         NSWindowDidResizeNotification,
         NSWindowDidEndLiveResizeNotification,
       ]) {
    id observer =
        [notificationCenter addObserverForName:name
                                        object:window
                                         queue:nil
                                    usingBlock:^(__unused NSNotification *note) {
                                      reapplyWindowControls();
                                    }];
    [observers addObject:observer];
  }

  objc_setAssociatedObject(window, ChiriWindowControlsObserversKey, observers,
                           OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  NSButton *closeButton = [window standardWindowButton:NSWindowCloseButton];
  NSValue *containerPointer =
      [NSValue valueWithPointer:(__bridge const void *)closeButton.superview];
  objc_setAssociatedObject(window, ChiriWindowControlsContainerKey,
                           containerPointer, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

static void ChiriApplyWindowControlsBody(NSWindow *window,
                                         bool integratedTitlebar,
                                         bool captureAnchor) {
  bool isFullscreen =
      (window.styleMask & NSWindowStyleMaskFullScreen) != 0;

  if (!integratedTitlebar || isFullscreen) {
    ChiriRemoveWindowControlObservers(window);
    objc_setAssociatedObject(window, ChiriTrafficLightAnchorKey, nil,
                             OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  }

  window.titleVisibility =
      integratedTitlebar ? NSWindowTitleHidden : NSWindowTitleVisible;
  window.titlebarAppearsTransparent = integratedTitlebar;

  if (isFullscreen) {
    return;
  }

  NSButton *closeButton = [window standardWindowButton:NSWindowCloseButton];
  NSButton *miniaturizeButton = [window standardWindowButton:NSWindowMiniaturizeButton];
  NSButton *zoomButton = [window standardWindowButton:NSWindowZoomButton];

  if (closeButton == nil || miniaturizeButton == nil || zoomButton == nil) {
    return;
  }

  [closeButton.superview layoutSubtreeIfNeeded];

  if (!integratedTitlebar) {
    ChiriRestoreWindowButton(closeButton);
    ChiriRestoreWindowButton(miniaturizeButton);
    ChiriRestoreWindowButton(zoomButton);

    NSView *buttonContainer = closeButton.superview;
    [buttonContainer setNeedsLayout:YES];
    [buttonContainer.superview setNeedsLayout:YES];
    [buttonContainer.superview layoutSubtreeIfNeeded];
    return;
  }

  NSView *buttonContainer = closeButton.superview;
  NSView *contentView = window.contentView;
  if (buttonContainer == nil || contentView == nil) {
    return;
  }
  NSView *titlebarContainer = buttonContainer.superview;
  NSValue *observedButtonContainerValue =
      objc_getAssociatedObject(window, ChiriWindowControlsContainerKey);
  const void *observedButtonContainer =
      observedButtonContainerValue.pointerValue;
  if (observedButtonContainer != NULL &&
      observedButtonContainer != (__bridge const void *)buttonContainer) {
    ChiriRemoveWindowControlObservers(window);
  }

  NSValue *anchorValue =
      objc_getAssociatedObject(window, ChiriTrafficLightAnchorKey);
  if (anchorValue == nil) {
    if (!captureAnchor) {
      return;
    }

    NSPoint insets =
        NSMakePoint(ChiriTrafficLightInsetX, ChiriTitlebarHeight);
    anchorValue = [NSValue valueWithPoint:insets];
    objc_setAssociatedObject(window, ChiriTrafficLightAnchorKey, anchorValue,
                             OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  }

  if (objc_getAssociatedObject(window, ChiriWindowControlsObserversKey) == nil) {
    NSMutableArray<NSView *> *observedViews =
        [NSMutableArray arrayWithObjects:buttonContainer, contentView,
                                           closeButton, miniaturizeButton,
                                           zoomButton, nil];
    if (titlebarContainer != nil) {
      [observedViews addObject:titlebarContainer];
    }
    ChiriInstallWindowControlObservers(window, observedViews);
  }

  NSPoint insets = anchorValue.pointValue;
  if (titlebarContainer != nil) {
    NSRect titlebarFrame = titlebarContainer.frame;
    titlebarFrame.size.height = insets.y;
    titlebarFrame.origin.y = NSHeight(window.frame) - insets.y;
    if (!NSEqualRects(titlebarContainer.frame, titlebarFrame)) {
      titlebarContainer.frame = titlebarFrame;
    }
  }

  CGFloat buttonHeight = NSHeight(closeButton.frame);
  CGFloat y = round((insets.y - buttonHeight) / 2.0);
  CGFloat x = insets.x;

  ChiriPositionWindowButton(closeButton, NSMakePoint(x, y));
  x += NSWidth(closeButton.frame) + ChiriTrafficLightGap;
  ChiriPositionWindowButton(miniaturizeButton, NSMakePoint(x, y));
  x += NSWidth(miniaturizeButton.frame) + ChiriTrafficLightGap;
  ChiriPositionWindowButton(zoomButton, NSMakePoint(x, y));
}

static void ChiriApplyWindowControls(NSWindow *window, bool integratedTitlebar,
                                     bool captureAnchor) {
  if ([objc_getAssociatedObject(window, ChiriWindowControlsApplyingKey)
          boolValue]) {
    return;
  }

  objc_setAssociatedObject(window, ChiriWindowControlsApplyingKey, @YES,
                           OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  ChiriApplyWindowControlsBody(window, integratedTitlebar, captureAnchor);
  objc_setAssociatedObject(window, ChiriWindowControlsApplyingKey, @NO,
                           OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

static void ChiriScheduleWindowControls(NSWindow *window, bool captureAnchor) {
  bool pendingCapture =
      [objc_getAssociatedObject(window, ChiriWindowControlsPendingCaptureKey)
          boolValue];
  objc_setAssociatedObject(window, ChiriWindowControlsPendingCaptureKey,
                           @(pendingCapture || captureAnchor),
                           OBJC_ASSOCIATION_RETAIN_NONATOMIC);

  if ([objc_getAssociatedObject(window, ChiriWindowControlsPendingKey)
          boolValue]) {
    return;
  }

  objc_setAssociatedObject(window, ChiriWindowControlsPendingKey, @YES,
                           OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  dispatch_async(dispatch_get_main_queue(), ^{
    bool shouldCapture =
        [objc_getAssociatedObject(window,
                                  ChiriWindowControlsPendingCaptureKey)
            boolValue];
    objc_setAssociatedObject(window, ChiriWindowControlsPendingKey, @NO,
                             OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    objc_setAssociatedObject(window, ChiriWindowControlsPendingCaptureKey, @NO,
                             OBJC_ASSOCIATION_RETAIN_NONATOMIC);

    bool latestIntegratedTitlebar =
        [objc_getAssociatedObject(window, ChiriIntegratedTitlebarKey)
            boolValue];
    ChiriApplyWindowControls(window, latestIntegratedTitlebar, shouldCapture);
  });
}

void chiri_macos_update_window_controls(void *ns_window, bool integrated_titlebar) {
  if (![NSThread isMainThread] || ns_window == NULL) {
    return;
  }

  NSWindow *window = (__bridge NSWindow *)ns_window;
  objc_setAssociatedObject(window, ChiriIntegratedTitlebarKey,
                           @(integrated_titlebar), OBJC_ASSOCIATION_RETAIN_NONATOMIC);

  ChiriApplyWindowControls(window, integrated_titlebar, false);
  ChiriScheduleWindowControls(window, integrated_titlebar);
}
