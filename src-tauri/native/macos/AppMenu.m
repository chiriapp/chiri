#import <AppKit/AppKit.h>

static NSImage *ChiriFallbackSelectAllMenuIcon(void) {
  const CGFloat size = 16.0;
  NSImage *image =
      [NSImage imageWithSize:NSMakeSize(size, size)
                     flipped:NO
            drawingHandler:^BOOL(NSRect dstRect) {
              NSBezierPath *outline = [NSBezierPath
                  bezierPathWithRect:NSMakeRect(2.0, 2.0, 12.0, 12.0)];
              CGFloat dashPattern[] = {1.0, 1.0};
              [outline setLineDash:dashPattern count:2 phase:0.0];
              [outline setLineWidth:1.0];
              [[NSColor blackColor] setStroke];
              [outline stroke];

              NSBezierPath *anchor = [NSBezierPath
                  bezierPathWithRect:NSMakeRect(4.0, 9.0, 4.0, 4.0)];
              [[NSColor blackColor] setFill];
              [anchor fill];

              return YES;
            }];
  [image setTemplate:YES];
  return image;
}

static NSImage *ChiriSelectAllMenuIcon(void) {
  if (@available(macOS 15.0, *)) {
    NSImage *image = [NSImage
        imageWithSystemSymbolName:@"character.textbox"
            accessibilityDescription:nil];
    if (image != nil) {
      [image setTemplate:YES];
      return image;
    }
  }
  return ChiriFallbackSelectAllMenuIcon();
}

static NSMenuItem *ChiriFindSelectAllItemInMenu(NSMenu *menu) {
  NSMenuItem *item = [menu itemWithTitle:@"Select All"];
  if (item != nil) {
    return item;
  }

  for (NSMenuItem *candidate in menu.itemArray) {
    if ([candidate.keyEquivalent isEqualToString:@"a"] &&
        (candidate.keyEquivalentModifierMask & NSEventModifierFlagCommand) ==
            NSEventModifierFlagCommand) {
      return candidate;
    }
  }

  return nil;
}

void chiri_macos_fix_select_all_menu_item(void) {
  if (![NSThread isMainThread]) {
    return;
  }

  NSMenu *mainMenu = [NSApplication sharedApplication].mainMenu;
  NSMenuItem *editItem = [mainMenu itemWithTitle:@"Edit"];
  NSMenu *editMenu = editItem.submenu;
  if (editMenu == nil) {
    return;
  }

  NSMenuItem *selectAllItem = ChiriFindSelectAllItemInMenu(editMenu);
  if (selectAllItem != nil) {
    selectAllItem.image = ChiriSelectAllMenuIcon();
  }
}

void chiri_macos_fix_help_menu(void) {
  if (![NSThread isMainThread]) {
    return;
  }

  NSMenu *mainMenu = [NSApplication sharedApplication].mainMenu;
  NSMenuItem *helpItem = [mainMenu itemWithTitle:@"Help"];
  NSMenu *helpSubmenu = helpItem.submenu;
  if (helpSubmenu == nil) {
    return;
  }

  [[NSApplication sharedApplication] setHelpMenu:helpSubmenu];
}

int chiri_macos_current_event_is_key_down(void) {
  NSEvent *event = [NSApplication sharedApplication].currentEvent;
  return event != nil && event.type == NSEventTypeKeyDown ? 1 : 0;
}
