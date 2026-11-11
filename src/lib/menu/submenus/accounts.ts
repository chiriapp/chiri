import { emit } from '@tauri-apps/api/event';
import { MenuItem, type PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { MENU_EVENTS } from '$constants/menu';
import { getAcceleratorOrDefault } from '$lib/menu/accelerators';
import { separator } from '$lib/menu/items';
import { isEnabledOutsideModal } from '$lib/menu/modal';
import { trackMenuItem } from '$lib/menu/state';
import type { MenuAccount } from '$lib/menu/types';
import type { KeyboardShortcut } from '$types/shortcuts';

export const createAccountsSubmenu = async ({
  accounts,
  shortcuts,
  caldavAccountCount,
  isSyncing,
  isModalOpen,
}: {
  accounts: MenuAccount[];
  shortcuts?: KeyboardShortcut[];
  caldavAccountCount: number;
  isSyncing: boolean;
  isModalOpen: boolean;
}) => {
  const isAppActionEnabled = (enabled = true) => isEnabledOutsideModal(isModalOpen, enabled);

  const syncItem = trackMenuItem(
    await MenuItem.new({
      id: 'sync',
      text: 'Sync',
      accelerator: getAcceleratorOrDefault(shortcuts, 'sync', 'CmdOrCtrl+R'),
      enabled: isAppActionEnabled(caldavAccountCount > 0 && !isSyncing),
      action: () => {
        emit(MENU_EVENTS.SYNC);
      },
    }),
  );

  const accountSubmenus = await Promise.all(
    accounts.map(async (account) => {
      const calendars = account.calendars ?? [];
      const calendarSubmenus = await Promise.all(
        calendars.map(async (calendar) =>
          Submenu.new({
            text: calendar.displayName,
            items: [
              await MenuItem.new({
                text: 'Sync',
                enabled: isAppActionEnabled(),
                action: () => {
                  emit(MENU_EVENTS.SYNC_CALENDAR, {
                    calendarId: calendar.id,
                    accountId: account.id,
                  });
                },
              }),
              await MenuItem.new({
                text: 'Edit Calendar',
                enabled: isAppActionEnabled(),
                action: () => {
                  emit(MENU_EVENTS.EDIT_CALENDAR, {
                    calendarId: calendar.id,
                    accountId: account.id,
                  });
                },
              }),
              await MenuItem.new({
                text: 'Export Tasks',
                enabled: isAppActionEnabled(),
                action: () => {
                  emit(MENU_EVENTS.EXPORT_CALENDAR, {
                    calendarId: calendar.id,
                    accountId: account.id,
                  });
                },
              }),
              await separator(),
              await MenuItem.new({
                text: 'Delete Calendar',
                enabled: isAppActionEnabled(),
                action: () => {
                  emit(MENU_EVENTS.DELETE_CALENDAR, {
                    calendarId: calendar.id,
                    accountId: account.id,
                  });
                },
              }),
            ],
          }),
        ),
      );

      const calendarItems: (Submenu | MenuItem | PredefinedMenuItem)[] =
        calendars.length > 0
          ? [await Submenu.new({ text: 'Calendars', items: calendarSubmenus }), await separator()]
          : [];

      return Submenu.new({
        text: account.name,
        items: [
          ...calendarItems,
          await MenuItem.new({
            text: 'New Calendar...',
            enabled: isAppActionEnabled(),
            action: () => {
              emit(MENU_EVENTS.ADD_CALENDAR, { accountId: account.id });
            },
          }),
          await MenuItem.new({
            text: 'Edit Account',
            enabled: isAppActionEnabled(),
            action: () => {
              emit(MENU_EVENTS.EDIT_ACCOUNT, { accountId: account.id });
            },
          }),
          await MenuItem.new({
            text: 'Remove Account',
            enabled: isAppActionEnabled(),
            action: () => {
              emit(MENU_EVENTS.REMOVE_ACCOUNT, { accountId: account.id });
            },
          }),
        ],
      });
    }),
  );

  const accountItems: (Submenu | MenuItem | PredefinedMenuItem)[] =
    accounts.length > 0
      ? [...accountSubmenus, await separator()]
      : [
          await MenuItem.new({
            id: 'no-accounts-added',
            text: 'No accounts added...',
            enabled: false,
          }),
          await separator(),
        ];

  return Submenu.new({
    text: 'Accounts',
    items: [
      syncItem,
      await separator(),
      ...accountItems,
      await MenuItem.new({
        id: 'add-account',
        text: 'Add Account...',
        enabled: isAppActionEnabled(),
        action: () => {
          emit(MENU_EVENTS.ADD_ACCOUNT);
        },
      }),
    ],
  });
};
