import { useCallback, useEffect, useState } from 'react';
import { DragOverlay } from '$components/DragOverlay';
import { Header } from '$components/Header';
import { AccountModal } from '$components/modals/AccountModal';
import { CreateCalendarModal } from '$components/modals/CreateCalendarModal';
import { ExportModal } from '$components/modals/ExportModal';
import { ImportModal } from '$components/modals/ImportModal';
import { OnboardingModal } from '$components/modals/OnboardingModal';
import { SettingsModal } from '$components/modals/SettingsModal';
import { UpdateModal } from '$components/modals/UpdateModal';
import { OfflineBanner } from '$components/OfflineBanner';
import { Sidebar } from '$components/Sidebar';
import { TaskEditor } from '$components/TaskEditor';
import { TaskList } from '$components/TaskList';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useSyncQuery } from '$hooks/queries/useSync';
import { useTasks } from '$hooks/queries/useTasks';
import { useUIState } from '$hooks/queries/useUIState';
import { useAppMenu } from '$hooks/useAppMenu';
import { useFileDrop } from '$hooks/useFileDrop';
import { useKeyboardShortcuts } from '$hooks/useKeyboardShortcuts';
import { useMenuHandlers } from '$hooks/useMenuHandlers';
import { useNotifications } from '$hooks/useNotifications';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { useTheme } from '$hooks/useTheme';
import { useTray } from '$hooks/useTray';
import { useUpdateChecker } from '$hooks/useUpdateChecker';
import type { CalDAVConfig } from '$utils/mobileconfig';
import { initWebKitDragFix } from '$utils/webkit';

const App = () => {
  // Initialize WebKit drag-and-drop fix for Safari/Tauri
  useEffect(() => {
    initWebKitDragFix();
  }, []);

  const [preloadedFile, setPreloadedFile] = useState<{ name: string; content: string } | null>(
    null,
  );
  const [preloadedConfig, setPreloadedConfig] = useState<CalDAVConfig | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const { isSyncing, syncingCalendarId, isOffline, lastSyncTime, syncAll } = useSyncQuery();
  const { data: accounts = [] } = useAccounts();
  const {
    sidebarCollapsed,
    sidebarWidth,
    toggleSidebarCollapsed,
    setSidebarWidth,
    onboardingCompleted,
    syncOnReconnect,
  } = useSettingsStore();

  // show onboarding modal on first launch
  useEffect(() => {
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [onboardingCompleted]);

  // system tray integration (sync button, status updates)
  useTray({
    isSyncing: isSyncing || syncingCalendarId !== null,
    lastSyncTime,
    onSyncRequest: syncAll,
  });

  // app update checker
  const { updateAvailable, downloadAndInstall, dismissUpdate, isDownloading, downloadProgress } =
    useUpdateChecker();

  // app menu state synchronization
  useAppMenu(isSyncing || syncingCalendarId !== null);

  // menu handlers and modal state
  const menuHandlers = useMenuHandlers();

  // file drop handling via hook
  const {
    isDragOver,
    isUnsupportedFile,
    handleFileDrop,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    clearDragState,
  } = useFileDrop({
    onFileDrop: (file) => {
      setPreloadedFile(file);
      menuHandlers.setShowImport(true);
    },
    onConfigProfileDrop: (config) => {
      setPreloadedConfig(config);
      menuHandlers.setShowAccountModal(true);
    },
  });

  useTheme();
  useNotifications();

  useKeyboardShortcuts({
    onOpenSettings: () => {
      menuHandlers.setSettingsInitialTab({});
      menuHandlers.setShowSettings((prev: boolean) => !prev);
    },
    onSync: syncAll,
  });

  const { data: uiState } = useUIState();
  const { data: tasks = [] } = useTasks();
  const isEditorOpen = uiState?.isEditorOpen ?? false;
  const selectedTaskId = uiState?.selectedTaskId ?? null;
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  // reset preloaded file when import modal closes
  const handleImportClose = useCallback(() => {
    menuHandlers.setShowImport(false);
    setPreloadedFile(null);
  }, [menuHandlers]);

  // disable default browser context menu globally
  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // allow custom context menus and native context menus for input/textarea elements
    if (
      !target.closest('[data-context-menu]') &&
      target.tagName !== 'INPUT' &&
      target.tagName !== 'TEXTAREA'
    ) {
      e.preventDefault();
    }
  };

  return (
    <div
      role="application"
      className="flex h-screen bg-surface-50 dark:bg-surface-900 overflow-hidden"
      onContextMenu={handleContextMenu}
      onDrop={handleFileDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {isDragOver && <DragOverlay isUnsupportedFile={isUnsupportedFile} />}

      <Sidebar
        onOpenSettings={menuHandlers.handleOpenSettings}
        onOpenImport={() => menuHandlers.setShowImport(true)}
        isCollapsed={sidebarCollapsed}
        width={sidebarWidth}
        onToggleCollapse={toggleSidebarCollapsed}
        onWidthChange={setSidebarWidth}
        updateAvailable={!!updateAvailable}
        onUpdateClick={() => setShowUpdateModal(true)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          isSyncing={isSyncing || syncingCalendarId !== null}
          onSync={syncAll}
          disableSync={accounts.length === 0}
          isOffline={isOffline}
          lastSyncTime={lastSyncTime}
        />

        <OfflineBanner isOffline={isOffline} syncOnReconnect={syncOnReconnect} />

        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div
            className={`flex-1 flex flex-col min-w-0 min-h-0 ${isEditorOpen && selectedTask ? 'hidden lg:flex' : ''}`}
          >
            <TaskList />
          </div>

          {isEditorOpen && selectedTask && (
            <div className="w-full lg:w-[400px] flex-shrink-0 border-l border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
              <TaskEditor task={selectedTask} />
            </div>
          )}
        </div>
      </main>

      {menuHandlers.showSettings && (
        <SettingsModal
          onClose={() => {
            menuHandlers.setShowSettings(false);
            menuHandlers.setSettingsInitialTab({});
          }}
          initialCategory={menuHandlers.settingsInitialTab.category}
          initialSubtab={menuHandlers.settingsInitialTab.subtab}
        />
      )}

      <ImportModal
        isOpen={menuHandlers.showImport}
        onClose={handleImportClose}
        preloadedFile={preloadedFile}
        onFileDrop={clearDragState}
      />

      {menuHandlers.showExport && (
        <ExportModal tasks={tasks} type="tasks" onClose={() => menuHandlers.setShowExport(false)} />
      )}

      {menuHandlers.showAccountModal && (
        <AccountModal
          account={
            menuHandlers.editingAccountId
              ? accounts.find((a) => a.id === menuHandlers.editingAccountId) || null
              : null
          }
          preloadedConfig={preloadedConfig || undefined}
          onClose={() => {
            menuHandlers.setShowAccountModal(false);
            menuHandlers.setEditingAccountId(null);
            setPreloadedConfig(null);
          }}
        />
      )}

      {menuHandlers.showCreateCalendar && accounts.length > 0 && (
        <CreateCalendarModal
          accountId={accounts[0].id}
          onClose={() => menuHandlers.setShowCreateCalendar(false)}
        />
      )}

      {menuHandlers.showCreateCalendar &&
        accounts.length === 0 &&
        (() => {
          menuHandlers.setShowCreateCalendar(false);
          return null;
        })()}

      {showOnboarding && (
        <OnboardingModal
          onComplete={() => setShowOnboarding(false)}
          onAddAccount={() => {
            menuHandlers.setShowAccountModal(true);
          }}
        />
      )}

      {showUpdateModal && updateAvailable && (
        <UpdateModal
          updateInfo={updateAvailable}
          onDownload={downloadAndInstall}
          onDismiss={() => {
            dismissUpdate();
            setShowUpdateModal(false);
          }}
          onClose={() => setShowUpdateModal(false)}
          isDownloading={isDownloading}
          downloadProgress={downloadProgress}
        />
      )}
    </div>
  );
};

export default App;
