import { AppModals } from '$components/AppModals';
import { AppShell } from '$components/AppShell';
import { useModalState } from '$context/modalStateContext';
import { useSettingsStore } from '$context/settingsContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useSyncQuery } from '$hooks/queries/useSync';
import { useTasks } from '$hooks/queries/useTasks';
import { useTaskEditorResize } from '$hooks/ui/useTaskEditorResize';
import { useVisibleEditorTask } from '$hooks/ui/useVisibleEditorTask';
import { useAppController } from '$hooks/useAppController';
import { useAppFileDrop } from '$hooks/useAppFileDrop';
import { useAppImageIntegration } from '$hooks/useAppImageIntegration';
import { useAppLifecycle } from '$hooks/useAppLifecycle';
import { useAppSyncActions } from '$hooks/useAppSyncActions';
import { useAppUpdates } from '$hooks/useAppUpdates';
import { useOnboardingVisibility } from '$hooks/useOnboardingVisibility';

const App = () => {
  const { data: accounts = [], isPending: accountsPending } = useAccounts();
  const { data: tasks = [], isPending: tasksPending } = useTasks();
  const {
    isSyncing,
    syncingCalendarId,
    syncProgress,
    isOffline,
    isReconnecting,
    lastSyncTime,
    lastSyncSource,
    syncAll,
    syncCalendar,
  } = useSyncQuery();
  const {
    sidebarCollapsed,
    sidebarWidth,
    toggleSidebarCollapsed,
    setSidebarWidth,
    taskEditorWidth,
    setTaskEditorWidth,
    onboardingCompleted,
    syncOnReconnect,
  } = useSettingsStore();

  const updates = useAppUpdates();
  const { setShowUpdateModal, updateAvailable, checkForUpdatesFromMenu, showChangelogFromMenu } =
    updates;
  const { syncFromHeader, syncFromTray, syncFromKeyboard, syncFromMenu, syncCalendarFromMenu } =
    useAppSyncActions({ syncAll, syncCalendar });
  const { handleResizeStart: handleEditorResizeStart } = useTaskEditorResize(setTaskEditorWidth);

  const showOnboarding = useOnboardingVisibility({
    onboardingCompleted,
    accountsPending,
    tasksPending,
    accounts,
    tasks,
  });
  const appImageIntegration = useAppImageIntegration();

  // derived app state used by the shell and global integrations
  const isSyncInProgress = isSyncing || syncingCalendarId !== null;
  const hasCalDAVAccounts = accounts.some((account) => account.caldav);
  const visibleTask = useVisibleEditorTask(tasks);

  const { modals, modalActions, commands } = useAppController(
    syncFromMenu,
    checkForUpdatesFromMenu,
    showChangelogFromMenu,
    syncCalendarFromMenu,
  );
  const { showImport } = modals;
  const { openSettings, toggleSettings, openImport, closeImport, openAccount } = modalActions;

  const { isAnyModalOpen } = useModalState();

  const fileDrop = useAppFileDrop({
    isAnyModalOpen,
    isImportOpen: showImport,
    openImport,
    closeImport,
    openAccount,
  });
  const { canHandleGlobalFileDrop, isDragOver, isUnsupportedFile, rootFileDropProps } = fileDrop;

  useAppLifecycle({
    isSyncInProgress,
    lastSyncTime,
    onKeyboardSync: syncFromKeyboard,
    onOpenImport: () => openImport(),
    onOpenKeyboardShortcuts: () =>
      toggleSettings({ category: 'app', subtab: 'keyboard-shortcuts' }),
    onOpenSettings: () => toggleSettings(),
    onOpenTaskActions: commands.openTaskActions,
    onSyncCalendar: syncCalendar,
    onTraySync: syncFromTray,
  });

  return (
    <AppShell
      canHandleGlobalFileDrop={canHandleGlobalFileDrop}
      disableSync={!hasCalDAVAccounts}
      isDragOver={isDragOver}
      isOffline={isOffline}
      isReconnecting={isReconnecting}
      isSyncInProgress={isSyncInProgress}
      isUnsupportedFile={isUnsupportedFile}
      lastSyncSource={lastSyncSource}
      lastSyncTime={lastSyncTime}
      onEditorResizeStart={handleEditorResizeStart}
      onOpenImport={openImport}
      onOpenNotificationSettings={() => {
        openSettings({ category: 'app', subtab: 'notifications' });
      }}
      onOpenSettings={commands.openSettings}
      onSidebarWidthChange={setSidebarWidth}
      onSync={syncFromHeader}
      onToggleSidebarCollapsed={toggleSidebarCollapsed}
      onUpdateClick={() => setShowUpdateModal(true)}
      rootFileDropProps={rootFileDropProps}
      sidebarCollapsed={sidebarCollapsed}
      sidebarWidth={sidebarWidth}
      syncingCalendarId={syncingCalendarId}
      syncOnReconnect={syncOnReconnect}
      syncProgress={syncProgress}
      taskEditorWidth={taskEditorWidth}
      updateAvailable={!!updateAvailable}
      visibleTask={visibleTask}
    >
      <AppModals
        accounts={accounts}
        fileDrop={fileDrop}
        modals={modals}
        modalActions={modalActions}
        onboarding={{ show: showOnboarding, hasCalDAVAccounts }}
        appImageIntegration={{
          show: appImageIntegration.showPrompt && !showOnboarding,
          isIntegrating: appImageIntegration.isIntegrating,
          error: appImageIntegration.error,
          onIntegrate: appImageIntegration.integrate,
          onSkip: appImageIntegration.skip,
        }}
        updates={updates}
      />
    </AppShell>
  );
};

export default App;
