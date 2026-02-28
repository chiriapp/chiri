import { WifiOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { DragOverlay } from '@/components/DragOverlay';
import { Header } from '@/components/Header';
import { AccountModal } from '@/components/modals/AccountModal';
import { CreateCalendarModal } from '@/components/modals/CreateCalendarModal';
import { ExportModal } from '@/components/modals/ExportModal';
import { ImportModal } from '@/components/modals/ImportModal';
import { OnboardingModal } from '@/components/modals/OnboardingModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { UpdateModal } from '@/components/modals/UpdateModal';
import { Sidebar } from '@/components/Sidebar';
import { TaskEditor } from '@/components/TaskEditor';
import { TaskList } from '@/components/TaskList';
import { useAccounts, useSyncQuery, useTasks, useUIState } from '@/hooks/queries';
import { useAppMenu } from '@/hooks/useAppMenu';
import { useFileDrop } from '@/hooks/useFileDrop';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMenuHandlers } from '@/hooks/useMenuHandlers';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/hooks/useTheme';
import { useTray } from '@/hooks/useTray';
import { useUpdateChecker } from '@/hooks/useUpdateChecker';
import { useSettingsStore } from '@/store/settingsStore';
import { initWebKitDragFix } from './utils/webkit';

function App() {
  // Initialize WebKit drag-and-drop fix for Safari/Tauri
  useEffect(() => {
    initWebKitDragFix();
  }, []);

  const [preloadedFile, setPreloadedFile] = useState<{ name: string; content: string } | null>(
    null,
  );
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const { isSyncing, isOffline, lastSyncTime, syncAll } = useSyncQuery();
  const { data: accounts = [] } = useAccounts();
  const {
    sidebarCollapsed,
    sidebarWidth,
    toggleSidebarCollapsed,
    setSidebarWidth,
    onboardingCompleted,
  } = useSettingsStore();

  // show onboarding modal on first launch
  useEffect(() => {
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [onboardingCompleted]);

  // system tray integration (sync button, status updates)
  useTray({
    isSyncing: isSyncing,
    lastSyncTime,
    onSyncRequest: syncAll,
  });

  // app update checker
  const { updateAvailable, downloadAndInstall, dismissUpdate, isDownloading, downloadProgress } =
    useUpdateChecker();

  // app menu state synchronization
  useAppMenu();

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
  } = useFileDrop({
    onFileDrop: (file) => {
      setPreloadedFile(file);
      menuHandlers.setShowImport(true);
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
    <>
      <Toaster
        position="bottom-right"
        expand={false}
        closeButton
        style={{ zIndex: 40 }}
        toastOptions={{
          classNames: {
            toast:
              'group !bg-white dark:!bg-surface-800 !border !border-surface-200 dark:!border-surface-700 !shadow-lg !rounded-lg',
            title: '!text-surface-900 dark:!text-surface-100 !font-semibold',
            description: '!text-surface-600 dark:!text-surface-400',
            actionButton: '!bg-primary-500 hover:!bg-primary-600 !text-white !border-0 !rounded-md',
            cancelButton:
              '!bg-surface-100 dark:!bg-surface-700 hover:!bg-surface-200 dark:hover:!bg-surface-600 !text-surface-700 dark:!text-surface-300 !border-0 !rounded-md',
            closeButton:
              '!bg-surface-100 dark:!bg-surface-700 hover:!bg-surface-200 dark:hover:!bg-surface-600 !text-surface-500 dark:!text-surface-400 !border !border-surface-200 dark:!border-surface-600 !rounded-md',
            success: '!text-green-600 dark:!text-green-500',
            error: '!text-red-600 dark:!text-red-500',
            warning: '!text-amber-600 dark:!text-amber-500',
            info: '!text-blue-600 dark:!text-blue-500',
          },
        }}
      />

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
            isSyncing={isSyncing}
            onSync={syncAll}
            disableSync={accounts.length === 0}
            isOffline={isOffline}
            lastSyncTime={lastSyncTime}
          />

          {isOffline && (
            <div className="flex flex-row items-center text-center justify-center gap-2 p-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
              <WifiOff className="w-5 h-5" />
              <p>You're offline. Changes will sync when you reconnect.</p>
            </div>
          )}

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
        />

        {menuHandlers.showExport && (
          <ExportModal
            tasks={tasks}
            type="tasks"
            onClose={() => menuHandlers.setShowExport(false)}
          />
        )}

        {menuHandlers.showAccountModal && (
          <AccountModal account={null} onClose={() => menuHandlers.setShowAccountModal(false)} />
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
    </>
  );
}

export default App;
