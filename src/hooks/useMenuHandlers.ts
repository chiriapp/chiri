import { useCallback, useRef, useState } from 'react';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useCreateTask } from '$hooks/queries/useTasks';
import {
  useSetSelectedTask,
  useSetShowCompletedTasks,
  useSetShowUnstartedTasks,
  useSetSortConfig,
} from '$hooks/queries/useUIState';
import { useMenuEvents } from '$hooks/useMenuEvents';
import type { SettingsCategory, SettingsSubtab, SortDirection, SortMode } from '$types/index';

export const useMenuHandlers = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<{
    category?: SettingsCategory;
    subtab?: SettingsSubtab;
  }>({});
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [showCreateCalendar, setShowCreateCalendar] = useState(false);

  const createTaskMutation = useCreateTask();
  const setSelectedTaskMutation = useSetSelectedTask();
  const { data: accounts = [] } = useAccounts();
  const setShowCompletedMutation = useSetShowCompletedTasks();
  const setShowUnstartedMutation = useSetShowUnstartedTasks();
  const setSortConfigMutation = useSetSortConfig();

  // Separate refs for each callback to avoid object reference changes
  const onNewTaskRef = useRef<(() => void) | null>(null);
  const onOpenSettingsRef = useRef<(() => void) | null>(null);
  const onOpenImportRef = useRef<(() => void) | null>(null);
  const onOpenExportRef = useRef<(() => void) | null>(null);
  const onOpenAccountRef = useRef<(() => void) | null>(null);
  const onEditAccountRef = useRef<((accountId: string) => void) | null>(null);
  const onOpenCreateCalendarRef = useRef<(() => void) | null>(null);
  const onSearchRef = useRef<(() => void) | null>(null);
  const onOpenAboutRef = useRef<(() => void) | null>(null);
  const onOpenKeyboardShortcutsRef = useRef<(() => void) | null>(null);
  const onToggleCompletedRef = useRef<((currentValue: boolean) => void) | null>(null);
  const onToggleUnstartedRef = useRef<((currentValue: boolean) => void) | null>(null);
  const onSetSortModeRef = useRef<
    ((mode: SortMode, currentMode: SortMode, currentDirection: SortDirection) => void) | null
  >(null);

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

  const handleOpenExport = useCallback(() => {
    setShowExport(true);
  }, []);

  const handleOpenAccount = useCallback(() => {
    setEditingAccountId(null);
    setShowAccountModal(true);
  }, []);

  const handleEditAccount = useCallback((accountId: string) => {
    setEditingAccountId(accountId);
    setShowAccountModal(true);
  }, []);

  const handleOpenCreateCalendar = useCallback(() => {
    if (accounts.length > 0) {
      setShowCreateCalendar(true);
    }
  }, [accounts.length]);

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
    setSettingsInitialTab({ category: 'about', subtab: 'version' });
    setShowSettings(true);
  }, []);

  const handleOpenKeyboardShortcuts = useCallback(() => {
    setSettingsInitialTab({ category: 'general', subtab: 'shortcuts' });
    setShowSettings(true);
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

  // Update refs with latest callbacks
  onNewTaskRef.current = handleNewTask;
  onOpenSettingsRef.current = handleOpenSettings;
  onOpenImportRef.current = handleOpenImport;
  onOpenExportRef.current = handleOpenExport;
  onEditAccountRef.current = handleEditAccount;
  onOpenAccountRef.current = handleOpenAccount;
  onOpenCreateCalendarRef.current = handleOpenCreateCalendar;
  onSearchRef.current = handleSearch;
  onOpenAboutRef.current = handleOpenAbout;
  onOpenKeyboardShortcutsRef.current = handleOpenKeyboardShortcuts;
  onToggleCompletedRef.current = handleToggleCompleted;
  onToggleUnstartedRef.current = handleToggleUnstarted;
  onSetSortModeRef.current = handleSetSortMode;

  // Wire up menu events using refs
  useMenuEvents({
    onNewTask: onNewTaskRef,
    onOpenSettings: onOpenSettingsRef,
    onOpenImport: onOpenImportRef,
    onEditAccount: onEditAccountRef,
    onOpenExport: onOpenExportRef,
    onOpenAccount: onOpenAccountRef,
    onOpenCreateCalendar: onOpenCreateCalendarRef,
    onSearch: onSearchRef,
    onOpenAbout: onOpenAboutRef,
    onOpenKeyboardShortcuts: onOpenKeyboardShortcutsRef,
    onToggleCompleted: onToggleCompletedRef,
    onToggleUnstarted: onToggleUnstartedRef,
    onSetSortMode: onSetSortModeRef,
  });

  return {
    // Modal visibility state
    showSettings,
    showImport,
    showExport,
    showAccountModal,
    editingAccountId,
    showCreateCalendar,
    settingsInitialTab,

    // Modal controls
    setShowSettings,
    setShowImport,
    setShowExport,
    setShowAccountModal,
    setEditingAccountId,
    setShowCreateCalendar,
    setSettingsInitialTab,

    // Handlers
    handleOpenSettings,
  };
};
