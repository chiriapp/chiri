import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SidebarCollapsedView } from '$components/sidebar/SidebarCollapsedView';
import { SidebarExpandedView } from '$components/sidebar/SidebarExpandedView';
import { SidebarHeader } from '$components/sidebar/SidebarHeader';
import { SidebarOverlays } from '$components/sidebar/SidebarOverlays';
import { getFilterPresetId } from '$constants/filters';
import { useConnectionStore } from '$context/connectionContext';
import { useModalState } from '$context/modalStateContext';
import { useSettingsStore } from '$context/settingsContext';
import {
  AccountConnectionTestCancelledError,
  useAccountConnectionTestRunner,
} from '$hooks/account/useAccountConnectionTestRunner';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useFilters } from '$hooks/queries/useFilters';
import { useSyncQuery } from '$hooks/queries/useSync';
import { useTags } from '$hooks/queries/useTags';
import { useTasks } from '$hooks/queries/useTasks';
import { useUIState } from '$hooks/queries/useUIState';
import { usePrefersReducedMotion } from '$hooks/ui/usePrefersReducedMotion';
import { useSidebarActions } from '$hooks/ui/useSidebarActions';
import { useSidebarContextMenu } from '$hooks/ui/useSidebarContextMenu';
import { useSidebarResize } from '$hooks/ui/useSidebarResize';
import { useSidebarModals } from '$hooks/useSidebarModals';
import { getSetupErrorInfo } from '$lib/caldav/setup';
import { exportMobileConfigFile } from '$lib/mobileconfig/export';
import { toastManager } from '$lib/toastManager';
import type { Account } from '$types/account';
import type { KeyboardShortcut } from '$types/shortcuts';
import { formatShortcut, getModifierJoiner } from '$utils/keyboard';

interface SidebarProps {
  onOpenSettings?: () => void;
  onOpenImport?: () => void;
  isCollapsed: boolean;
  width: number;
  onToggleCollapse: () => void;
  onWidthChange: (width: number) => void;
  updateAvailable?: boolean;
  onUpdateClick?: () => void;
}

const getSidebarShortcutHint = (shortcuts: KeyboardShortcut[], id: string) => {
  const shortcut = shortcuts.find((candidate) => candidate.id === id);
  if (!shortcut?.key) return undefined;

  return formatShortcut(shortcut).split(' + ').join(getModifierJoiner());
};

export const Sidebar = ({
  onOpenSettings,
  onOpenImport,
  isCollapsed,
  width,
  onToggleCollapse,
  onWidthChange,
  updateAvailable,
  onUpdateClick,
}: SidebarProps) => {
  const { data: accounts = [] } = useAccounts();
  const localAccounts = useMemo(() => accounts.filter((a) => !a.caldav), [accounts]);
  const caldavAccounts = useMemo(() => accounts.filter((a) => a.caldav), [accounts]);
  const { data: tags = [] } = useTags();
  const { data: filters = [] } = useFilters();
  const { data: uiState } = useUIState();
  const { data: tasks = [] } = useTasks();

  const { syncCalendar, syncingCalendarId } = useSyncQuery();
  const { testingAccountIds } = useConnectionStore();

  const activeCalendarId = uiState?.activeCalendarId ?? null;
  const activeTagId = uiState?.activeTagId ?? null;
  const activeFilterId = uiState?.activeFilterId ?? null;
  const activeView = uiState?.activeView ?? 'tasks';
  const existingFilterPresetIds = useMemo(() => {
    return new Set(
      filters
        .map((filter) => getFilterPresetId(filter))
        .filter((presetId): presetId is string => presetId !== undefined),
    );
  }, [filters]);
  const { isAnyModalOpen } = useModalState();
  const {
    expandedAccountIds,
    setExpandedAccountIds,
    localSectionCollapsed,
    accountsSectionCollapsed,
    filtersSectionCollapsed,
    tagsSectionCollapsed,
    showLocalSection,
    showAccountsSection,
    showFiltersSection,
    showTagsSection,
    showSidebarTaskCounts,
    enforceVapid,
    sidebarSectionOrder,
    toggleLocalSectionCollapsed,
    toggleAccountsSectionCollapsed,
    toggleFiltersSectionCollapsed,
    toggleTagsSectionCollapsed,
    keyboardShortcuts,
  } = useSettingsStore();

  // track which account IDs we've already initialized (to avoid re-processing)
  const initializedAccountIdsRef = useRef<Set<string>>(new Set(expandedAccountIds));

  // initialize expanded accounts: new accounts should reveal their calendars right away.
  useEffect(() => {
    const newAccountIds = accounts
      .map((a) => a.id)
      .filter((id) => !initializedAccountIdsRef.current.has(id));

    if (newAccountIds.length > 0) {
      for (const id of newAccountIds) {
        initializedAccountIdsRef.current.add(id);
      }
      setExpandedAccountIds([...expandedAccountIds, ...newAccountIds]);
    }
  }, [accounts, expandedAccountIds, setExpandedAccountIds]);

  // convert expandedAccountIds array to a Set for efficient lookups
  const expandedAccounts = useMemo(() => new Set(expandedAccountIds), [expandedAccountIds]);

  const sidebarModals = useSidebarModals();
  const {
    contextMenu,
    activeAccountMenuTriggerId,
    handleContextMenu,
    handleCloseContextMenu,
    resetStaleCursorAfterContextMenuDismiss,
  } = useSidebarContextMenu();
  const { mobileConfigAccountId, closeMobileConfigExport } = sidebarModals;
  const {
    handleSelectAllTasks,
    handleSelectRecentlyDeleted,
    handleSelectCalendar,
    handleSelectTag,
    handleSelectFilter,
    handleAddLocalCalendar,
    handleDeleteAccount,
    handleDeleteCalendar,
    handleDeleteTag,
    handleDeleteFilter,
    handleCreateFilterPreset,
    handleToggleAccount,
    handleExpandAllAccounts,
    handleCollapseAllAccounts,
  } = useSidebarActions({
    accounts,
    tags,
    activeCalendarId,
    accountsSectionCollapsed,
    openCreateCalendar: sidebarModals.openCreateCalendar,
  });

  const settingsShortcut = getSidebarShortcutHint(keyboardShortcuts, 'settings');
  const importShortcut = getSidebarShortcutHint(keyboardShortcuts, 'import-tasks');

  const { isResizing, resizeHandleRef, handleResizeStart } = useSidebarResize(onWidthChange);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { runTest } = useAccountConnectionTestRunner({
    enforceVapid,
    operationIdPrefix: 'sidebar-connection-test',
  });

  // track transition state for smoother animations
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(!isCollapsed);
  const [showCollapsedContent, setShowCollapsedContent] = useState(isCollapsed);

  // handle content visibility during transitions
  useEffect(() => {
    if (prefersReducedMotion) {
      setShowExpandedContent(!isCollapsed);
      setShowCollapsedContent(isCollapsed);
      setIsTransitioning(false);
      return;
    }

    if (isCollapsed) {
      setShowExpandedContent(false);
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setShowCollapsedContent(true);
        setIsTransitioning(false);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setShowCollapsedContent(false);
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setShowExpandedContent(true);
        setIsTransitioning(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed, prefersReducedMotion]);

  const handleConfirmMobileConfigExport = async (includePassword: boolean) => {
    const account = accounts.find((a) => a.id === mobileConfigAccountId);
    if (!account) return;

    try {
      const result = await exportMobileConfigFile(account, { includePassword });
      if (result !== 'cancelled') {
        closeMobileConfigExport();
      }
    } catch (err) {
      console.error('Failed to export .mobileconfig:', err);
    }
  };

  const handleTestConnection = useCallback(
    async (account: Account) => {
      if (account.id in testingAccountIds) return;

      const groupKey = `connection-test-${account.id}`;
      toastManager.loading('Testing connection…', account.name, {
        groupKey,
        duration: 30_000,
      });

      try {
        const { calendars, notice } = await runTest(account);
        toastManager.dismiss(groupKey);
        toastManager.success(
          'Connection successful',
          `Found ${calendars.length} ${calendars.length === 1 ? 'calendar' : 'calendars'}.`,
          { groupKey: `connection-test-result-${account.id}` },
        );
        if (notice) {
          toastManager.warning(notice.title, notice.message, {
            duration: 8_000,
          });
        }
      } catch (error) {
        toastManager.dismiss(groupKey);
        if (error instanceof AccountConnectionTestCancelledError) return;
        const setupError = getSetupErrorInfo(
          error,
          'Failed to test CalDAV connection',
          account.caldav?.serverType ?? 'generic',
          account.caldav?.serverUrl ?? '',
        );
        const errorMessage = setupError.hint
          ? `${setupError.message} ${setupError.hint}`
          : setupError.message;
        toastManager.error(setupError.title, errorMessage, {
          groupKey: `connection-test-result-${account.id}`,
        });
      }
    },
    [runTest, testingAccountIds],
  );

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: container onClick for closing context menu on outside click */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: container onClick for closing context menu on outside click */}
      <div
        className={`app-sidebar relative flex h-full flex-col overflow-hidden bg-surface-100 dark:bg-surface-900 ${!isResizing ? 'motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-in-out' : ''}`}
        style={{ width: isCollapsed ? 52 : width }}
        onClick={handleCloseContextMenu}
      >
        {!isCollapsed && !isTransitioning && (
          // biome-ignore lint/a11y/noStaticElementInteractions: resize handle requires mouse events for drag functionality
          <div
            ref={resizeHandleRef}
            onMouseDown={handleResizeStart}
            className={`absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize transition-colors ${isResizing ? 'bg-primary-400 dark:bg-primary-600' : 'hover:bg-primary-400 dark:hover:bg-primary-600'}`}
          />
        )}

        <SidebarHeader
          showExpandedContent={showExpandedContent}
          showCollapsedContent={showCollapsedContent}
          onToggleCollapse={onToggleCollapse}
        />

        {!isCollapsed && (
          <SidebarExpandedView
            showExpandedContent={showExpandedContent}
            navigation={{
              activeView,
              onAllTasks: handleSelectAllTasks,
              onRecentlyDeleted: handleSelectRecentlyDeleted,
            }}
            sections={{
              activeCalendarId,
              activeTagId,
              activeFilterId,
              localAccounts,
              caldavAccounts,
              tags,
              filters,
              tasks,
              expandedAccounts,
              contextMenu,
              isAnyModalOpen,
              activeAccountMenuTriggerId,
              showSidebarTaskCounts,
              localSectionCollapsed,
              accountsSectionCollapsed,
              filtersSectionCollapsed,
              tagsSectionCollapsed,
              showLocalSection,
              showAccountsSection,
              showFiltersSection,
              showTagsSection,
              sidebarSectionOrder,
              onSelectCalendar: handleSelectCalendar,
              onSelectTag: handleSelectTag,
              onSelectFilter: handleSelectFilter,
              onContextMenu: handleContextMenu,
              onToggleLocalSection: toggleLocalSectionCollapsed,
              onToggleAccountsSection: toggleAccountsSectionCollapsed,
              onToggleFiltersSection: toggleFiltersSectionCollapsed,
              onToggleTagsSection: toggleTagsSectionCollapsed,
              onToggleAccount: handleToggleAccount,
              onAddLocalCalendar: handleAddLocalCalendar,
              onCreateCalendar: sidebarModals.openCreateCalendar,
              onAddAccount: () => sidebarModals.openAccount(),
              onAddFilter: sidebarModals.openFilterPreset,
              onAddTag: () => sidebarModals.openTag(),
            }}
            footer={{
              updateAvailable,
              onUpdateClick,
              onOpenImport,
              onOpenSettings,
              importShortcut,
              settingsShortcut,
              isAnyModalOpen,
            }}
          />
        )}

        {isCollapsed && (
          <SidebarCollapsedView
            showCollapsedContent={showCollapsedContent}
            navigation={{
              activeCalendarId,
              activeTagId,
              activeFilterId,
              activeView,
              onAllTasks: handleSelectAllTasks,
              onRecentlyDeleted: handleSelectRecentlyDeleted,
              onSelectCalendar: handleSelectCalendar,
              onSelectTag: handleSelectTag,
              onSelectFilter: handleSelectFilter,
              onContextMenu: handleContextMenu,
            }}
            sections={{
              accounts,
              tags,
              filters,
              tasks,
              contextMenu,
              localSectionCollapsed,
              accountsSectionCollapsed,
              filtersSectionCollapsed,
              tagsSectionCollapsed,
              showLocalSection,
              showAccountsSection,
              showFiltersSection,
              showTagsSection,
              sidebarSectionOrder,
            }}
            footer={{
              updateAvailable,
              importShortcut,
              settingsShortcut,
              onOpenImport,
              onOpenSettings,
              onUpdateClick,
            }}
          />
        )}
      </div>

      <SidebarOverlays
        contextMenuOverlay={{
          contextMenu,
          accounts,
          syncingCalendarId,
          testingAccountIds,
          onCloseContextMenu: handleCloseContextMenu,
          onPointerCloseContextMenu: resetStaleCursorAfterContextMenuDismiss,
          syncCalendar,
          onEditAccount: (account) => sidebarModals.openAccount(account.id),
          onTestConnection: handleTestConnection,
          onEditCalendar: (calendarId, accountId) =>
            sidebarModals.openCalendar({ calendarId, accountId }),
          onEditTag: sidebarModals.openTag,
          onCreateCalendar: sidebarModals.openCreateCalendar,
          onExportCalendar: sidebarModals.openExportCalendar,
          onExportAccount: sidebarModals.openExportAccount,
          onMobileConfigExport: sidebarModals.openMobileConfigExport,
          onDeleteAccount: handleDeleteAccount,
          onDeleteCalendar: handleDeleteCalendar,
          onDeleteTag: handleDeleteTag,
          onEditFilter: sidebarModals.openFilter,
          onDeleteFilter: handleDeleteFilter,
          onExpandAll: handleExpandAllAccounts,
          onCollapseAll: handleCollapseAllAccounts,
        }}
        modalOverlays={{
          accounts,
          tasks,
          modals: sidebarModals,
          existingFilterPresetIds,
          onCreateFilterPreset: handleCreateFilterPreset,
          onConfirmMobileConfigExport: handleConfirmMobileConfigExport,
        }}
      />
    </>
  );
};
