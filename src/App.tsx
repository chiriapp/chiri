import { getVersion } from '@tauri-apps/api/app';
import { useCallback, useEffect, useState } from 'react';

import { DragOverlay } from '$components/DragOverlay';
import { Header } from '$components/header/Header';

import { AccountModal } from '$components/modals/account/AccountModal';
import { CalendarModal } from '$components/modals/CalendarModal';
import { ChangelogModal } from '$components/modals/ChangelogModal';
import { ExportModal } from '$components/modals/ExportModal';
import { ImportModal } from '$components/modals/import/ImportModal';
import { OnboardingModal } from '$components/modals/OnboardingModal';
import { SettingsModal } from '$components/modals/SettingsModal';
import { TaskActionsModal } from '$components/modals/TaskActionsModal';
import { UpdateModal } from '$components/modals/UpdateModal';

import { OfflineBanner } from '$components/OfflineBanner';
import { Sidebar } from '$components/sidebar/Sidebar';
import { TaskList } from '$components/TaskList';
import { TaskEditor } from '$components/taskEditor/TaskEditor';

import { MAX_EDITOR_WIDTH, MIN_EDITOR_WIDTH } from '$constants';

import { useAccounts } from '$hooks/queries/useAccounts';
import { useSyncQuery } from '$hooks/queries/useSync';
import { useTasks } from '$hooks/queries/useTasks';
import { useUIState } from '$hooks/queries/useUIState';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { useConfirmQuit } from '$hooks/system/useConfirmQuit';
import { useDeepLink } from '$hooks/system/useDeepLink';
import { useFileDrop } from '$hooks/system/useFileDrop';
import { useNotifications } from '$hooks/system/useNotifications';
import { useTray } from '$hooks/system/useTray';
import { useUpdateChecker } from '$hooks/system/useUpdateChecker';
import { useKeyboardShortcuts } from '$hooks/ui/useKeyboardShortcuts';
import { useTheme } from '$hooks/ui/useTheme';
import { toastManager } from '$hooks/ui/useToast';
import { useAppMenu } from '$hooks/useAppMenu';
import { useChangelog } from '$hooks/useChangelog';
import { useMenuHandlers } from '$hooks/useMenuHandlers';
import { useWebDAVPush } from '$hooks/useWebDAVPush';

import { getTasksByCalendar } from '$lib/store/tasks';

import type { CalDAVConfig } from '$utils/mobileconfig';

const App = () => {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const { openChangelog, closeChangelog, changelogData } = useChangelog();

  const [preloadedFile, setPreloadedFile] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const [preloadedConfig, setPreloadedConfig] = useState<CalDAVConfig | null>(null);

  const { isSyncing, syncingCalendarId, isOffline, lastSyncTime, syncAll, syncCalendar } =
    useSyncQuery();

  // WebDAV Push: triggers sync when server sends push messages
  useWebDAVPush({ onSyncCalendar: syncCalendar, lastSyncTime });

  // app update checker (hoisted above callbacks that reference updateAvailable)
  const {
    updateAvailable,
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
    isDownloading,
    downloadProgress,
  } = useUpdateChecker();
  const handleHeaderSync = useCallback(() => {
    syncAll({
      source: 'header-sync-button',
      reason: 'user clicked sync in header',
      where: 'App Header.onSync',
    });
  }, [syncAll]);

  const handleTraySync = useCallback(() => {
    syncAll({
      source: 'tray-sync',
      reason: 'user clicked sync from system tray',
      where: 'useTray tray-sync event',
    });
  }, [syncAll]);

  const handleKeyboardSync = useCallback(() => {
    syncAll({
      source: 'keyboard-shortcut',
      reason: 'user pressed keyboard shortcut for sync',
      where: 'useKeyboardShortcuts',
    });
  }, [syncAll]);

  const handleMenuShowChangelog = useCallback(async () => {
    toastManager.info('Loading release notes...', '', 'changelog-loading', undefined, false);
    if (updateAvailable?.body) {
      await openChangelog(updateAvailable.version, updateAvailable.body);
      toastManager.dismiss('changelog-loading');
      return;
    }
    const version = await getVersion();
    await openChangelog(version);
    toastManager.dismiss('changelog-loading');
  }, [updateAvailable, openChangelog]);

  const handleMenuSync = useCallback(() => {
    syncAll({
      source: 'app-menu',
      reason: 'user selected Sync from app menu',
      where: 'useMenuEvents MENU_EVENTS.SYNC',
    });
  }, [syncAll]);

  const handleMenuSyncCalendar = useCallback(
    (calendarId: string) => {
      syncCalendar(calendarId, {
        source: 'app-menu',
        reason: 'user selected sync calendar from app menu',
        where: 'useMenuEvents MENU_EVENTS.SYNC_CALENDAR',
      });
    },
    [syncCalendar],
  );

  const handleCheckForUpdates = useCallback(() => {
    checkForUpdates('menu-manual', () => setShowUpdateModal(true));
  }, [checkForUpdates]);

  const { data: accounts = [], isPending: accountsPending } = useAccounts();
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

  const [isEditorResizing, setIsEditorResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isEditorResizing) return;
      const newWidth = Math.min(
        MAX_EDITOR_WIDTH,
        Math.max(MIN_EDITOR_WIDTH, window.innerWidth - e.clientX),
      );
      setTaskEditorWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsEditorResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    if (isEditorResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isEditorResizing, setTaskEditorWidth]);

  const showOnboarding = !onboardingCompleted && !accountsPending && accounts.length === 0;

  // system tray integration (sync button, status updates)
  useTray({
    isSyncing: isSyncing || syncingCalendarId !== null,
    lastSyncTime,
    onSyncRequest: handleTraySync,
  });

  // app menu state synchronization
  useAppMenu(isSyncing || syncingCalendarId !== null);

  // menu handlers and modal state
  const menuHandlers = useMenuHandlers(
    handleMenuSync,
    handleCheckForUpdates,
    handleMenuShowChangelog,
    handleMenuSyncCalendar,
  );

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
    // only process file drops when import modal is NOT open
    // when modal is open, the modal handles its own drops
    onFileDrop: (file) => {
      if (menuHandlers.showImport) return;
      setPreloadedFile(file);
      menuHandlers.setShowImport(true);
    },
    onConfigProfileDrop: (config) => {
      if (menuHandlers.showImport) return;
      setPreloadedConfig(config);
      menuHandlers.setShowAccountModal(true);
    },
  });

  useTheme();
  useConfirmQuit();
  useDeepLink();
  useNotifications({
    onOpenTaskActions: menuHandlers.handleOpenTaskActions,
  });

  useKeyboardShortcuts({
    onOpenSettings: () => {
      menuHandlers.setSettingsInitialTab({});
      menuHandlers.setShowSettings((prev: boolean) => !prev);
    },
    onOpenKeyboardShortcuts: () => {
      menuHandlers.setSettingsInitialTab({
        category: 'app',
        subtab: 'keyboard-shortcuts',
      });
      menuHandlers.setShowSettings((prev: boolean) => !prev);
    },
    onSync: handleKeyboardSync,
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
      {isDragOver && !menuHandlers.showImport && (
        <DragOverlay isUnsupportedFile={isUnsupportedFile} />
      )}

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
          onSync={handleHeaderSync}
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
            <div
              className="relative flex-1 lg:flex-none lg:border-l border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden"
              style={{ width: taskEditorWidth }}
            >
              {/* biome-ignore lint/a11y/noStaticElementInteractions: Resize handle requires mouse events for drag functionality */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsEditorResizing(true);
                  document.body.style.cursor = 'col-resize';
                  document.body.style.userSelect = 'none';
                }}
                className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-primary-400 dark:hover:bg-primary-600 transition-colors z-10"
              />
              <TaskEditor
                task={selectedTask}
                onOpenNotificationSettings={() => {
                  menuHandlers.setSettingsInitialTab({ category: 'app', subtab: 'notifications' });
                  menuHandlers.setShowSettings(true);
                }}
              />
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

      {menuHandlers.showAccountModal && (
        <AccountModal
          account={
            menuHandlers.editingAccountId
              ? (accounts.find((a) => a.id === menuHandlers.editingAccountId) ?? null)
              : null
          }
          preloadedConfig={preloadedConfig ?? undefined}
          onClose={() => {
            menuHandlers.setShowAccountModal(false);
            menuHandlers.setEditingAccountId(null);
            setPreloadedConfig(null);
          }}
        />
      )}

      {menuHandlers.showCreateCalendar && menuHandlers.createCalendarAccountId && (
        <CalendarModal
          accountId={menuHandlers.createCalendarAccountId}
          onClose={() => menuHandlers.setShowCreateCalendar(false)}
        />
      )}

      {menuHandlers.showCalendarModal &&
        menuHandlers.editingCalendar &&
        (() => {
          const { calendarId, accountId } = menuHandlers.editingCalendar;
          const account = accounts.find((a) => a.id === accountId);
          const calendar = account?.calendars.find((c) => c.id === calendarId);
          return calendar ? (
            <CalendarModal
              calendar={calendar}
              accountId={accountId}
              onClose={() => {
                menuHandlers.setShowCalendarModal(false);
                menuHandlers.setEditingCalendar(null);
              }}
            />
          ) : null;
        })()}

      {menuHandlers.showExportModal &&
        menuHandlers.exportCalendarId &&
        (() => {
          const calendarId = menuHandlers.exportCalendarId;
          const calendar = accounts.flatMap((a) => a.calendars).find((c) => c.id === calendarId);
          return (
            <ExportModal
              tasks={getTasksByCalendar(calendarId)}
              type="single-calendar"
              calendarName={calendar?.displayName}
              fileName={calendar?.displayName.replace(/[^a-z0-9]/gi, '-').toLowerCase() ?? 'export'}
              onClose={() => {
                menuHandlers.setShowExportModal(false);
                menuHandlers.setExportCalendarId(null);
              }}
            />
          );
        })()}

      {menuHandlers.showTaskActions && menuHandlers.taskActionsId && (
        <TaskActionsModal
          isOpen={menuHandlers.showTaskActions}
          taskId={menuHandlers.taskActionsId}
          onClose={() => {
            menuHandlers.setShowTaskActions(false);
            menuHandlers.setTaskActionsId(null);
          }}
        />
      )}

      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {}}
          onAddAccount={() => {
            menuHandlers.setShowAccountModal(true);
          }}
        />
      )}

      {changelogData && (
        <ChangelogModal
          version={changelogData.version}
          changelog={changelogData.body}
          onClose={closeChangelog}
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
