import AppKit
import Foundation

@_cdecl("chiri_macos_fix_help_menu")
public func chiriMacOSFixHelpMenu() {
    guard Thread.isMainThread,
          let mainMenu = NSApplication.shared.mainMenu,
          let helpItem = mainMenu.item(withTitle: "Help"),
          let helpSubmenu = helpItem.submenu
    else {
        return
    }

    NSApplication.shared.helpMenu = helpSubmenu
}

@_cdecl("chiri_macos_current_event_is_key_down")
public func chiriMacOSCurrentEventIsKeyDown() -> Int32 {
    NSApplication.shared.currentEvent?.type == .keyDown ? 1 : 0
}
