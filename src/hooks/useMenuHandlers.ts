import { useCallback, useMemo, useRef, useState } from 'react';
import { useModalState } from '$context/modalStateContext';
import { useAccountDeletion } from '$hooks/deletion/useAccountDeletion';
import { useCalendarDeletion } from '$hooks/deletion/useCalendarDeletion';
import { useTaskDeletion } from '$hooks/deletion/useTaskDeletion';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useFilters } from '$hooks/queries/useFilters';
import { useTags } from '$hooks/queries/useTags';
import { useCreateTask } from '$hooks/queries/useTasks';
import {
  useSetActiveAccount,
  useSetActiveCalendar,
  useSetActiveFilter,
  useSetActiveTag,
  useSetAllTasksView,
  useSetRecentlyDeletedView,
  useSetSelectedTask,
  useSetShowCompletedTasks,
  useSetShowUnstartedTasks,
  useSetSortConfig,
  useUIState,
} from '$hooks/queries/useUIState';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { useMenuEvents } from '$hooks/system/useMenuEvents';
import type { SettingsCategory, SettingsSubtab, SortDirection, SortMode } from '$types';

export const useMenuHandlers = (
  onSync?: () => void,
  onCheckForUpdates?: () => void,
  onShowChangelog?: () => void,
  onSyncCalendar?: (calendarId: string) => void,
) => {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<{
    category?: SettingsCategory;
    subtab?: SettingsSubtab;
  }>({});
  const [showImport, setShowImport] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [showCreateCalendar, setShowCreateCalendar] = useState(false);
  const [showTaskActions, setShowTaskActions] = useState(false);
  const [taskActionsId, setTaskActionsId] = useState<string | null>(null);
  const [createCalendarAccountId, setCreateCalendarAccountId] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<{
    calendarId: string;
    accountId: string;
  } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCalendarId, setExportCalendarId] = useState<string | null>(null);

  const createTaskMutation = useCreateTask();
  const setSelectedTaskMutation = useSetSelectedTask();
  const { data: accounts = [] } = useAccounts();
  const { data: tags = [] } = useTags();
  const { data: filters = [] } = useFilters();
  const { data: uiState } = useUIState();
  const setShowCompletedMutation = useSetShowCompletedTasks();
  const setShowUnstartedMutation = useSetShowUnstartedTasks();
  const setSortConfigMutation = useSetSortConfig();
  const setActiveAccountMutation = useSetActiveAccount();
  const setActiveCalendarMutation = useSetActiveCalendar();
  const setActiveTagMutation = useSetActiveTag();
  const setActiveFilterMutation = useSetActiveFilter();
  const setAllTasksViewMutation = useSetAllTasksView();
  const setRecentlyDeletedViewMutation = useSetRecentlyDeletedView();
  const { toggleSidebarCollapsed } = useSettingsStore();
  const { isAnyModalOpen } = useModalState();
  const { moveTaskToRecentlyDeleted } = useTaskDeletion();
  const { deleteAccount } = useAccountDeletion();
  const { deleteCalendar } = useCalendarDeletion();

  // Separate refs for each callback to avoid object reference changes
  const onNewTaskRef = useRef<(() => void) | null>(null);
  const onOpenSettingsRef = useRef<(() => void) | null>(null);
  const onOpenImportRef = useRef<(() => void) | null>(null);
  const onOpenAccountRef = useRef<(() => void) | null>(null);
  const onEditAccountRef = useRef<((accountId: string) => void) | null>(null);
  const onOpenCreateCalendarRef = useRef<(() => void) | null>(null);
  const onSearchRef = useRef<(() => void) | null>(null);
  const onOpenAboutRef = useRef<(() => void) | null>(null);
  const onOpenKeyboardShortcutsRef = useRef<(() => void) | null>(null);
  const onToggleCompletedRef = useRef<((currentValue: boolean) => void) | null>(null);
  const onToggleUnstartedRef = useRef<((currentValue: boolean) => void) | null>(null);
  const onSyncRef = useRef<(() => void) | null>(null);
  const onSetSortModeRef = useRef<
    ((mode: SortMode, currentMode: SortMode, currentDirection: SortDirection) => void) | null
  >(null);
  const onSetSortDirectionRef = useRef<
    ((direction: SortDirection, currentMode: SortMode) => void) | null
  >(null);
  const onToggleSidebarRef = useRef<(() => void) | null>(null);
  const onDeleteTaskRef = useRef<(() => void) | null>(null);
  const onNavPrevListRef = useRef<(() => void) | null>(null);
  const onNavNextListRef = useRef<(() => void) | null>(null);
  const onCheckForUpdatesRef = useRef<(() => void) | null>(null);
  const onShowChangelogRef = useRef<(() => void) | null>(null);
  const onRemoveAccountRef = useRef<((accountId: string) => void) | null>(null);
  const onSyncCalendarRef = useRef<((calendarId: string, accountId: string) => void) | null>(null);
  const onEditCalendarRef = useRef<((calendarId: string, accountId: string) => void) | null>(null);
  const onExportCalendarRef = useRef<((calendarId: string, accountId: string) => void) | null>(
    null,
  );
  const onDeleteCalendarRef = useRef<((calendarId: string, accountId: string) => void) | null>(
    null,
  );

  const handleNewTask = useCallback(() => {
    createTaskMutation.mutate(
      { title: '' },
      {
        onSuccess: (task) => {
          setSelectedTaskMutation.mutate(task.id);
        },
      },
    );
  }, [createTaskMutation, setSelectedTaskMutation]);

  const handleOpenSettings = useCallback(() => {
    if (isAnyModalOpen) return;
    setSettingsInitialTab({});
    setShowSettings(true);
  }, [isAnyModalOpen]);

  const handleOpenImport = useCallback(() => {
    if (isAnyModalOpen) return;
    setShowImport(true);
  }, [isAnyModalOpen]);

  const handleOpenAccount = useCallback(() => {
    if (isAnyModalOpen) return;
    setEditingAccountId(null);
    setShowAccountModal(true);
  }, [isAnyModalOpen]);

  const handleEditAccount = useCallback(
    (accountId: string) => {
      if (isAnyModalOpen) return;
      setEditingAccountId(accountId);
      setShowAccountModal(true);
    },
    [isAnyModalOpen],
  );

  const handleOpenCreateCalendar = useCallback(
    (accountId?: string) => {
      if (isAnyModalOpen) return;
      if (accounts.length > 0) {
        setCreateCalendarAccountId(accountId ?? accounts[0].id);
        setShowCreateCalendar(true);
      }
    },
    [accounts, isAnyModalOpen],
  );

  const handleOpenTaskActions = useCallback(
    (taskId: string) => {
      if (isAnyModalOpen) return;
      setTaskActionsId(taskId);
      setShowTaskActions(true);
    },
    [isAnyModalOpen],
  );

  const handleSearch = useCallback(() => {
    const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
    if (searchInput) {
      // Toggle focus: if already focused, blur it; otherwise focus and select
      if (document.activeElement === searchInput) {
        searchInput.blur();
      } else {
        searchInput.focus();
        searchInput.select();
      }
    }
  }, []);

  const handleOpenAbout = useCallback(() => {
    if (isAnyModalOpen) return;
    setSettingsInitialTab({ category: 'misc', subtab: 'about' });
    setShowSettings(true);
  }, [isAnyModalOpen]);

  const handleOpenKeyboardShortcuts = useCallback(() => {
    if (isAnyModalOpen) return;
    setSettingsInitialTab({ category: 'app', subtab: 'keyboard-shortcuts' });
    setShowSettings((prev) => !prev);
  }, [isAnyModalOpen]);

  const handleToggleCompleted = useCallback(
    (currentValue: boolean) => {
      setShowCompletedMutation.mutate(!currentValue);
    },
    [setShowCompletedMutation],
  );

  const handleToggleUnstarted = useCallback(
    (currentValue: boolean) => {
      setShowUnstartedMutation.mutate(!currentValue);
    },
    [setShowUnstartedMutation],
  );

  const handleSetSortMode = useCallback(
    (mode: SortMode, _currentMode: SortMode, currentDirection: SortDirection) => {
      setSortConfigMutation.mutate({ mode, direction: currentDirection });
    },
    [setSortConfigMutation],
  );

  const handleSetSortDirection = useCallback(
    (direction: SortDirection, currentMode: SortMode) => {
      setSortConfigMutation.mutate({ mode: currentMode, direction });
    },
    [setSortConfigMutation],
  );

  const handleToggleSidebar = useCallback(() => {
    toggleSidebarCollapsed();
  }, [toggleSidebarCollapsed]);

  const handleDeleteTask = useCallback(async () => {
    if (uiState?.activeView === 'recently-deleted') return;
    const selectedTaskId = uiState?.selectedTaskId ?? null;
    if (selectedTaskId) {
      await moveTaskToRecentlyDeleted(selectedTaskId);
    }
  }, [uiState?.activeView, uiState?.selectedTaskId, moveTaskToRecentlyDeleted]);

  type ListItem =
    | { type: 'all' }
    | { type: 'calendar'; accountId: string; calendarId: string }
    | { type: 'tag'; tagId: string }
    | { type: 'filter'; filterId: string }
    | { type: 'recently-deleted' };

  const orderedLists = useMemo((): ListItem[] => {
    const items: ListItem[] = [{ type: 'all' }, { type: 'recently-deleted' }];
    for (const filter of filters) {
      items.push({ type: 'filter', filterId: filter.id });
    }
    for (const account of accounts) {
      for (const cal of account.calendars) {
        items.push({ type: 'calendar', accountId: account.id, calendarId: cal.id });
      }
    }
    for (const tag of tags) {
      items.push({ type: 'tag', tagId: tag.id });
    }
    return items;
  }, [accounts, filters, tags]);

  const activeCalendarId = uiState?.activeCalendarId ?? null;
  const activeTagId = uiState?.activeTagId ?? null;
  const activeFilterId = uiState?.activeFilterId ?? null;
  const activeView = uiState?.activeView ?? 'tasks';

  const currentListIndex = useMemo(() => {
    if (activeView === 'recently-deleted') {
      return orderedLists.findIndex((item) => item.type === 'recently-deleted');
    }
    if (activeView === 'filter' && activeFilterId !== null) {
      return orderedLists.findIndex(
        (item) => item.type === 'filter' && item.filterId === activeFilterId,
      );
    }
    if (activeTagId !== null) {
      return orderedLists.findIndex((item) => item.type === 'tag' && item.tagId === activeTagId);
    }
    if (activeCalendarId !== null) {
      return orderedLists.findIndex(
        (item) => item.type === 'calendar' && item.calendarId === activeCalendarId,
      );
    }
    return 0;
  }, [orderedLists, activeCalendarId, activeFilterId, activeTagId, activeView]);

  const activateListItem = useCallback(
    (item: ListItem) => {
      if (item.type === 'all') {
        setAllTasksViewMutation.mutate();
        setActiveAccountMutation.mutate(null);
      } else if (item.type === 'calendar') {
        setActiveAccountMutation.mutate(item.accountId);
        setActiveCalendarMutation.mutate(item.calendarId);
      } else if (item.type === 'tag') {
        setActiveTagMutation.mutate(item.tagId);
      } else if (item.type === 'filter') {
        setActiveFilterMutation.mutate(item.filterId);
      } else {
        setRecentlyDeletedViewMutation.mutate();
      }
    },
    [
      setAllTasksViewMutation,
      setActiveAccountMutation,
      setActiveCalendarMutation,
      setActiveFilterMutation,
      setActiveTagMutation,
      setRecentlyDeletedViewMutation,
    ],
  );

  const handleNavPrevList = useCallback(() => {
    const prevIndex = Math.max(0, currentListIndex - 1);
    if (prevIndex !== currentListIndex) activateListItem(orderedLists[prevIndex]);
  }, [orderedLists, currentListIndex, activateListItem]);

  const handleNavNextList = useCallback(() => {
    const nextIndex = Math.min(orderedLists.length - 1, currentListIndex + 1);
    if (nextIndex !== currentListIndex) activateListItem(orderedLists[nextIndex]);
  }, [orderedLists, currentListIndex, activateListItem]);

  const handleRemoveAccount = useCallback(
    async (accountId: string) => {
      await deleteAccount(accountId, accounts);
    },
    [accounts, deleteAccount],
  );

  const handleSyncCalendar = useCallback(
    (calendarId: string) => {
      onSyncCalendar?.(calendarId);
    },
    [onSyncCalendar],
  );

  const handleEditCalendar = useCallback(
    (calendarId: string, accountId: string) => {
      if (isAnyModalOpen) return;
      setEditingCalendar({ calendarId, accountId });
      setShowCalendarModal(true);
    },
    [isAnyModalOpen],
  );

  const handleExportCalendar = useCallback(
    (calendarId: string) => {
      if (isAnyModalOpen) return;
      setExportCalendarId(calendarId);
      setShowExportModal(true);
    },
    [isAnyModalOpen],
  );

  const handleDeleteCalendar = useCallback(
    async (calendarId: string, accountId: string) => {
      await deleteCalendar(calendarId, accountId, accounts, activeCalendarId);
    },
    [accounts, activeCalendarId, deleteCalendar],
  );

  // Update refs with latest callbacks
  onNewTaskRef.current = handleNewTask;
  onOpenSettingsRef.current = handleOpenSettings;
  onOpenImportRef.current = handleOpenImport;
  onEditAccountRef.current = handleEditAccount;
  onOpenAccountRef.current = handleOpenAccount;
  onOpenCreateCalendarRef.current = handleOpenCreateCalendar;
  onSearchRef.current = handleSearch;
  onOpenAboutRef.current = handleOpenAbout;
  onOpenKeyboardShortcutsRef.current = handleOpenKeyboardShortcuts;
  onToggleCompletedRef.current = handleToggleCompleted;
  onToggleUnstartedRef.current = handleToggleUnstarted;
  onSyncRef.current = onSync ?? null;
  onSetSortModeRef.current = handleSetSortMode;
  onSetSortDirectionRef.current = handleSetSortDirection;
  onToggleSidebarRef.current = handleToggleSidebar;
  onDeleteTaskRef.current = handleDeleteTask;
  onNavPrevListRef.current = handleNavPrevList;
  onNavNextListRef.current = handleNavNextList;
  onCheckForUpdatesRef.current = isAnyModalOpen ? null : (onCheckForUpdates ?? null);
  onShowChangelogRef.current = isAnyModalOpen ? null : (onShowChangelog ?? null);
  onRemoveAccountRef.current = handleRemoveAccount;
  onSyncCalendarRef.current = handleSyncCalendar;
  onEditCalendarRef.current = handleEditCalendar;
  onExportCalendarRef.current = handleExportCalendar;
  onDeleteCalendarRef.current = handleDeleteCalendar;

  // Wire up menu events using refs
  useMenuEvents({
    onNewTask: onNewTaskRef,
    onOpenSettings: onOpenSettingsRef,
    onOpenImport: onOpenImportRef,
    onEditAccount: onEditAccountRef,
    onOpenAccount: onOpenAccountRef,
    onOpenCreateCalendar: onOpenCreateCalendarRef,
    onSearch: onSearchRef,
    onOpenAbout: onOpenAboutRef,
    onOpenKeyboardShortcuts: onOpenKeyboardShortcutsRef,
    onToggleCompleted: onToggleCompletedRef,
    onToggleUnstarted: onToggleUnstartedRef,
    onSync: onSyncRef,
    onSetSortMode: onSetSortModeRef,
    onSetSortDirection: onSetSortDirectionRef,
    onToggleSidebar: onToggleSidebarRef,
    onDeleteTask: onDeleteTaskRef,
    onNavPrevList: onNavPrevListRef,
    onNavNextList: onNavNextListRef,
    onCheckForUpdates: onCheckForUpdatesRef,
    onShowChangelog: onShowChangelogRef,
    onRemoveAccount: onRemoveAccountRef,
    onSyncCalendar: onSyncCalendarRef,
    onEditCalendar: onEditCalendarRef,
    onExportCalendar: onExportCalendarRef,
    onDeleteCalendar: onDeleteCalendarRef,
  });

  return {
    // Modal visibility state
    showSettings,
    showImport,
    showAccountModal,
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

    // Modal controls
    setShowSettings,
    setShowImport,
    setShowAccountModal,
    setEditingAccountId,
    setShowCreateCalendar,
    setSettingsInitialTab,
    setShowTaskActions,
    setTaskActionsId,
    setShowCalendarModal,
    setEditingCalendar,
    setShowExportModal,
    setExportCalendarId,

    // Handlers
    handleOpenSettings,
    handleOpenTaskActions,
  };
};
