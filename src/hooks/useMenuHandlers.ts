import { useCallback, useMemo, useRef, useState } from 'react';
import { useAccounts, useDeleteAccount, useDeleteCalendar } from '$hooks/queries/useAccounts';
import { useTags } from '$hooks/queries/useTags';
import { useCreateTask } from '$hooks/queries/useTasks';
import {
  useSetActiveAccount,
  useSetActiveCalendar,
  useSetActiveTag,
  useSetAllTasksView,
  useSetSelectedTask,
  useSetShowCompletedTasks,
  useSetShowUnstartedTasks,
  useSetSortConfig,
  useUIState,
} from '$hooks/queries/useUIState';
import { useConfirmDialog } from '$hooks/store/useConfirmDialog';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { useMenuEvents } from '$hooks/system/useMenuEvents';
import { useConfirmTaskDelete } from '$hooks/useConfirmTaskDelete';
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
  const { data: uiState } = useUIState();
  const setShowCompletedMutation = useSetShowCompletedTasks();
  const setShowUnstartedMutation = useSetShowUnstartedTasks();
  const setSortConfigMutation = useSetSortConfig();
  const setActiveAccountMutation = useSetActiveAccount();
  const setActiveCalendarMutation = useSetActiveCalendar();
  const setActiveTagMutation = useSetActiveTag();
  const setAllTasksViewMutation = useSetAllTasksView();
  const { toggleSidebarCollapsed } = useSettingsStore();
  const { confirmAndDelete } = useConfirmTaskDelete();
  const deleteAccountMutation = useDeleteAccount();
  const deleteCalendarMutation = useDeleteCalendar();
  const { confirm, close } = useConfirmDialog();

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
    setSettingsInitialTab({});
    setShowSettings(true);
  }, []);

  const handleOpenImport = useCallback(() => {
    setShowImport(true);
  }, []);

  const handleOpenAccount = useCallback(() => {
    setEditingAccountId(null);
    setShowAccountModal(true);
  }, []);

  const handleEditAccount = useCallback((accountId: string) => {
    setEditingAccountId(accountId);
    setShowAccountModal(true);
  }, []);

  const handleOpenCreateCalendar = useCallback(
    (accountId?: string) => {
      if (accounts.length > 0) {
        setCreateCalendarAccountId(accountId ?? accounts[0].id);
        setShowCreateCalendar(true);
      }
    },
    [accounts],
  );

  const handleOpenTaskActions = useCallback((taskId: string) => {
    setTaskActionsId(taskId);
    setShowTaskActions(true);
  }, []);

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
    setSettingsInitialTab({ category: 'misc', subtab: 'about' });
    setShowSettings(true);
  }, []);

  const handleOpenKeyboardShortcuts = useCallback(() => {
    setSettingsInitialTab({ category: 'app', subtab: 'keyboard-shortcuts' });
    setShowSettings((prev) => !prev);
  }, []);

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
    const selectedTaskId = uiState?.selectedTaskId ?? null;
    if (selectedTaskId) {
      await confirmAndDelete(selectedTaskId);
    }
  }, [uiState?.selectedTaskId, confirmAndDelete]);

  type ListItem =
    | { type: 'all' }
    | { type: 'calendar'; accountId: string; calendarId: string }
    | { type: 'tag'; tagId: string };

  const orderedLists = useMemo((): ListItem[] => {
    const items: ListItem[] = [{ type: 'all' }];
    for (const account of accounts) {
      for (const cal of account.calendars) {
        items.push({ type: 'calendar', accountId: account.id, calendarId: cal.id });
      }
    }
    for (const tag of tags) {
      items.push({ type: 'tag', tagId: tag.id });
    }
    return items;
  }, [accounts, tags]);

  const activeCalendarId = uiState?.activeCalendarId ?? null;
  const activeTagId = uiState?.activeTagId ?? null;

  const currentListIndex = useMemo(() => {
    if (activeTagId !== null) {
      return orderedLists.findIndex((item) => item.type === 'tag' && item.tagId === activeTagId);
    }
    if (activeCalendarId !== null) {
      return orderedLists.findIndex(
        (item) => item.type === 'calendar' && item.calendarId === activeCalendarId,
      );
    }
    return 0;
  }, [orderedLists, activeCalendarId, activeTagId]);

  const activateListItem = useCallback(
    (item: ListItem) => {
      if (item.type === 'all') {
        setAllTasksViewMutation.mutate();
        setActiveAccountMutation.mutate(null);
      } else if (item.type === 'calendar') {
        setActiveAccountMutation.mutate(item.accountId);
        setActiveCalendarMutation.mutate(item.calendarId);
      } else {
        setActiveTagMutation.mutate(item.tagId);
      }
    },
    [
      setAllTasksViewMutation,
      setActiveAccountMutation,
      setActiveCalendarMutation,
      setActiveTagMutation,
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
      const account = accounts.find((a) => a.id === accountId);
      const name = account?.name ?? 'this account';
      const confirmed = await confirm({
        title: 'Remove Account',
        message: `Are you sure you want to remove "${name}"? All associated calendars and tasks will be deleted.`,
        confirmLabel: 'Remove',
      });
      close();
      if (confirmed) {
        deleteAccountMutation.mutate(accountId);
      }
    },
    [accounts, close, confirm, deleteAccountMutation],
  );

  const handleSyncCalendar = useCallback(
    (calendarId: string) => {
      onSyncCalendar?.(calendarId);
    },
    [onSyncCalendar],
  );

  const handleEditCalendar = useCallback((calendarId: string, accountId: string) => {
    setEditingCalendar({ calendarId, accountId });
    setShowCalendarModal(true);
  }, []);

  const handleExportCalendar = useCallback((calendarId: string) => {
    setExportCalendarId(calendarId);
    setShowExportModal(true);
  }, []);

  const handleDeleteCalendar = useCallback(
    async (calendarId: string, accountId: string) => {
      const account = accounts.find((a) => a.id === accountId);
      const calendar = account?.calendars.find((c) => c.id === calendarId);
      const confirmed = await confirm({
        title: 'Delete calendar',
        subtitle: calendar?.displayName,
        message: 'Are you sure? This calendar and all its tasks will be deleted from the server.',
        confirmLabel: 'Delete',
        destructive: true,
      });
      close();
      if (confirmed) {
        deleteCalendarMutation.mutate({ accountId, calendarId });
      }
    },
    [accounts, close, confirm, deleteCalendarMutation],
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
  onCheckForUpdatesRef.current = onCheckForUpdates ?? null;
  onShowChangelogRef.current = onShowChangelog ?? null;
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
