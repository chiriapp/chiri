import { invoke } from '@tauri-apps/api/core';
import {
  type DragEventHandler,
  type MouseEventHandler,
  type ReactNode,
  useEffect,
  useRef,
} from 'react';
import { DragOverlay } from '$components/DragOverlay';
import { Header } from '$components/header/Header';
import { OfflineBanner } from '$components/OfflineBanner';
import { Sidebar } from '$components/sidebar/Sidebar';
import { TaskList } from '$components/TaskList';
import { TaskEditor } from '$components/taskEditor/TaskEditor';
import { useSettingsStore } from '$context/settingsContext';
import { useWindowFullscreen } from '$hooks/system/useWindowFullscreen';
import type { Task } from '$types';
import { isMacPlatform } from '$utils/platform';

interface AppShellProps {
  children: ReactNode;
  rootFileDropProps: {
    onDrop: DragEventHandler<HTMLDivElement>;
    onDragOver: DragEventHandler<HTMLDivElement>;
    onDragEnter: DragEventHandler<HTMLDivElement>;
    onDragLeave: DragEventHandler<HTMLDivElement>;
  };
  isDragOver: boolean;
  canHandleGlobalFileDrop: boolean;
  isUnsupportedFile: boolean;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  onOpenSettings: () => void;
  onOpenImport: () => void;
  onToggleSidebarCollapsed: () => void;
  onSidebarWidthChange: (width: number) => void;
  updateAvailable: boolean;
  onUpdateClick: () => void;
  isSyncInProgress: boolean;
  syncingCalendarId: string | null;
  syncProgress: { current: number; total: number } | null;
  onSync: () => void;
  disableSync: boolean;
  isOffline: boolean;
  lastSyncTime: Date | null;
  lastSyncSource: string | null;
  syncOnReconnect: boolean;
  visibleTask: Task | null;
  taskEditorWidth: number;
  onEditorResizeStart: MouseEventHandler<HTMLDivElement>;
  onOpenNotificationSettings: () => void;
}

export const AppShell = ({
  children,
  rootFileDropProps,
  isDragOver,
  canHandleGlobalFileDrop,
  isUnsupportedFile,
  sidebarCollapsed,
  sidebarWidth,
  onOpenSettings,
  onOpenImport,
  onToggleSidebarCollapsed,
  onSidebarWidthChange,
  updateAvailable,
  onUpdateClick,
  isSyncInProgress,
  syncingCalendarId,
  syncProgress,
  onSync,
  disableSync,
  isOffline,
  lastSyncTime,
  lastSyncSource,
  syncOnReconnect,
  visibleTask,
  taskEditorWidth,
  onEditorResizeStart,
  onOpenNotificationSettings,
}: AppShellProps) => {
  const isMac = isMacPlatform();
  const isFullscreen = useWindowFullscreen();
  const { windowDecorationStyle } = useSettingsStore();
  const usesIntegratedTitlebar = isMac && windowDecorationStyle === 'integrated';
  const platform = usesIntegratedTitlebar ? 'macos' : undefined;
  const appliedWindowDecorationStyle = useRef(windowDecorationStyle);

  useEffect(() => {
    if (!isMac || appliedWindowDecorationStyle.current === windowDecorationStyle) return;

    appliedWindowDecorationStyle.current = windowDecorationStyle;
    void invoke('set_macos_window_decoration_style', {
      style: windowDecorationStyle,
    }).catch((error) => {
      console.error('Failed to apply macOS window decoration style:', error);
    });
  }, [isMac, windowDecorationStyle]);

  const handleContextMenu: MouseEventHandler<HTMLDivElement> = (event) => {
    const target = event.target as HTMLElement;
    if (
      !target.closest('[data-context-menu]') &&
      target.tagName !== 'INPUT' &&
      target.tagName !== 'TEXTAREA'
    ) {
      event.preventDefault();
    }
  };

  return (
    <div
      role="application"
      data-platform={platform}
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : undefined}
      data-window-fullscreen={usesIntegratedTitlebar && isFullscreen ? 'true' : undefined}
      className="app-shell flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-900"
      onContextMenu={handleContextMenu}
      {...rootFileDropProps}
    >
      {isDragOver && canHandleGlobalFileDrop && (
        <DragOverlay isUnsupportedFile={isUnsupportedFile} />
      )}

      <Sidebar
        onOpenSettings={onOpenSettings}
        onOpenImport={onOpenImport}
        isCollapsed={sidebarCollapsed}
        width={sidebarWidth}
        onToggleCollapse={onToggleSidebarCollapsed}
        onWidthChange={onSidebarWidthChange}
        updateAvailable={updateAvailable}
        onUpdateClick={onUpdateClick}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <Header
          isSyncing={isSyncInProgress}
          syncingCalendarId={syncingCalendarId}
          syncProgress={syncProgress}
          onSync={onSync}
          disableSync={disableSync}
          isOffline={isOffline}
          lastSyncTime={lastSyncTime}
          lastSyncSource={lastSyncSource}
        />

        <OfflineBanner isOffline={isOffline} syncOnReconnect={syncOnReconnect} />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div
            className={`flex min-h-0 min-w-0 flex-1 flex-col ${visibleTask ? 'hidden lg:flex' : ''}`}
          >
            <TaskList />
          </div>

          {visibleTask && (
            <div
              className="relative flex-1 overflow-hidden border-surface-200 bg-white lg:flex-none lg:border-l dark:border-surface-700 dark:bg-surface-800"
              style={{ width: taskEditorWidth }}
            >
              {/* biome-ignore lint/a11y/noStaticElementInteractions: Resize handle requires mouse events for drag functionality */}
              <div
                onMouseDown={onEditorResizeStart}
                className="absolute top-0 left-0 z-10 h-full w-1 cursor-col-resize transition-colors hover:bg-primary-400 dark:hover:bg-primary-600"
              />
              <TaskEditor
                task={visibleTask}
                onOpenNotificationSettings={onOpenNotificationSettings}
              />
            </div>
          )}
        </div>
      </main>

      {children}
    </div>
  );
};
