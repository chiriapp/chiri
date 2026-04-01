import Inbox from 'lucide-react/icons/inbox';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountModal } from '$components/modals/AccountModal';
import { CalendarModal } from '$components/modals/CalendarModal';
import { ExportModal } from '$components/modals/ExportModal';
import { TagModal } from '$components/modals/TagModal';
import { SidebarAccountsList } from '$components/sidebar/SidebarAccountsList';
import { SidebarCollapsedView } from '$components/sidebar/SidebarCollapsedView';
import { SidebarContextMenu } from '$components/sidebar/SidebarContextMenu';
import { SidebarFooter } from '$components/sidebar/SidebarFooter';
import { SidebarHeader } from '$components/sidebar/SidebarHeader';
import { SidebarTagsList } from '$components/sidebar/SidebarTagsList';
import { useModalState } from '$context/modalStateContext';
import { settingsStore } from '$context/settingsContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useSyncQuery } from '$hooks/queries/useSync';
import { useTags } from '$hooks/queries/useTags';
import { useTasks } from '$hooks/queries/useTasks';
import {
  useSetActiveAccount,
  useSetActiveCalendar,
  useSetActiveTag,
  useSetAllTasksView,
  useUIState,
} from '$hooks/queries/useUIState';
import { useDeleteHandlers } from '$hooks/useDeleteHandlers';
import { useGlobalContextMenuClose } from '$hooks/ui/useGlobalContextMenu';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { useSidebarResize } from '$hooks/ui/useSidebarResize';
import { getTasksByCalendar } from '$lib/store/tasks';
import type { Account, Calendar as CalendarType } from '$types';
import { getMetaKeyLabel, getModifierJoiner } from '$utils/keyboard';
import { clampToViewport } from '$utils/misc';
import { getAppInfo } from '$utils/version';

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
  const { data: tags = [] } = useTags();
  const { data: uiState } = useUIState();
  const { data: tasks = [] } = useTasks();

  const setActiveAccountMutation = useSetActiveAccount();
  const setActiveCalendarMutation = useSetActiveCalendar();
  const setActiveTagMutation = useSetActiveTag();
  const setAllTasksViewMutation = useSetAllTasksView();

  const { version } = getAppInfo();

  const { handleDeleteAccount, handleDeleteTag, handleDeleteCalendar } = useDeleteHandlers();
  const { syncCalendar, syncingCalendarId } = useSyncQuery();

  const activeCalendarId = uiState?.activeCalendarId ?? null;
  const activeTagId = uiState?.activeTagId ?? null;
  const { isAnyModalOpen } = useModalState();
  const {
    expandedAccountIds,
    defaultAccountsExpanded,
    toggleAccountExpanded,
    setExpandedAccountIds,
    accountsSectionCollapsed,
    tagsSectionCollapsed,
    toggleAccountsSectionCollapsed,
    toggleTagsSectionCollapsed,
  } = useSettingsStore();

  // Track which account IDs we've already initialized (to avoid re-processing)
  const initializedAccountIdsRef = useRef<Set<string>>(new Set(expandedAccountIds));

  // Initialize expanded accounts: new accounts should follow defaultAccountsExpanded setting
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

  // Convert expandedAccountIds array to a Set for efficient lookups
  const expandedAccounts = useMemo(() => new Set(expandedAccountIds), [expandedAccountIds]);

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showCreateCalendarModal, setShowCreateCalendarModal] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCalendarId, setExportCalendarId] = useState<string | null>(null);
  const [exportAccountId, setExportAccountId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingCalendar, setEditingCalendar] = useState<{
    calendar: CalendarType;
    accountId: string;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    type: 'account' | 'calendar' | 'tag' | 'accounts-section';
    id: string;
    accountId?: string;
    x: number;
    y: number;
  } | null>(null);

  const metaKey = getMetaKeyLabel();
  const modifierJoiner = getModifierJoiner();
  const settingsShortcut = `${metaKey}${modifierJoiner},`;

  const { isResizing, resizeHandleRef, handleResizeStart } = useSidebarResize(onWidthChange);

  // Track last menu close time to prevent immediate reopening
  const lastMenuCloseTimeRef = useRef<number>(0);

  // Track transition state for smoother animations
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(!isCollapsed);
  const [showCollapsedContent, setShowCollapsedContent] = useState(isCollapsed);

  // Handle content visibility during transitions
  useEffect(() => {
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
  }, [isCollapsed]);

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

  const handleContextMenu = (
    e: React.MouseEvent,
    type: 'account' | 'calendar' | 'tag' | 'accounts-section',
    id: string,
    accountId?: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (contextMenu && contextMenu.type === type && contextMenu.id === id) {
      setContextMenu(null);
      lastMenuCloseTimeRef.current = Date.now();
      return;
    }

    const timeSinceClose = Date.now() - lastMenuCloseTimeRef.current;
    if (timeSinceClose < 100) {
      return;
    }

    document.dispatchEvent(new CustomEvent('closeAllContextMenus'));
    const { x, y } = clampToViewport(e.clientX, e.clientY);
    setContextMenu({ type, id, accountId, x, y });
  };

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
    lastMenuCloseTimeRef.current = Date.now();
  }, []);

  // register for global context menu close
  useGlobalContextMenuClose(handleCloseContextMenu, contextMenu !== null);

  const getTotalActiveTaskCount = () =>
    tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length;

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Container onClick for closing context menu on outside click */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Container onClick for closing context menu on outside click */}
      <div
        className={`bg-surface-100 dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700 flex flex-col h-full relative overflow-hidden ${!isResizing ? 'transition-[width] duration-200 ease-in-out' : ''}`}
        style={{ width: isCollapsed ? 48 : width }}
        onClick={handleCloseContextMenu}
      >
        {!isCollapsed && !isTransitioning && (
          // biome-ignore lint/a11y/noStaticElementInteractions: Resize handle requires mouse events for drag functionality
          <div
            ref={resizeHandleRef}
            onMouseDown={handleResizeStart}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary-400 dark:hover:bg-primary-600 transition-colors z-10"
          />
        )}

        <SidebarHeader
          isCollapsed={isCollapsed}
          showExpandedContent={showExpandedContent}
          onToggleCollapse={onToggleCollapse}
        />

        {!isCollapsed && (
          <div
            className={`flex-1 flex flex-col min-h-0 transition-opacity duration-150 ${showExpandedContent ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto overscroll-contain">
              <button
                type="button"
                onClick={() => {
                  setAllTasksViewMutation.mutate();
                  setActiveAccountMutation.mutate(null);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                  activeCalendarId === null && activeTagId === null
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : `text-surface-600 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-200 dark:hover:bg-surface-700' : ''}`
                }`}
              >
                <Inbox className="w-4 h-4" />
                <span className="flex-1 text-left">All Tasks</span>
                <span className="text-xs">{getTotalActiveTaskCount()}</span>
              </button>

              <SidebarAccountsList
                accounts={accounts}
                tasks={tasks}
                expandedAccounts={expandedAccounts}
                activeCalendarId={activeCalendarId}
                contextMenu={contextMenu}
                isAnyModalOpen={isAnyModalOpen}
                accountsSectionCollapsed={accountsSectionCollapsed}
                onToggleAccountsSection={toggleAccountsSectionCollapsed}
                onContextMenu={handleContextMenu}
                onToggleAccount={toggleAccount}
                onSelectCalendar={(accountId, calendarId) => {
                  setActiveAccountMutation.mutate(accountId);
                  setActiveCalendarMutation.mutate(calendarId);
                }}
                onCreateCalendar={(accountId) => setShowCreateCalendarModal(accountId)}
                onOpenImport={onOpenImport}
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
              onOpenSettings={onOpenSettings}
              settingsShortcut={settingsShortcut}
              version={version}
              isAnyModalOpen={isAnyModalOpen}
            />
          </div>
        )}

        {isCollapsed && (
          <SidebarCollapsedView
            accounts={accounts}
            tags={tags}
            activeCalendarId={activeCalendarId}
            activeTagId={activeTagId}
            contextMenu={contextMenu}
            showCollapsedContent={showCollapsedContent}
            updateAvailable={updateAvailable}
            onAllTasks={() => {
              setAllTasksViewMutation.mutate();
              setActiveAccountMutation.mutate(null);
            }}
            onSelectCalendar={(accountId, calendarId) => {
              setActiveAccountMutation.mutate(accountId);
              setActiveCalendarMutation.mutate(calendarId);
            }}
            onSelectTag={(tagId) => setActiveTagMutation.mutate(tagId)}
            onContextMenu={handleContextMenu}
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
          onDeleteAccount={(accountId) => handleDeleteAccount(accountId, accounts)}
          onDeleteCalendar={(calendarId, accountId) =>
            handleDeleteCalendar(calendarId, accountId, accounts, activeCalendarId)
          }
          onDeleteTag={(tagId) => handleDeleteTag(tagId, tags)}
          onExpandAll={handleExpandAllAccounts}
          onCollapseAll={handleCollapseAllAccounts}
        />
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
    </>
  );
};
