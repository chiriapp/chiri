#import <AppKit/AppKit.h>
#import <objc/runtime.h>

extern void chiri_macos_dock_menu_item_selected(const char *action);

static NSArray<NSDictionary<NSString *, NSString *> *> *ChiriDockFilters;
static BOOL ChiriDockSyncEnabled = NO;

@interface ChiriDockMenuTarget : NSObject
+ (instancetype)shared;
- (void)performDockMenuAction:(id)sender;
@end

@implementation ChiriDockMenuTarget

+ (instancetype)shared {
  static ChiriDockMenuTarget *target;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    target = [[ChiriDockMenuTarget alloc] init];
  });
  return target;
}

- (void)performDockMenuAction:(id)sender {
  if (![sender isKindOfClass:[NSMenuItem class]]) {
    return;
  }

  NSString *action = ((NSMenuItem *)sender).representedObject;
  if (![action isKindOfClass:[NSString class]]) {
    return;
  }

  chiri_macos_dock_menu_item_selected(action.UTF8String);
}

@end

static NSMenuItem *ChiriDockMenuItem(NSString *title, NSString *action, BOOL enabled) {
  NSMenuItem *item = [[NSMenuItem alloc] initWithTitle:title
                                               action:@selector(performDockMenuAction:)
                                        keyEquivalent:@""];
  item.target = [ChiriDockMenuTarget shared];
  item.representedObject = action;
  item.enabled = enabled;
  return item;
}

static NSMenu *ChiriBuildDockMenu(void) {
  NSMenu *menu = [[NSMenu alloc] initWithTitle:@""];
  menu.autoenablesItems = NO;

  [menu addItem:ChiriDockMenuItem(@"New Task", @"new-task", YES)];
  [menu addItem:ChiriDockMenuItem(@"Sync", @"sync", ChiriDockSyncEnabled)];

  if (ChiriDockFilters.count > 0) {
    [menu addItem:[NSMenuItem separatorItem]];
    [menu addItem:ChiriDockMenuItem(@"Filters", @"", NO)];

    for (NSDictionary<NSString *, NSString *> *filter in ChiriDockFilters) {
      NSString *filterId = filter[@"id"];
      NSString *label = filter[@"label"];
      if (filterId.length == 0 || label.length == 0) {
        continue;
      }

      NSString *action = [@"filter:" stringByAppendingString:filterId];
      [menu addItem:ChiriDockMenuItem(label, action, YES)];
    }
  }

  return menu;
}

static NSMenu *ChiriApplicationDockMenu(id self, SEL _cmd, NSApplication *sender) {
  (void)self;
  (void)_cmd;
  (void)sender;
  return ChiriBuildDockMenu();
}

void chiri_macos_install_dock_menu(void) {
  if (![NSThread isMainThread]) {
    return;
  }

  id delegate = [NSApplication sharedApplication].delegate;
  if (delegate == nil) {
    return;
  }

  Class delegateClass = [delegate class];
  SEL selector = @selector(applicationDockMenu:);
  Method existingMethod = class_getInstanceMethod(delegateClass, selector);
  IMP implementation = (IMP)ChiriApplicationDockMenu;
  const char *types = "@@:@";

  if (existingMethod == NULL) {
    class_addMethod(delegateClass, selector, implementation, types);
  } else {
    class_replaceMethod(delegateClass, selector, implementation, types);
  }
}

void chiri_macos_set_dock_menu_items(
    int syncEnabled,
    int filterCount,
    const char **filterIds,
    const char **filterLabels) {
  NSMutableArray<NSDictionary<NSString *, NSString *> *> *filters =
      [NSMutableArray arrayWithCapacity:MAX(filterCount, 0)];

  for (int i = 0; i < filterCount; i++) {
    const char *filterId = filterIds[i];
    const char *filterLabel = filterLabels[i];
    if (filterId == NULL || filterLabel == NULL) {
      continue;
    }

    NSString *idString = [NSString stringWithUTF8String:filterId];
    NSString *labelString = [NSString stringWithUTF8String:filterLabel];
    if (idString.length == 0 || labelString.length == 0) {
      continue;
    }

    [filters addObject:@{@"id" : idString, @"label" : labelString}];
  }

  ChiriDockFilters = [filters copy];
  ChiriDockSyncEnabled = syncEnabled != 0;
}
