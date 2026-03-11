import { emit } from '@tauri-apps/api/event';
import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Download from 'lucide-react/icons/download';
import Edit2 from 'lucide-react/icons/edit-2';
import FolderKanban from 'lucide-react/icons/folder-kanban';
import Import from 'lucide-react/icons/import';
import Inbox from 'lucide-react/icons/inbox';
import MoreVertical from 'lucide-react/icons/more-vertical';
import PanelLeftClose from 'lucide-react/icons/panel-left-close';
import PanelLeftOpen from 'lucide-react/icons/panel-left-open';
import Plus from 'lucide-react/icons/plus';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Settings from 'lucide-react/icons/settings';
import Share2 from 'lucide-react/icons/share-2';
import Trash2 from 'lucide-react/icons/trash-2';
import User from 'lucide-react/icons/user';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountModal } from '$components/modals/AccountModal';
import { CalendarModal } from '$components/modals/CalendarModal';
import { CreateCalendarModal } from '$components/modals/CreateCalendarModal';
import { ExportModal } from '$components/modals/ExportModal';
import { TagModal } from '$components/modals/TagModal';
import { Tooltip } from '$components/Tooltip';
import { useModalState } from '$context/modalStateContext';
import { settingsStore } from '$context/settingsContext';
import { getIconByName } from '$data/icons';
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
import { useGlobalContextMenuClose } from '$hooks/useGlobalContextMenu';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { toastManager } from '$hooks/useToast';
import { getCalendarTasks } from '$lib/store/tasks';
import type { Account, Calendar as CalendarType } from '$types/index';
import { getContrastTextColor } from '$utils/color';
import { FALLBACK_ITEM_COLOR, MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH } from '$utils/constants';
import { getMetaKeyLabel, getModifierJoiner } from '$utils/keyboard';
import { MENU_EVENTS } from '$utils/menu';
import { clampToViewport } from '$utils/position';

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
    const currentAccountIds = accounts.map((a) => a.id);
    const newAccountIds = currentAccountIds.filter(
      (id) => !initializedAccountIdsRef.current.has(id),
    );

    if (newAccountIds.length > 0) {
      // Mark these accounts as initialized
      for (const id of newAccountIds) {
        initializedAccountIdsRef.current.add(id);
      }

      // If they should be expanded by default, add them to the expanded list
      if (defaultAccountsExpanded) {
        setExpandedAccountIds([...expandedAccountIds, ...newAccountIds]);
      }
    }
  }, [accounts, defaultAccountsExpanded, setExpandedAccountIds, expandedAccountIds]);

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

  // Resizing logic
  const [isResizing, setIsResizing] = useState(false);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Track last menu close time to prevent immediate reopening
  const lastMenuCloseTimeRef = useRef<number>(0);

  // Track transition state for smoother animations
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(!isCollapsed);
  const [showCollapsedContent, setShowCollapsedContent] = useState(isCollapsed);

  // Handle content visibility during transitions
  useEffect(() => {
    if (isCollapsed) {
      // Collapsing: hide expanded content immediately, show collapsed after transition
      setShowExpandedContent(false);
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setShowCollapsedContent(true);
        setIsTransitioning(false);
      }, 100); // Match transition duration
      return () => clearTimeout(timer);
    } else {
      // Expanding: hide collapsed content immediately, show expanded after transition
      setShowCollapsedContent(false);
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setShowExpandedContent(true);
        setIsTransitioning(false);
      }, 100); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX));
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const toggleAccount = (id: string) => {
    toggleAccountExpanded(id);
  };

  const handleExpandAllAccounts = () => {
    const allAccountIds = accounts.map((a) => a.id);
    setExpandedAccountIds(allAccountIds);
    // Also expand the accounts section itself
    settingsStore.setState({ accountsSectionCollapsed: false });
  };

  const handleCollapseAllAccounts = () => {
    setExpandedAccountIds([]);
    // Also collapse the accounts section itself
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

    // If the context menu is already open for this exact item, close it
    if (contextMenu && contextMenu.type === type && contextMenu.id === id) {
      setContextMenu(null);
      // Set timestamp to prevent immediate reopening
      lastMenuCloseTimeRef.current = Date.now();
      return;
    }

    // Prevent reopening if menu was just closed (within 250ms)
    // This handles race conditions with React state updates
    const timeSinceClose = Date.now() - lastMenuCloseTimeRef.current;
    if (timeSinceClose < 100) {
      return;
    }

    // dispatch event to close other context menus first
    document.dispatchEvent(new CustomEvent('closeAllContextMenus'));
    const { x, y } = clampToViewport(e.clientX, e.clientY);
    setContextMenu({ type, id, accountId, x, y });
  };

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
    lastMenuCloseTimeRef.current = Date.now(); // Prevent immediate reopening
  }, []);

  // register for global context menu close
  useGlobalContextMenuClose(handleCloseContextMenu, contextMenu !== null);

  const getTaskCount = (calendarId: string) => {
    return tasks.filter((t) => t.calendarId === calendarId && !t.completed).length;
  };

  const getTotalActiveTaskCount = () => {
    return tasks.filter((t) => !t.completed).length;
  };

  const getTagTaskCount = (tagId: string) => {
    return tasks.filter((t) => (t.tags || []).includes(tagId) && !t.completed).length;
  };

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Container onClick for closing context menu on outside click */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Container onClick for closing context menu on outside click */}
      <div
        className={`bg-surface-100 dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700 flex flex-col h-full relative overflow-hidden ${!isResizing ? 'transition-[width] duration-200 ease-in-out' : ''}`}
        style={{ width: isCollapsed ? 48 : width }}
        onClick={handleCloseContextMenu}
      >
        {/* Resize handle */}
        {!isCollapsed && !isTransitioning && (
          // biome-ignore lint/a11y/noStaticElementInteractions: Resize handle requires mouse events for drag functionality
          <div
            ref={resizeHandleRef}
            onMouseDown={handleResizeStart}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary-400 dark:hover:bg-primary-600 transition-colors z-10"
          />
        )}

        <div className="h-[53px] px-2 flex items-center justify-center border-b border-surface-200 dark:border-surface-700 shrink-0">
          {isCollapsed ? (
            <Tooltip content="Expand sidebar" position="right">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-2 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            </Tooltip>
          ) : (
            <div
              className={`flex items-center flex-1 px-2 transition-opacity duration-150 ${showExpandedContent ? 'opacity-100' : 'opacity-0'}`}
            >
              <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2 flex-1 min-w-0">
                <FolderKanban className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
                <span className="truncate">caldav-tasks</span>
              </h1>
              <Tooltip content="Collapse sidebar" position="bottom">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-1.5 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>

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

              <div>
                {/* biome-ignore lint/a11y/useSemanticElements: Section header toggle div contains icon+text layout that button element can't replicate */}
                <div
                  onClick={toggleAccountsSectionCollapsed}
                  onKeyDown={(e) => e.key === 'Enter' && toggleAccountsSectionCollapsed()}
                  onContextMenu={(e) => handleContextMenu(e, 'accounts-section', 'accounts')}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between px-3.5 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                >
                  <div className="flex items-center gap-1.5">
                    {accountsSectionCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-surface-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-surface-400" />
                    )}
                    <span className="text-sm font-semibold text-surface-500 dark:text-surface-400 tracking-wider">
                      Accounts
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip content="Import tasks" position="top">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenImport?.();
                        }}
                        className={`p-1 rounded ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''} text-surface-500 dark:text-surface-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
                      >
                        <Import className="w-4 h-4" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Add account" position="top">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAccount(null);
                          setShowAccountModal(true);
                        }}
                        className={`p-1 rounded ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''} text-surface-500 dark:text-surface-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {!accountsSectionCollapsed &&
                  (accounts.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-surface-500 dark:text-surface-400">
                      No accounts connected yet.
                    </div>
                  ) : (
                    accounts.map((account) => (
                      <div key={account.id} data-context-menu>
                        {/* biome-ignore lint/a11y/useSemanticElements: Account toggle div contains icon+text layout that button element can't replicate */}
                        <div
                          onClick={() => toggleAccount(account.id)}
                          onKeyDown={(e) => e.key === 'Enter' && toggleAccount(account.id)}
                          onContextMenu={(e) => handleContextMenu(e, 'account', account.id)}
                          role="button"
                          tabIndex={0}
                          className={`relative w-full flex items-center gap-2 px-4 py-1.5 text-sm ${!isAnyModalOpen ? 'hover:bg-surface-200 dark:hover:bg-surface-700' : ''} transition-colors group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
                        >
                          {expandedAccounts.has(account.id) ? (
                            <ChevronDown className="w-4 h-4 text-surface-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-surface-400 flex-shrink-0" />
                          )}
                          <User className="w-4 h-4 text-surface-500 dark:text-surface-400 flex-shrink-0" />
                          <span className="flex-1 text-left truncate min-w-0 text-surface-600 dark:text-surface-400 group-hover:pr-2">
                            {account.name}
                          </span>
                          <div className="flex items-center gap-1 w-0 overflow-hidden group-hover:w-auto focus-within:w-auto transition-all">
                            <Tooltip content="Add a new calendar" position="top">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowCreateCalendarModal(account.id);
                                }}
                                onContextMenu={(e) => {
                                  e.stopPropagation();
                                  handleContextMenu(e, 'account', account.id);
                                }}
                                className={`p-1.5 rounded bg-transparent ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-600 dark:hover:text-surface-300' : ''} text-surface-400 transition-colors flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Account menu" position="top">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleContextMenu(
                                    e as React.MouseEvent<HTMLButtonElement>,
                                    'account',
                                    account.id,
                                  );
                                }}
                                onContextMenu={(e) => {
                                  e.stopPropagation();
                                  handleContextMenu(e, 'account', account.id);
                                }}
                                className="p-1.5 rounded bg-transparent hover:bg-surface-300 dark:hover:bg-surface-600 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </Tooltip>
                          </div>
                        </div>

                        {expandedAccounts.has(account.id) && (
                          <div>
                            {account.calendars.length === 0 ? (
                              <div className="px-4 py-2 text-sm text-surface-500 dark:text-surface-400">
                                No calendars yet.
                              </div>
                            ) : (
                              account.calendars.map((calendar) => {
                                const CalendarIcon = getIconByName(calendar.icon ?? 'calendar');
                                const isActive = activeCalendarId === calendar.id;
                                const calendarColor = calendar.color ?? FALLBACK_ITEM_COLOR;
                                const textColor = isActive
                                  ? getContrastTextColor(calendarColor)
                                  : undefined;
                                return (
                                  <button
                                    type="button"
                                    key={calendar.id}
                                    data-context-menu
                                    onClick={() => {
                                      setActiveAccountMutation.mutate(account.id);
                                      setActiveCalendarMutation.mutate(calendar.id);
                                    }}
                                    onContextMenu={(e) =>
                                      handleContextMenu(e, 'calendar', calendar.id, account.id)
                                    }
                                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                                      isActive
                                        ? ''
                                        : `text-surface-600 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-200 dark:hover:bg-surface-700' : ''}`
                                    }`}
                                    style={
                                      isActive
                                        ? { backgroundColor: calendarColor, color: textColor }
                                        : undefined
                                    }
                                  >
                                    {calendar.emoji ? (
                                      <span
                                        className="text-xs leading-none"
                                        style={{ color: isActive ? textColor : calendarColor }}
                                      >
                                        {calendar.emoji}
                                      </span>
                                    ) : (
                                      <CalendarIcon
                                        className="w-4 h-4"
                                        style={{ color: isActive ? textColor : calendarColor }}
                                      />
                                    )}
                                    <span className="flex-1 text-left truncate">
                                      {calendar.displayName}
                                    </span>
                                    <span className="text-xs">{getTaskCount(calendar.id)}</span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ))}
              </div>

              <div>
                {/* biome-ignore lint/a11y/useSemanticElements: Section header toggle div contains icon+text layout that button element can't replicate */}
                <div
                  onClick={toggleTagsSectionCollapsed}
                  onKeyDown={(e) => e.key === 'Enter' && toggleTagsSectionCollapsed()}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between px-3.5 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                >
                  <div className="flex items-center gap-1.5">
                    {tagsSectionCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-surface-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-surface-400" />
                    )}
                    <span className="text-sm font-semibold text-surface-500 dark:text-surface-400 tracking-wider">
                      Tags
                    </span>
                  </div>
                  <Tooltip content="Add a new tag" position="top">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTagId(null);
                        setShowTagModal(true);
                      }}
                      className={`p-1 rounded ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''} text-surface-500 dark:text-surface-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>

                {!tagsSectionCollapsed &&
                  (tags.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-surface-500 dark:text-surface-400">
                      No tags yet.
                    </div>
                  ) : (
                    tags.map((tag) => {
                      const TagIcon = getIconByName(tag.icon ?? 'tag');
                      const isActive = activeTagId === tag.id;
                      return (
                        <button
                          type="button"
                          key={tag.id}
                          data-context-menu
                          onClick={() => setActiveTagMutation.mutate(tag.id)}
                          onContextMenu={(e) => handleContextMenu(e, 'tag', tag.id)}
                          className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                            isActive
                              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                              : `text-surface-600 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-200 dark:hover:bg-surface-700' : ''}`
                          }`}
                          style={
                            isActive
                              ? {
                                  backgroundColor: tag.color,
                                  color: getContrastTextColor(tag.color),
                                }
                              : undefined
                          }
                        >
                          {tag.emoji ? (
                            <span
                              className="text-xs leading-none"
                              style={{
                                color: isActive ? getContrastTextColor(tag.color) : tag.color,
                              }}
                            >
                              {tag.emoji}
                            </span>
                          ) : (
                            <TagIcon
                              className="w-3.5 h-3.5"
                              style={{
                                color: isActive ? getContrastTextColor(tag.color) : tag.color,
                              }}
                            />
                          )}
                          <span className="flex-1 text-left truncate">{tag.name}</span>
                          <span className="text-xs">{getTagTaskCount(tag.id)}</span>
                        </button>
                      );
                    })
                  ))}
              </div>
            </div>

            <div className="border-t border-surface-200 dark:border-surface-700 flex flex-col justify-between py-2">
              {updateAvailable && (
                <button
                  type="button"
                  onClick={() => onUpdateClick?.()}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                >
                  <Download className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  Update available!
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenSettings?.()}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-600 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-200 dark:hover:bg-surface-700' : ''} transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
              >
                <Settings className="w-4 h-4" />
                Settings
                <span className="ml-auto text-xs text-surface-400">{settingsShortcut}</span>
              </button>
            </div>
          </div>
        )}

        {/* Collapsed state - show icons for navigation */}
        {isCollapsed && (
          <div
            className={`flex-1 flex flex-col items-center py-2 gap-1 overflow-y-auto transition-opacity duration-150 ${showCollapsedContent ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            {/* All Tasks */}
            <Tooltip content="All Tasks" position="right">
              <button
                type="button"
                onClick={() => {
                  setAllTasksViewMutation.mutate();
                  setActiveAccountMutation.mutate(null);
                }}
                className={`p-2 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                  activeCalendarId === null && activeTagId === null
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                }`}
              >
                <Inbox className="w-5 h-5" />
              </button>
            </Tooltip>

            {/* Separator */}
            <div className="w-6 h-px bg-surface-200 dark:bg-surface-700 my-1" />

            {/* Calendars */}
            {accounts.flatMap((account) =>
              account.calendars.map((calendar) => {
                const CalendarIcon = getIconByName(calendar.icon ?? 'calendar');
                const isActive = activeCalendarId === calendar.id;
                const calendarColor = calendar.color ?? FALLBACK_ITEM_COLOR;
                return (
                  <Tooltip key={calendar.id} content={calendar.displayName} position="right">
                    <button
                      type="button"
                      data-context-menu
                      onClick={() => {
                        setActiveAccountMutation.mutate(account.id);
                        setActiveCalendarMutation.mutate(calendar.id);
                      }}
                      onContextMenu={(e) =>
                        handleContextMenu(e, 'calendar', calendar.id, account.id)
                      }
                      className={`p-2 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/30'
                          : 'hover:bg-surface-200 dark:hover:bg-surface-700'
                      }`}
                      style={
                        isActive
                          ? {
                              backgroundColor: calendarColor,
                              color: getContrastTextColor(calendarColor),
                            }
                          : undefined
                      }
                    >
                      {calendar.emoji ? (
                        <span
                          className="text-base leading-none"
                          style={{
                            color: isActive ? getContrastTextColor(calendarColor) : calendarColor,
                          }}
                        >
                          {calendar.emoji}
                        </span>
                      ) : (
                        <CalendarIcon
                          className="w-5 h-5"
                          style={{
                            color: isActive ? getContrastTextColor(calendarColor) : calendarColor,
                          }}
                        />
                      )}
                    </button>
                  </Tooltip>
                );
              }),
            )}

            {/* Tags section separator */}
            {tags.length > 0 && (
              <div className="w-6 h-px bg-surface-200 dark:bg-surface-700 my-1" />
            )}

            {/* Tags */}
            {tags.map((tag) => {
              const isActive = activeTagId === tag.id;
              const TagIcon = getIconByName(tag.icon ?? 'tag');
              return (
                <Tooltip key={tag.id} content={tag.name} position="right">
                  <button
                    type="button"
                    data-context-menu
                    onClick={() => {
                      setActiveTagMutation.mutate(tag.id);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, 'tag', tag.id)}
                    className={`p-2 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30'
                        : 'hover:bg-surface-200 dark:hover:bg-surface-700'
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: tag.color, color: getContrastTextColor(tag.color) }
                        : undefined
                    }
                  >
                    {tag.emoji ? (
                      <span
                        className="text-base leading-none"
                        style={{
                          color: isActive ? getContrastTextColor(tag.color) : tag.color,
                        }}
                      >
                        {tag.emoji}
                      </span>
                    ) : (
                      <TagIcon
                        className="w-5 h-5"
                        style={{ color: isActive ? getContrastTextColor(tag.color) : tag.color }}
                      />
                    )}
                  </button>
                </Tooltip>
              );
            })}

            {/* Settings at bottom */}
            <div className="mt-auto flex flex-col pt-2 border-t border-surface-200 dark:border-surface-700">
              {updateAvailable && (
                <Tooltip content="Update available!" position="right">
                  <button
                    type="button"
                    onClick={() => onUpdateClick?.()}
                    className="p-2 mb-1 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                  >
                    <Download className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </button>
                </Tooltip>
              )}
              <Tooltip content="Settings" position="right">
                <button
                  type="button"
                  onClick={() => onOpenSettings?.()}
                  className="p-2 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        // biome-ignore lint/a11y/noStaticElementInteractions: Context menu container uses stopPropagation to prevent backdrop close
        // biome-ignore lint/a11y/useKeyWithClickEvents: Context menu container uses stopPropagation to prevent backdrop close
        <div
          data-context-menu-content
          className="fixed bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 z-50 animate-scale-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {contextMenu.type === 'account' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowCreateCalendarModal(contextMenu.id);
                  handleCloseContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
              >
                <Plus className="w-4 h-4" />
                New Calendar
              </button>

              <div className="border-t border-surface-200 dark:border-surface-700" />

              <button
                type="button"
                onClick={async () => {
                  const account = accounts.find((a) => a.id === contextMenu.id);
                  if (account) {
                    setEditingAccount(account);
                    setShowAccountModal(true);
                  }
                  handleCloseContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>

              <div className="border-t border-surface-200 dark:border-surface-700" />

              <button
                type="button"
                onClick={() => {
                  setExportAccountId(contextMenu.id);
                  setShowExportModal(true);
                  handleCloseContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
              >
                <Share2 className="w-4 h-4" />
                Export Calendars
              </button>

              <div className="border-t border-surface-200 dark:border-surface-700" />

              <button
                type="button"
                onClick={async () => {
                  handleCloseContextMenu();
                  await handleDeleteAccount(contextMenu.id, accounts);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}

          {contextMenu.type === 'calendar' && (
            <>
              <button
                type="button"
                onClick={() => {
                  handleCloseContextMenu();
                  const account = accounts.find((a) => a.id === contextMenu.accountId);
                  const calendar = account?.calendars.find((c) => c.id === contextMenu.id);
                  syncCalendar(contextMenu.id).catch((error) => {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    toastManager.error(
                      `Calendar sync failed: ${calendar?.displayName || 'Unknown'}`,
                      errorMessage,
                      `sync-error-calendar-${contextMenu.id}`,
                      {
                        label: 'Edit Account',
                        onClick: () => {
                          emit(MENU_EVENTS.EDIT_ACCOUNT, { accountId: account?.id });
                        },
                      },
                    );
                  });
                }}
                disabled={syncingCalendarId === contextMenu.id}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  syncingCalendarId === contextMenu.id
                    ? 'text-surface-400 dark:text-surface-500 cursor-not-allowed'
                    : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                }`}
              >
                <RefreshCw
                  className={`w-4 h-4 ${syncingCalendarId === contextMenu.id ? 'animate-spin' : ''}`}
                />
                {syncingCalendarId === contextMenu.id ? 'Syncing...' : 'Sync'}
              </button>

              <div className="border-t border-surface-200 dark:border-surface-700" />

              <button
                type="button"
                onClick={async () => {
                  if (contextMenu.accountId) {
                    const account = accounts.find((a) => a.id === contextMenu.accountId);
                    const calendar = account?.calendars.find((c) => c.id === contextMenu.id);
                    if (calendar) {
                      setEditingCalendar({ calendar, accountId: contextMenu.accountId });
                      setShowCalendarModal(true);
                    }
                  }
                  handleCloseContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>

              <div className="border-t border-surface-200 dark:border-surface-700" />

              <button
                type="button"
                onClick={() => {
                  setExportCalendarId(contextMenu.id);
                  setShowExportModal(true);
                  handleCloseContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
              >
                <Share2 className="w-4 h-4" />
                Export
              </button>

              <div className="border-t border-surface-200 dark:border-surface-700" />

              <button
                type="button"
                onClick={async () => {
                  handleCloseContextMenu();
                  if (contextMenu.accountId) {
                    await handleDeleteCalendar(
                      contextMenu.id,
                      contextMenu.accountId,
                      accounts,
                      activeCalendarId,
                    );
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}

          {contextMenu.type === 'accounts-section' && (
            <>
              <button
                type="button"
                onClick={() => {
                  handleExpandAllAccounts();
                  handleCloseContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-t-md"
              >
                <ChevronDown className="w-4 h-4" />
                Expand All
              </button>

              <div className="border-t border-surface-200 dark:border-surface-700" />

              <button
                type="button"
                onClick={() => {
                  handleCollapseAllAccounts();
                  handleCloseContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
              >
                <ChevronRight className="w-4 h-4" />
                Collapse All
              </button>
            </>
          )}

          {contextMenu.type === 'tag' && (
            <>
              <button
                type="button"
                onClick={async () => {
                  setEditingTagId(contextMenu.id);
                  setShowTagModal(true);
                  handleCloseContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>

              <div className="border-t border-surface-200 dark:border-surface-700" />

              <button
                type="button"
                onClick={async () => {
                  handleCloseContextMenu();
                  await handleDeleteTag(contextMenu.id, tags);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
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
        <CreateCalendarModal
          accountId={showCreateCalendarModal}
          onClose={() => setShowCreateCalendarModal(null)}
        />
      )}

      {showExportModal && exportCalendarId && (
        <ExportModal
          tasks={getCalendarTasks(exportCalendarId)}
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
