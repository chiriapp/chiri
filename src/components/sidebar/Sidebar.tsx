import Inbox from 'lucide-react/icons/inbox';
import Trash2 from 'lucide-react/icons/trash-2';
import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountModal } from '$components/modals/AccountModal/AccountModal';
import { CalendarModal } from '$components/modals/CalendarModal';
import { ExportModal } from '$components/modals/ExportModal';
import { FilterModal } from '$components/modals/FilterModal';
import { FilterPresetModal } from '$components/modals/FilterPresetModal';
import { SidebarMobileConfigExportModal } from '$components/modals/SidebarMobileConfigExportModal';
import { TagModal } from '$components/modals/TagModal';
import { SidebarAccountsList } from '$components/sidebar/SidebarAccountsList';
import { SidebarCollapsedView } from '$components/sidebar/SidebarCollapsedView';
import { SidebarContextMenu } from '$components/sidebar/SidebarContextMenu';
import { SidebarFiltersList } from '$components/sidebar/SidebarFiltersList';
import { SidebarFooter } from '$components/sidebar/SidebarFooter';
import { SidebarHeader } from '$components/sidebar/SidebarHeader';
import { SidebarLocalList } from '$components/sidebar/SidebarLocalList';
import { SidebarTagsList } from '$components/sidebar/SidebarTagsList';
import { getFilterPresetId } from '$constants/filters';
import { useModalState } from '$context/modalStateContext';
import { settingsStore, useSettingsStore } from '$context/settingsContext';
import { useAccountDeletion } from '$hooks/deletion/useAccountDeletion';
import { useCalendarDeletion } from '$hooks/deletion/useCalendarDeletion';
import { useFilterDeletion } from '$hooks/deletion/useFilterDeletion';
import { useTagDeletion } from '$hooks/deletion/useTagDeletion';
import { useAccounts, useCreateAccount } from '$hooks/queries/useAccounts';
import { useCreateFilter, useFilters } from '$hooks/queries/useFilters';
import { useSyncQuery } from '$hooks/queries/useSync';
import { useTags } from '$hooks/queries/useTags';
import { useTasks } from '$hooks/queries/useTasks';
import {
  useSetActiveAccount,
  useSetActiveCalendar,
  useSetActiveFilter,
  useSetActiveTag,
  useSetAllTasksView,
  useSetRecentlyDeletedView,
  useUIState,
} from '$hooks/queries/useUIState';
import { CLOSE_CONTEXT_MENUS_EVENT, useContextMenuDismissal } from '$hooks/ui/useContextMenu';
import { usePrefersReducedMotion } from '$hooks/ui/usePrefersReducedMotion';
import { useSidebarResize } from '$hooks/ui/useSidebarResize';
import {
  refreshStaleCursorAfterLayoutAtEventPoint,
  resetStaleCursorAfterLayout,
  resetStaleCursorOnLayerClose,
} from '$hooks/ui/useStaleCursorReset';
import { exportMobileConfigFile } from '$lib/mobileconfig/export';
import { getTasksByCalendar } from '$lib/store/tasks';
import type { Account, Calendar, KeyboardShortcut } from '$types';
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

const CONTEXT_MENU_DISMISS_CURSOR_RESET_DELAY_FRAMES = 2;

const isPointInsideRect = (
  { clientX, clientY }: { clientX: number; clientY: number },
  rect: DOMRect,
) => clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;

const findAccountMenuTrigger = (accountId: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-account-menu-trigger]')).find(
    (element) => element.dataset.accountMenuTrigger === accountId,
  );

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

  const setActiveAccountMutation = useSetActiveAccount();
  const setActiveCalendarMutation = useSetActiveCalendar();
  const setActiveTagMutation = useSetActiveTag();
  const setActiveFilterMutation = useSetActiveFilter();
  const setAllTasksViewMutation = useSetAllTasksView();
  const setRecentlyDeletedViewMutation = useSetRecentlyDeletedView();
  const createFilterMutation = useCreateFilter();

  const { deleteAccount } = useAccountDeletion();
  const { deleteCalendar } = useCalendarDeletion();
  const { deleteFilter } = useFilterDeletion();
  const { deleteTag } = useTagDeletion();
  const { syncCalendar, syncingCalendarId } = useSyncQuery();
  const createAccountMutation = useCreateAccount();

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
    defaultAccountsExpanded,
    toggleAccountExpanded,
    setExpandedAccountIds,
    localSectionCollapsed,
    accountsSectionCollapsed,
    filtersSectionCollapsed,
    tagsSectionCollapsed,
    toggleLocalSectionCollapsed,
    toggleAccountsSectionCollapsed,
    toggleFiltersSectionCollapsed,
    toggleTagsSectionCollapsed,
    keyboardShortcuts,
  } = useSettingsStore();

  // track which account IDs we've already initialized (to avoid re-processing)
  const initializedAccountIdsRef = useRef<Set<string>>(new Set(expandedAccountIds));

  // initialize expanded accounts: new accounts should follow defaultAccountsExpanded setting
  useEffect(() => {
    const newAccountIds = accounts
      .map((a) => a.id)
      .filter((id) => !initializedAccountIdsRef.current.has(id));

    if (newAccountIds.length > 0) {
      for (const id of newAccountIds) {
        initializedAccountIdsRef.current.add(id);
      }
      if (defaultAccountsExpanded) {
        setExpandedAccountIds([...expandedAccountIds, ...newAccountIds]);
      }
    }
  }, [accounts, defaultAccountsExpanded, expandedAccountIds, setExpandedAccountIds]);

  // convert expandedAccountIds array to a Set for efficient lookups
  const expandedAccounts = useMemo(() => new Set(expandedAccountIds), [expandedAccountIds]);

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showCreateCalendarModal, setShowCreateCalendarModal] = useState<string | null>(null);
  const [showFilterPresetModal, setShowFilterPresetModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCalendarId, setExportCalendarId] = useState<string | null>(null);
  const [exportAccountId, setExportAccountId] = useState<string | null>(null);
  const [mobileConfigAccountId, setMobileConfigAccountId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editingCalendar, setEditingCalendar] = useState<{
    calendar: Calendar;
    accountId: string;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    type: 'account' | 'calendar' | 'tag' | 'filter' | 'accounts-section';
    id: string;
    accountId?: string;
    source?: 'account-menu-trigger';
    x: number;
    y: number;
  } | null>(null);
  const [activeAccountMenuTriggerId, setActiveAccountMenuTriggerId] = useState<string | null>(null);

  const settingsShortcut = getSidebarShortcutHint(keyboardShortcuts, 'settings');
  const importShortcut = getSidebarShortcutHint(keyboardShortcuts, 'import-tasks');

  const { isResizing, resizeHandleRef, handleResizeStart } = useSidebarResize(onWidthChange);
  const prefersReducedMotion = usePrefersReducedMotion();

  // track last menu close time to prevent immediate reopening
  const lastMenuCloseTimeRef = useRef<number>(0);

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

  const toggleAccount = (id: string) => {
    toggleAccountExpanded(id);
  };

  const handleExpandAllAccounts = () => {
    const allAccountIds = accounts.map((a) => a.id);
    setExpandedAccountIds(allAccountIds);
    settingsStore.setState({ accountsSectionCollapsed: false });
  };

  const handleCollapseAllAccounts = () => {
    setExpandedAccountIds([]);
    settingsStore.setState({ accountsSectionCollapsed: true });
  };

  const handleConfirmMobileConfigExport = async (includePassword: boolean) => {
    const account = accounts.find((a) => a.id === mobileConfigAccountId);
    if (!account) return;

    try {
      const result = await exportMobileConfigFile(account, { includePassword });
      if (result !== 'cancelled') {
        setMobileConfigAccountId(null);
      }
    } catch (err) {
      console.error('Failed to export .mobileconfig:', err);
    }
  };

  useEffect(() => {
    if (!activeAccountMenuTriggerId) return;

    const clearIfPointerLeftTrigger = (event: PointerEvent) => {
      const accountMenuTrigger = findAccountMenuTrigger(activeAccountMenuTriggerId);
      if (
        !accountMenuTrigger ||
        !isPointInsideRect(event, accountMenuTrigger.getBoundingClientRect())
      ) {
        setActiveAccountMenuTriggerId(null);
      }
    };

    document.addEventListener('pointermove', clearIfPointerLeftTrigger, true);
    document.addEventListener('pointerdown', clearIfPointerLeftTrigger, true);

    return () => {
      document.removeEventListener('pointermove', clearIfPointerLeftTrigger, true);
      document.removeEventListener('pointerdown', clearIfPointerLeftTrigger, true);
    };
  }, [activeAccountMenuTriggerId]);

  const resetStaleCursorAfterContextMenuDismiss = useCallback(
    (event: MouseEvent | MouseEvent) => {
      const isAccountMenu = contextMenu?.type === 'account';
      const accountMenuId = isAccountMenu ? contextMenu.id : undefined;
      const accountMenuTrigger = accountMenuId ? findAccountMenuTrigger(accountMenuId) : undefined;

      if (
        accountMenuId &&
        contextMenu?.source === 'account-menu-trigger' &&
        accountMenuTrigger &&
        isPointInsideRect(event, accountMenuTrigger.getBoundingClientRect())
      ) {
        setActiveAccountMenuTriggerId(accountMenuId);
        resetStaleCursorOnLayerClose();
        return;
      }

      setActiveAccountMenuTriggerId(null);
      if (isAccountMenu) {
        resetStaleCursorAfterLayout({
          delayFrames: CONTEXT_MENU_DISMISS_CURSOR_RESET_DELAY_FRAMES,
        });
        return;
      }

      refreshStaleCursorAfterLayoutAtEventPoint(event, {
        delayFrames: CONTEXT_MENU_DISMISS_CURSOR_RESET_DELAY_FRAMES,
      });
    },
    [contextMenu],
  );

  const handleContextMenu = (
    e: MouseEvent,
    type: 'account' | 'calendar' | 'tag' | 'filter' | 'accounts-section',
    id: string,
    accountId?: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (contextMenu && contextMenu.type === type && contextMenu.id === id) {
      resetStaleCursorAfterContextMenuDismiss(e);
      setContextMenu(null);
      lastMenuCloseTimeRef.current = Date.now();
      return;
    }

    const timeSinceClose = Date.now() - lastMenuCloseTimeRef.current;
    if (timeSinceClose < 100) {
      return;
    }

    const openedFromAccountMenuTrigger =
      type === 'account' &&
      e.target instanceof Element &&
      e.target.closest<HTMLElement>('[data-account-menu-trigger]')?.dataset.accountMenuTrigger ===
        id;

    setActiveAccountMenuTriggerId(null);
    document.dispatchEvent(new CustomEvent(CLOSE_CONTEXT_MENUS_EVENT));
    setContextMenu({
      type,
      id,
      accountId,
      source: openedFromAccountMenuTrigger ? 'account-menu-trigger' : undefined,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
    lastMenuCloseTimeRef.current = Date.now();
  }, []);

  // register for global context menu close
  useContextMenuDismissal(handleCloseContextMenu, contextMenu !== null);

  const handleAddLocalCalendar = useCallback(async () => {
    let localAccount = accounts.find((a) => !a.caldav);
    if (!localAccount) {
      localAccount = await createAccountMutation.mutateAsync({
        name: 'Local',
        caldav: null,
      });
    }
    setShowCreateCalendarModal(localAccount.id);
  }, [accounts, createAccountMutation]);

  const getTotalActiveTaskCount = () =>
    tasks.filter((t) => !t.deletedAt && t.status !== 'completed' && t.status !== 'cancelled')
      .length;

  const getDeletedTaskCount = () => tasks.filter((t) => t.deletedAt).length;

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Container onClick for closing context menu on outside click */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Container onClick for closing context menu on outside click */}
      <div
        className={`app-sidebar relative flex h-full flex-col overflow-hidden bg-surface-100 dark:bg-surface-900 ${!isResizing ? 'motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-in-out' : ''}`}
        style={{ width: isCollapsed ? 52 : width }}
        onClick={handleCloseContextMenu}
      >
        {!isCollapsed && !isTransitioning && (
          // biome-ignore lint/a11y/noStaticElementInteractions: Resize handle requires mouse events for drag functionality
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
          <div
            className={`flex min-h-0 flex-1 flex-col motion-safe:transition-opacity motion-safe:duration-150 ${showExpandedContent ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-2 py-2">
              <button
                type="button"
                onClick={() => {
                  setAllTasksViewMutation.mutate();
                  setActiveAccountMutation.mutate(null);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                  activeView === 'tasks' && activeCalendarId === null && activeTagId === null
                    ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
                    : `text-surface-600 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-200 dark:hover:bg-surface-700' : ''}`
                }`}
              >
                <Inbox className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">All Tasks</span>
                <span className="text-xs">{getTotalActiveTaskCount()}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRecentlyDeletedViewMutation.mutate();
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                  activeView === 'recently-deleted'
                    ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
                    : `text-surface-600 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-200 dark:hover:bg-surface-700' : ''}`
                }`}
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">Recently Deleted</span>
                <span className="text-xs">{getDeletedTaskCount()}</span>
              </button>

              <SidebarFiltersList
                filters={filters}
                tasks={tasks}
                activeFilterId={activeFilterId}
                contextMenu={contextMenu}
                isAnyModalOpen={isAnyModalOpen}
                collapsed={filtersSectionCollapsed}
                onToggle={toggleFiltersSectionCollapsed}
                onSelectFilter={(filterId) => setActiveFilterMutation.mutate(filterId)}
                onAddFilter={() => setShowFilterPresetModal(true)}
                onContextMenu={handleContextMenu}
              />

              <SidebarLocalList
                accounts={localAccounts}
                tasks={tasks}
                activeCalendarId={activeCalendarId}
                contextMenu={contextMenu}
                isAnyModalOpen={isAnyModalOpen}
                collapsed={localSectionCollapsed}
                onToggle={toggleLocalSectionCollapsed}
                onContextMenu={handleContextMenu}
                onSelectCalendar={(accountId, calendarId) => {
                  setActiveAccountMutation.mutate(accountId);
                  setActiveCalendarMutation.mutate(calendarId);
                }}
                onAddCalendar={handleAddLocalCalendar}
              />

              <SidebarAccountsList
                accounts={caldavAccounts}
                tasks={tasks}
                expandedAccounts={expandedAccounts}
                activeCalendarId={activeCalendarId}
                contextMenu={contextMenu}
                isAnyModalOpen={isAnyModalOpen}
                activeAccountMenuTriggerId={activeAccountMenuTriggerId}
                accountsSectionCollapsed={accountsSectionCollapsed}
                onToggleAccountsSection={toggleAccountsSectionCollapsed}
                onContextMenu={handleContextMenu}
                onToggleAccount={toggleAccount}
                onSelectCalendar={(accountId, calendarId) => {
                  setActiveAccountMutation.mutate(accountId);
                  setActiveCalendarMutation.mutate(calendarId);
                }}
                onCreateCalendar={(accountId) => setShowCreateCalendarModal(accountId)}
                onAddAccount={() => {
                  setEditingAccount(null);
                  setShowAccountModal(true);
                }}
              />

              <SidebarTagsList
                tags={tags}
                tasks={tasks}
                activeTagId={activeTagId}
                contextMenu={contextMenu}
                isAnyModalOpen={isAnyModalOpen}
                tagsSectionCollapsed={tagsSectionCollapsed}
                onToggleTagsSection={toggleTagsSectionCollapsed}
                onSelectTag={(tagId) => setActiveTagMutation.mutate(tagId)}
                onContextMenu={handleContextMenu}
                onAddTag={() => {
                  setEditingTagId(null);
                  setShowTagModal(true);
                }}
              />
            </div>

            <SidebarFooter
              updateAvailable={updateAvailable}
              onUpdateClick={onUpdateClick}
              onOpenImport={onOpenImport}
              onOpenSettings={onOpenSettings}
              importShortcut={importShortcut}
              settingsShortcut={settingsShortcut}
              isAnyModalOpen={isAnyModalOpen}
            />
          </div>
        )}

        {isCollapsed && (
          <SidebarCollapsedView
            accounts={accounts}
            tags={tags}
            filters={filters}
            tasks={tasks}
            activeCalendarId={activeCalendarId}
            activeTagId={activeTagId}
            activeFilterId={activeFilterId}
            activeView={activeView}
            contextMenu={contextMenu}
            showCollapsedContent={showCollapsedContent}
            localSectionCollapsed={localSectionCollapsed}
            accountsSectionCollapsed={accountsSectionCollapsed}
            tagsSectionCollapsed={tagsSectionCollapsed}
            filtersSectionCollapsed={filtersSectionCollapsed}
            updateAvailable={updateAvailable}
            importShortcut={importShortcut}
            settingsShortcut={settingsShortcut}
            onAllTasks={() => {
              setAllTasksViewMutation.mutate();
              setActiveAccountMutation.mutate(null);
            }}
            onRecentlyDeleted={() => {
              setRecentlyDeletedViewMutation.mutate();
            }}
            onSelectCalendar={(accountId, calendarId) => {
              setActiveAccountMutation.mutate(accountId);
              setActiveCalendarMutation.mutate(calendarId);
            }}
            onSelectTag={(tagId) => setActiveTagMutation.mutate(tagId)}
            onSelectFilter={(filterId) => setActiveFilterMutation.mutate(filterId)}
            onContextMenu={handleContextMenu}
            onOpenImport={onOpenImport}
            onOpenSettings={onOpenSettings}
            onUpdateClick={onUpdateClick}
          />
        )}
      </div>

      {contextMenu && (
        <SidebarContextMenu
          contextMenu={contextMenu}
          accounts={accounts}
          syncingCalendarId={syncingCalendarId}
          syncCalendar={syncCalendar}
          onClose={handleCloseContextMenu}
          onPointerClose={resetStaleCursorAfterContextMenuDismiss}
          onEditAccount={(account) => {
            setEditingAccount(account);
            setShowAccountModal(true);
          }}
          onEditCalendar={(calendarId, accountId) => {
            const account = accounts.find((a) => a.id === accountId);
            const calendar = account?.calendars.find((c) => c.id === calendarId);
            if (calendar) {
              setEditingCalendar({ calendar, accountId });
              setShowCalendarModal(true);
            }
          }}
          onEditTag={(tagId) => {
            setEditingTagId(tagId);
            setShowTagModal(true);
          }}
          onCreateCalendar={(accountId) => setShowCreateCalendarModal(accountId)}
          onExportCalendar={(calendarId) => {
            setExportCalendarId(calendarId);
            setShowExportModal(true);
          }}
          onExportAccount={(accountId) => {
            setExportAccountId(accountId);
            setShowExportModal(true);
          }}
          onMobileConfigExport={(accountId) => setMobileConfigAccountId(accountId)}
          onDeleteAccount={async (accountId) => {
            await deleteAccount(accountId, accounts);
          }}
          onDeleteCalendar={async (calendarId, accountId) => {
            await deleteCalendar(calendarId, accountId, accounts, activeCalendarId);
          }}
          onDeleteTag={async (tagId) => {
            await deleteTag(tagId, tags);
          }}
          onEditFilter={(filterId) => {
            setEditingFilterId(filterId);
          }}
          onDeleteFilter={async (filterId) => {
            await deleteFilter(filterId);
          }}
          onExpandAll={handleExpandAllAccounts}
          onCollapseAll={handleCollapseAllAccounts}
        />
      )}

      {showFilterPresetModal && (
        <FilterPresetModal
          existingPresetIds={existingFilterPresetIds}
          onCreatePreset={(preset) => {
            createFilterMutation.mutate(
              {
                presetId: preset.presetId,
                name: preset.name,
                icon: preset.icon,
                combinator: preset.combinator,
                criteria: preset.criteria,
              },
              {
                onSuccess: (filter) => setActiveFilterMutation.mutate(filter.id),
              },
            );
          }}
          onClose={() => setShowFilterPresetModal(false)}
        />
      )}

      {editingFilterId && (
        <FilterModal filterId={editingFilterId} onClose={() => setEditingFilterId(null)} />
      )}

      {showAccountModal && (
        <AccountModal
          account={editingAccount}
          onClose={() => {
            setShowAccountModal(false);
            setEditingAccount(null);
          }}
        />
      )}

      {showTagModal && (
        <TagModal
          tagId={editingTagId}
          onClose={() => {
            setShowTagModal(false);
            setEditingTagId(null);
          }}
        />
      )}

      {showCalendarModal && editingCalendar && (
        <CalendarModal
          calendar={editingCalendar.calendar}
          accountId={editingCalendar.accountId}
          onClose={() => {
            setShowCalendarModal(false);
            setEditingCalendar(null);
          }}
        />
      )}

      {showCreateCalendarModal && (
        <CalendarModal
          accountId={showCreateCalendarModal}
          onClose={() => setShowCreateCalendarModal(null)}
        />
      )}

      {showExportModal && exportCalendarId && (
        <ExportModal
          tasks={getTasksByCalendar(exportCalendarId)}
          type="single-calendar"
          calendarName={
            accounts.flatMap((a) => a.calendars).find((c) => c.id === exportCalendarId)?.displayName
          }
          fileName={
            accounts
              .flatMap((a) => a.calendars)
              .find((c) => c.id === exportCalendarId)
              ?.displayName.replace(/[^a-z0-9]/gi, '-')
              .toLowerCase() ?? 'export'
          }
          onClose={() => {
            setShowExportModal(false);
            setExportCalendarId(null);
          }}
        />
      )}

      {showExportModal && exportAccountId && (
        <ExportModal
          tasks={tasks.filter((t) => t.accountId === exportAccountId)}
          calendars={accounts.find((a) => a.id === exportAccountId)?.calendars ?? []}
          type="all-calendars"
          fileName={
            accounts
              .find((a) => a.id === exportAccountId)
              ?.name.replace(/[^a-z0-9]/gi, '-')
              .toLowerCase() ?? 'account-export'
          }
          onClose={() => {
            setShowExportModal(false);
            setExportAccountId(null);
          }}
        />
      )}

      <SidebarMobileConfigExportModal
        accountId={mobileConfigAccountId}
        accounts={accounts}
        onConfirm={handleConfirmMobileConfigExport}
        onClose={() => setMobileConfigAccountId(null)}
      />
    </>
  );
};
