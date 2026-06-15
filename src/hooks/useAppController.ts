import { useAppCommands } from '$hooks/commands/useAppCommands';
import { useNativeMenuCommands } from '$hooks/commands/useNativeMenuCommands';
import { useAppModals } from '$hooks/useAppModals';

export const useAppController = (
  onSync?: () => void,
  onCheckForUpdates?: () => void,
  onShowChangelog?: () => void,
  onSyncCalendar?: (calendarId: string) => void,
) => {
  const modals = useAppModals();
  const {
    showSettings,
    settingsInitialTab,
    showImport,
    showAccountModal,
    editingAccountId,
    accountModalZIndex,
    showCreateCalendar,
    createCalendarAccountId,
    showCalendarModal,
    editingCalendar,
    showExportModal,
    exportCalendarId,
    showTaskActions,
    taskActionsId,
    openSettings,
    toggleSettings,
    closeSettings,
    openImport,
    closeImport,
    openAccount,
    closeAccount,
    openCreateCalendar,
    closeCreateCalendar,
    openCalendar,
    closeCalendar,
    openExport,
    closeExport,
    openTaskActions,
    closeTaskActions,
    openMobileConfigExport,
    closeMobileConfigExport,
    mobileConfigAccountId,
  } = modals;
  const commands = useAppCommands({ modals, onSyncCalendar });
  useNativeMenuCommands({
    commands,
    onSync,
    onCheckForUpdates,
    onShowChangelog,
  });

  return {
    modals: {
      showSettings,
      showImport,
      showAccountModal,
      accountModalZIndex,
      editingAccountId,
      showCreateCalendar,
      settingsInitialTab,
      showTaskActions,
      taskActionsId,
      createCalendarAccountId,
      showCalendarModal,
      editingCalendar,
      showExportModal,
      exportCalendarId,
      mobileConfigAccountId,
    },
    modalActions: {
      openSettings,
      toggleSettings,
      closeSettings,
      openImport,
      closeImport,
      openAccount,
      closeAccount,
      openCreateCalendar,
      closeCreateCalendar,
      openCalendar,
      closeCalendar,
      openExport,
      closeExport,
      openTaskActions,
      closeTaskActions,
      openMobileConfigExport,
      closeMobileConfigExport,
    },
    commands: {
      openSettings: commands.openSettings,
      openTaskActions: commands.openTaskActions,
    },
  };
};
