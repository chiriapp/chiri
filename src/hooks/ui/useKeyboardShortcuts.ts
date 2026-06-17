import { useCallback, useEffect, useMemo } from 'react';
import { useConfirmDialog } from '$context/confirmDialogContext';
import { useModalState } from '$context/modalStateContext';
import { useSettingsStore } from '$context/settingsContext';
import { useTaskSelection } from '$context/taskSelectionContext';
import { useTaskDeletion } from '$hooks/deletion/useTaskDeletion';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useFilters } from '$hooks/queries/useFilters';
import { useTags } from '$hooks/queries/useTags';
import { useCreateTask, useToggleTaskComplete } from '$hooks/queries/useTasks';
import {
  useSetActiveAccount,
  useSetActiveCalendar,
  useSetActiveFilter,
  useSetActiveTag,
  useSetAllTasksView,
  useSetEditorOpen,
  useSetRecentlyDeletedView,
  useSetSearchQuery,
  useSetSelectedTask,
  useSetShowCompletedTasks,
  useSetShowUnstartedTasks,
  useUIState,
} from '$hooks/queries/useUIState';
import { useVisibleTasks } from '$hooks/queries/useVisibleTasks';
import type { KeyboardShortcut } from '$types';
import {
  getAltKeyLabel,
  getMetaKeyLabel,
  getModifierJoiner,
  getShiftKeyLabel,
  getSuperKeyLabel,
} from '$utils/keyboard';
import { isMacPlatform } from '$utils/platform';

// Shortcuts that should NOT work when a modal is open
const BLOCKED_IN_MODAL = new Set([
  'new-task',
  'select-all-tasks',
  'search',
  'sync',
  'import-tasks',
  'delete',
  'toggle-complete',
  'toggle-show-completed',
  'toggle-show-unstarted',
  'nav-up',
  'nav-down',
  'nav-prev-list',
  'nav-next-list',
  'settings',
  'keyboard-shortcuts',
  'toggle-sidebar',
]);

/**
 * Check if the current event target is an input element
 */
const isInputElement = (target: HTMLElement) =>
  target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

/**
 * Check if a keyboard event matches a shortcut's modifier requirements
 */
const matchesModifiers = (e: KeyboardEvent, shortcut: KeyboardShortcut) => {
  const isMac = isMacPlatform();
  const primaryModifierPressed = isMac ? e.metaKey : e.ctrlKey;
  const metaMatch = shortcut.meta ? primaryModifierPressed : !primaryModifierPressed;
  const ctrlMatch = shortcut.ctrl ? e.ctrlKey : isMac ? !e.ctrlKey : true;
  const superMatch = isMac ? true : shortcut.super ? e.metaKey : !e.metaKey;
  const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
  const altMatch = shortcut.alt ? e.altKey : !e.altKey;

  return metaMatch && ctrlMatch && superMatch && shiftMatch && altMatch;
};

/**
 * Find matching shortcut for a keyboard event
 */
const findMatchingShortcut = (
  e: KeyboardEvent,
  shortcuts: KeyboardShortcut[],
  handlers: Record<string, () => void>,
  isModalOpen: boolean,
) => {
  for (const shortcut of shortcuts) {
    const handler = handlers[shortcut.id];
    if (!handler || !shortcut.key) continue;

    if (isModalOpen && BLOCKED_IN_MODAL.has(shortcut.id)) continue;

    if (e.key.toLowerCase() === shortcut.key.toLowerCase() && matchesModifiers(e, shortcut)) {
      return { shortcut, handler };
    }
  }
  return null;
};

interface UseKeyboardShortcutsOptions {
  onOpenSettings?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  onOpenImport?: () => void;
  onSync?: () => void;
}

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions = {}) => {
  const { onOpenSettings, onOpenKeyboardShortcuts, onOpenImport, onSync } = options;
  const { data: uiState } = useUIState();
  const flattenedTasks = useVisibleTasks();
  const createTaskMutation = useCreateTask();
  const setSearchQueryMutation = useSetSearchQuery();
  const toggleTaskCompleteMutation = useToggleTaskComplete();
  const setSelectedTaskMutation = useSetSelectedTask();
  const setEditorOpenMutation = useSetEditorOpen();
  const setShowCompletedMutation = useSetShowCompletedTasks();
  const setShowUnstartedMutation = useSetShowUnstartedTasks();
  const { selectedTaskIds, setSelection, clearSelection } = useTaskSelection();

  const selectedTaskId = uiState?.selectedTaskId ?? null;
  const activeCalendarId = uiState?.activeCalendarId ?? null;
  const activeTagId = uiState?.activeTagId ?? null;
  const activeFilterId = uiState?.activeFilterId ?? null;
  const activeView = uiState?.activeView ?? 'tasks';
  const showCompletedTasks = uiState?.showCompletedTasks ?? true;
  const showUnstartedTasks = uiState?.showUnstartedTasks ?? true;

  const { keyboardShortcuts, toggleSidebarCollapsed } = useSettingsStore();
  const { data: accounts = [] } = useAccounts();
  const { data: tags = [] } = useTags();
  const { data: filters = [] } = useFilters();
  const setActiveAccountMutation = useSetActiveAccount();
  const setActiveCalendarMutation = useSetActiveCalendar();
  const setActiveTagMutation = useSetActiveTag();
  const setActiveFilterMutation = useSetActiveFilter();
  const setAllTasksViewMutation = useSetAllTasksView();
  const setRecentlyDeletedViewMutation = useSetRecentlyDeletedView();
  const { moveTaskToRecentlyDeleted } = useTaskDeletion();
  const { isOpen: isConfirmDialogOpen } = useConfirmDialog();
  const { isAnyModalOpen } = useModalState();

  const handleNewTask = useCallback(() => {
    createTaskMutation.mutate(
      { title: '' },
      {
        onSuccess: (task) => {
          setSelectedTaskMutation.mutate({ id: task.id, focusTitle: true });
        },
      },
    );
  }, [createTaskMutation, setSelectedTaskMutation]);

  const handleSearch = useCallback(() => {
    const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
    if (searchInput) {
      // Toggle focus: if already focused, blur it; otherwise focus it
      if (document.activeElement === searchInput) {
        searchInput.blur();
      } else {
        searchInput.focus();
      }
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (activeView === 'recently-deleted') return;
    const taskIds =
      selectedTaskIds.length > 0 ? selectedTaskIds : selectedTaskId ? [selectedTaskId] : [];
    for (const taskId of taskIds) {
      await moveTaskToRecentlyDeleted(taskId);
    }
    if (selectedTaskIds.length > 0) clearSelection();
  }, [activeView, clearSelection, selectedTaskId, selectedTaskIds, moveTaskToRecentlyDeleted]);

  const handleToggleComplete = useCallback(() => {
    if (activeView === 'recently-deleted') return;
    const taskIds =
      selectedTaskIds.length > 0 ? selectedTaskIds : selectedTaskId ? [selectedTaskId] : [];
    for (const taskId of taskIds) {
      toggleTaskCompleteMutation.mutate(taskId);
    }
  }, [activeView, selectedTaskId, selectedTaskIds, toggleTaskCompleteMutation]);

  const handleSelectAllTasks = useCallback(() => {
    if (flattenedTasks.length === 0) return;

    if (selectedTaskIds.length > 0) {
      clearSelection();
      return;
    }

    setEditorOpenMutation.mutate(false);
    setSelection(
      flattenedTasks.map((task) => task.id),
      flattenedTasks[0].id,
    );
  }, [clearSelection, flattenedTasks, selectedTaskIds.length, setEditorOpenMutation, setSelection]);

  const handleEscape = useCallback(() => {
    clearSelection();
    setSearchQueryMutation.mutate('');
    setEditorOpenMutation.mutate(false);
    const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
    searchInput?.blur();
  }, [clearSelection, setSearchQueryMutation, setEditorOpenMutation]);

  const handleNavigateUp = useCallback(() => {
    if (flattenedTasks.length === 0) return;

    if (!selectedTaskId) {
      setSelectedTaskMutation.mutate(flattenedTasks[0].id);
      return;
    }

    const currentIndex = flattenedTasks.findIndex((t) => t.id === selectedTaskId);
    if (currentIndex > 0) {
      setSelectedTaskMutation.mutate(flattenedTasks[currentIndex - 1].id);
    }
  }, [selectedTaskId, flattenedTasks, setSelectedTaskMutation]);

  const handleNavigateDown = useCallback(() => {
    if (flattenedTasks.length === 0) return;

    if (!selectedTaskId) {
      setSelectedTaskMutation.mutate(flattenedTasks[0].id);
      return;
    }

    const currentIndex = flattenedTasks.findIndex((t) => t.id === selectedTaskId);
    if (currentIndex < flattenedTasks.length - 1) {
      setSelectedTaskMutation.mutate(flattenedTasks[currentIndex + 1].id);
    }
  }, [selectedTaskId, flattenedTasks, setSelectedTaskMutation]);

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

  const handleToggleSidebar = useCallback(() => {
    toggleSidebarCollapsed();
  }, [toggleSidebarCollapsed]);

  const handleOpenSettings = useCallback(() => {
    // If settings is already open, this will close it (toggle behavior)
    onOpenSettings?.();
  }, [onOpenSettings]);

  const handleOpenKeyboardShortcuts = useCallback(() => {
    // If keyboard shortcuts is already open, this will close it (toggle behavior)
    onOpenKeyboardShortcuts?.();
  }, [onOpenKeyboardShortcuts]);

  const handleOpenImport = useCallback(() => {
    onOpenImport?.();
  }, [onOpenImport]);

  const handleSync = useCallback(() => {
    onSync?.();
  }, [onSync]);

  const handleToggleShowCompleted = useCallback(() => {
    setShowCompletedMutation.mutate(!showCompletedTasks);
  }, [setShowCompletedMutation, showCompletedTasks]);

  const handleToggleShowUnstarted = useCallback(() => {
    setShowUnstartedMutation.mutate(!showUnstartedTasks);
  }, [setShowUnstartedMutation, showUnstartedTasks]);

  // Map shortcut IDs to their handler functions
  const actionHandlers: Record<string, () => void> = useMemo(
    () => ({
      'new-task': handleNewTask,
      search: handleSearch,
      settings: handleOpenSettings,
      'keyboard-shortcuts': handleOpenKeyboardShortcuts,
      'import-tasks': handleOpenImport,
      sync: handleSync,
      delete: handleDelete,
      'toggle-complete': handleToggleComplete,
      'select-all-tasks': handleSelectAllTasks,
      'toggle-show-completed': handleToggleShowCompleted,
      'toggle-show-unstarted': handleToggleShowUnstarted,
      'nav-up': handleNavigateUp,
      'nav-down': handleNavigateDown,
      'nav-prev-list': handleNavPrevList,
      'nav-next-list': handleNavNextList,
      'toggle-sidebar': handleToggleSidebar,
    }),
    [
      handleNewTask,
      handleSearch,
      handleOpenSettings,
      handleOpenKeyboardShortcuts,
      handleOpenImport,
      handleSync,
      handleDelete,
      handleToggleComplete,
      handleSelectAllTasks,
      handleToggleShowCompleted,
      handleToggleShowUnstarted,
      handleNavigateUp,
      handleNavigateDown,
      handleNavPrevList,
      handleNavNextList,
      handleToggleSidebar,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If confirm dialog is open, let it consume keys (Esc/Enter) without triggering app shortcuts
      if (isConfirmDialogOpen) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (!isAnyModalOpen) {
          e.preventDefault();
          handleEscape();
        }
        return;
      }

      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (isInputElement(target)) {
        return;
      }

      const match = findMatchingShortcut(e, keyboardShortcuts, actionHandlers, isAnyModalOpen);
      if (match) {
        e.preventDefault();
        match.handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [keyboardShortcuts, actionHandlers, isConfirmDialogOpen, isAnyModalOpen, handleEscape]);

  return { shortcuts: keyboardShortcuts };
};

export const getShortcutDisplay = (shortcut: KeyboardShortcut) => {
  if (!shortcut.key) return 'Not set';

  const parts: string[] = [];

  if (shortcut.meta) {
    parts.push(getMetaKeyLabel());
  }
  if (shortcut.ctrl && (isMacPlatform() || !shortcut.meta)) {
    parts.push('Ctrl');
  }
  if (shortcut.super && !isMacPlatform()) {
    parts.push(getSuperKeyLabel());
  }
  if (shortcut.shift) {
    parts.push(getShiftKeyLabel());
  }
  if (shortcut.alt) {
    parts.push(getAltKeyLabel());
  }

  const keyDisplay = shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase();
  parts.push(keyDisplay);

  return parts.join(getModifierJoiner());
};
