#import <AppKit/AppKit.h>

static id ChiriCmdQEventMonitor;

extern void chiri_macos_cmd_q_pressed(void);

void chiri_macos_install_cmd_q_monitor(void) {
  if (ChiriCmdQEventMonitor != nil) {
    return;
  }

  ChiriCmdQEventMonitor = [NSEvent
      addLocalMonitorForEventsMatchingMask:NSEventMaskKeyDown
                                    handler:^NSEvent *(NSEvent *event) {
                                      NSEventModifierFlags modifiers =
                                          event.modifierFlags &
                                          NSEventModifierFlagDeviceIndependentFlagsMask;
                                      NSEventModifierFlags extraModifiers =
                                          NSEventModifierFlagShift |
                                          NSEventModifierFlagOption |
                                          NSEventModifierFlagControl |
                                          NSEventModifierFlagFunction;

                                      if (event.keyCode == 12 &&
                                          (modifiers & NSEventModifierFlagCommand) != 0 &&
                                          (modifiers & extraModifiers) == 0) {
                                        chiri_macos_cmd_q_pressed();
                                        return nil;
                                      }

                                      return event;
                                    }];
}

static NSImage *ChiriFallbackSelectAllMenuIcon(void) {
  const CGFloat size = 16.0;
  NSImage *image =
      [NSImage imageWithSize:NSMakeSize(size, size)
                     flipped:NO
            drawingHandler:^BOOL(NSRect __attribute__((unused)) dstRect) {
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
  // `character.textbox` is only present on macOS 15.0+; calling the method on
  // older versions (or with an unknown symbol) simply returns nil, so we use
  // the fallback icon when that happens.
  NSImage *image = [NSImage
      imageWithSystemSymbolName:@"character.textbox"
          accessibilityDescription:nil];
  if (image != nil) {
    [image setTemplate:YES];
    return image;
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

static void ChiriApplySectionHeader(NSString *submenuTitle, NSString *headerTitle)
    API_AVAILABLE(macos(14.0)) {
  NSMenu *mainMenu = [NSApplication sharedApplication].mainMenu;
  NSMenu *submenu = [mainMenu itemWithTitle:submenuTitle].submenu;
  if (submenu == nil) {
    return;
  }

  // submenu contents are replaced in place, so drop the header inserted last
  // time before looking for its placeholder
  for (NSMenuItem *item in submenu.itemArray) {
    if (item.isSectionHeader && [submenu indexOfItem:item] != -1) {
      [submenu removeItem:item];
    }
  }

  // muda has no section header item type, so the frontend ships a disabled
  // placeholder. its slot gets a real header and the placeholder is hidden
  // rather than removed, because muda still expects to find it in the menu
  for (NSMenuItem *item in submenu.itemArray) {
    if (item.submenu != nil || item.isSectionHeader) {
      continue;
    }
    if (![item.title isEqualToString:headerTitle]) {
      continue;
    }

    [item setHidden:YES];
    [submenu insertItem:[NSMenuItem sectionHeaderWithTitle:headerTitle]
                atIndex:[submenu indexOfItem:item]];
    return;
  }
}

void chiri_macos_apply_section_headers(void) {
  if (![NSThread isMainThread]) {
    return;
  }

  // section header items only exist from macOS 14; older systems keep the
  // disabled placeholders the frontend creates
  if (@available(macOS 14.0, *)) {
    ChiriApplySectionHeader(@"View", @"Tasks");
    ChiriApplySectionHeader(@"Go", @"Views");
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
