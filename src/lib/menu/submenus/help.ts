import { emit } from '@tauri-apps/api/event';
import { MenuItem, Submenu } from '@tauri-apps/api/menu';
import { appLogDir } from '@tauri-apps/api/path';
import { openPath, openUrl } from '@tauri-apps/plugin-opener';
import { MENU_EVENTS } from '$constants/menu';
import { loggers } from '$lib/logger';
import { getAcceleratorOrDefault } from '$lib/menu/accelerators';
import { separator } from '$lib/menu/items';
import { isEnabledOutsideModal } from '$lib/menu/modal';
import type { KeyboardShortcut } from '$types/shortcuts';

const GITHUB_REPO_URL = 'https://github.com/chiriapp/chiri';
const NEW_ISSUE_URL = `${GITHUB_REPO_URL}/issues/new`;
const PRIVACY_POLICY_URL = `${GITHUB_REPO_URL}/blob/master/PRIVACY.md`;

const log = loggers.menu;

/** nowhere to surface a failure, so into the logs it goes */
const run = (action: () => Promise<unknown>) => {
  action().catch((error) => log.error('Help menu action failed:', error));
};

export const createHelpSubmenu = async ({
  shortcuts,
  isModalOpen,
}: {
  shortcuts?: KeyboardShortcut[];
  isModalOpen: boolean;
}) => {
  const isAppActionEnabled = (enabled = true) => isEnabledOutsideModal(isModalOpen, enabled);

  return Submenu.new({
    text: 'Help',
    items: [
      await MenuItem.new({
        id: 'chiri-help',
        text: 'Chiri Help',
        enabled: isAppActionEnabled(),
        action: () => run(() => openUrl(GITHUB_REPO_URL)),
      }),
      await separator(),
      await MenuItem.new({
        id: 'keyboard-shortcuts',
        text: 'Keyboard Shortcuts',
        accelerator: getAcceleratorOrDefault(shortcuts, 'keyboard-shortcuts', 'CmdOrCtrl+/'),
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.SHOW_KEYBOARD_SHORTCUTS);
        },
      }),
      await MenuItem.new({
        id: 'whats-new',
        text: "What's New",
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.SHOW_CHANGELOG);
        },
      }),
      await separator(),
      await MenuItem.new({
        id: 'report-issue',
        text: 'Report an Issue…',
        enabled: isAppActionEnabled(),
        action: () => run(() => openUrl(NEW_ISSUE_URL)),
      }),
      await MenuItem.new({
        id: 'privacy-policy',
        text: 'Privacy Policy',
        enabled: isAppActionEnabled(),
        action: () => run(() => openUrl(PRIVACY_POLICY_URL)),
      }),
      await MenuItem.new({
        id: 'open-logs-folder',
        text: 'Open Logs Folder',
        enabled: isAppActionEnabled(),
        action: () => run(async () => openPath(await appLogDir())),
      }),
    ],
  });
};
