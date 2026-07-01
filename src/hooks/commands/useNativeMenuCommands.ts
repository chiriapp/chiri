import { useMemo, useRef } from 'react';
import { useModalState } from '$context/modalStateContext';
import type { AppCommands } from '$hooks/commands/useAppCommands';
import { useMenuEvents } from '$hooks/system/useMenuEvents';

type MenuCallbacks = Parameters<typeof useMenuEvents>[0];

const useLatestRef = <T>(value: T) => {
  const ref = useRef<T>(value);
  ref.current = value;
  return ref;
};

interface UseNativeMenuCommandsOptions {
  commands: AppCommands;
  onSync?: () => void;
  onCheckForUpdates?: () => void;
  onShowChangelog?: () => void;
}

export const useNativeMenuCommands = ({
  commands,
  onSync,
  onCheckForUpdates,
  onShowChangelog,
}: UseNativeMenuCommandsOptions) => {
  const { isAnyModalOpen } = useModalState();

  const onNewTask = useLatestRef(commands.newTask);
  const onOpenSettings = useLatestRef(commands.openSettings);
  const onOpenImport = useLatestRef(commands.openImport);
  const onEditAccount = useLatestRef(commands.editAccount);
  const onOpenAccount = useLatestRef(commands.openAccount);
  const onOpenCreateCalendar = useLatestRef(commands.openCreateCalendar);
  const onSearch = useLatestRef(commands.search);
  const onOpenAbout = useLatestRef(commands.openAbout);
  const onOpenKeyboardShortcuts = useLatestRef(commands.openKeyboardShortcuts);
  const onToggleCompleted = useLatestRef(commands.toggleCompleted);
  const onToggleUnstarted = useLatestRef(commands.toggleUnstarted);
  const onSyncRef = useLatestRef(onSync ?? null);
  const onSetSortMode = useLatestRef(commands.setSortMode);
  const onSetSortDirection = useLatestRef(commands.setSortDirection);
  const onSelectFilter = useLatestRef(commands.selectFilter);
  const onToggleSidebar = useLatestRef(commands.toggleSidebar);
  const onDeleteTask = useLatestRef(commands.deleteTask);
  const onNavPrevList = useLatestRef(commands.navPrevList);
  const onNavNextList = useLatestRef(commands.navNextList);
  const onCheckForUpdatesRef = useLatestRef(isAnyModalOpen ? null : (onCheckForUpdates ?? null));
  const onShowChangelogRef = useLatestRef(isAnyModalOpen ? null : (onShowChangelog ?? null));
  const onRemoveAccount = useLatestRef(commands.removeAccount);
  const onSyncCalendar = useLatestRef(commands.syncCalendar);
  const onEditCalendar = useLatestRef(commands.editCalendar);
  const onExportCalendar = useLatestRef(commands.exportCalendar);
  const onDeleteCalendar = useLatestRef(commands.deleteCalendar);

  const menuCallbacks = useMemo<MenuCallbacks>(
    () => ({
      onNewTask,
      onOpenSettings,
      onOpenImport,
      onEditAccount,
      onOpenAccount,
      onOpenCreateCalendar,
      onSearch,
      onOpenAbout,
      onOpenKeyboardShortcuts,
      onToggleCompleted,
      onToggleUnstarted,
      onSync: onSyncRef,
      onSetSortMode,
      onSetSortDirection,
      onSelectFilter,
      onToggleSidebar,
      onDeleteTask,
      onNavPrevList,
      onNavNextList,
      onCheckForUpdates: onCheckForUpdatesRef,
      onShowChangelog: onShowChangelogRef,
      onRemoveAccount,
      onSyncCalendar,
      onEditCalendar,
      onExportCalendar,
      onDeleteCalendar,
    }),
    [
      onNewTask,
      onOpenSettings,
      onOpenImport,
      onEditAccount,
      onOpenAccount,
      onOpenCreateCalendar,
      onSearch,
      onOpenAbout,
      onOpenKeyboardShortcuts,
      onToggleCompleted,
      onToggleUnstarted,
      onSyncRef,
      onSetSortMode,
      onSetSortDirection,
      onSelectFilter,
      onToggleSidebar,
      onDeleteTask,
      onNavPrevList,
      onNavNextList,
      onCheckForUpdatesRef,
      onShowChangelogRef,
      onRemoveAccount,
      onSyncCalendar,
      onEditCalendar,
      onExportCalendar,
      onDeleteCalendar,
    ],
  );

  useMenuEvents(menuCallbacks);
};
