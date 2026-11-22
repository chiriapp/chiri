import { useCallback } from 'react';
import { useModalState } from '$context/modalStateContext';
import { useSettingsStore } from '$context/settingsContext';
import { useListNavigationCommands } from '$hooks/commands/useListNavigationCommands';
import {
  useSetActiveAccount,
  useSetActiveCalendar,
  useSetActiveFilter,
  useSetActiveTag,
  useSetAllTasksView,
  useSetMoveCompletedTasksToBottom,
  useSetRecentlyDeletedView,
  useSetShowCompletedTasks,
  useSetShowUnstartedTasks,
  useSetSortConfig,
  useSetTaskGroupConfig,
} from '$hooks/queries/useUIState';
import type { AppModals } from '$types/modals';
import type { SortDirection, SortMode, TaskGroupMode } from '$types/sort';

interface UseViewCommandsOptions {
  modals: AppModals;
}

export const useViewCommands = ({ modals }: UseViewCommandsOptions) => {
  const setShowCompletedMutation = useSetShowCompletedTasks();
  const setMoveCompletedTasksToBottomMutation = useSetMoveCompletedTasksToBottom();
  const setShowUnstartedMutation = useSetShowUnstartedTasks();
  const setSortConfigMutation = useSetSortConfig();
  const setTaskGroupConfigMutation = useSetTaskGroupConfig();
  const setActiveFilterMutation = useSetActiveFilter();
  const setActiveAccountMutation = useSetActiveAccount();
  const setActiveCalendarMutation = useSetActiveCalendar();
  const setActiveTagMutation = useSetActiveTag();
  const setAllTasksViewMutation = useSetAllTasksView();
  const setRecentlyDeletedViewMutation = useSetRecentlyDeletedView();
  const { toggleSidebarCollapsed } = useSettingsStore();
  const { isAnyModalOpen } = useModalState();
  const { navPrevList, navNextList } = useListNavigationCommands();

  const openSettings = useCallback(() => {
    if (isAnyModalOpen) return;
    modals.openSettings();
  }, [isAnyModalOpen, modals]);

  const openImport = useCallback(() => {
    if (isAnyModalOpen) return;
    modals.openImport();
  }, [isAnyModalOpen, modals]);

  const search = useCallback(() => {
    const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
    if (!searchInput) return;

    if (document.activeElement === searchInput) {
      searchInput.blur();
      return;
    }

    searchInput.focus();
    searchInput.select();
  }, []);

  const openAbout = useCallback(() => {
    if (isAnyModalOpen) return;
    modals.openSettings({ category: 'misc', subtab: 'about' });
  }, [isAnyModalOpen, modals]);

  const openKeyboardShortcuts = useCallback(() => {
    if (isAnyModalOpen) return;
    modals.toggleSettings({ category: 'app', subtab: 'keyboard-shortcuts' });
  }, [isAnyModalOpen, modals]);

  const toggleCompleted = useCallback(
    (currentValue: boolean) => {
      setShowCompletedMutation.mutate(!currentValue);
    },
    [setShowCompletedMutation],
  );

  const toggleCompletedToBottom = useCallback(
    (currentValue: boolean) => {
      setMoveCompletedTasksToBottomMutation.mutate(!currentValue);
    },
    [setMoveCompletedTasksToBottomMutation],
  );

  const toggleUnstarted = useCallback(
    (currentValue: boolean) => {
      setShowUnstartedMutation.mutate(!currentValue);
    },
    [setShowUnstartedMutation],
  );

  const setSortMode = useCallback(
    (mode: SortMode, _currentMode: SortMode, currentDirection: SortDirection) => {
      setSortConfigMutation.mutate({ mode, direction: currentDirection });
    },
    [setSortConfigMutation],
  );

  const setSortDirection = useCallback(
    (direction: SortDirection, currentMode: SortMode) => {
      setSortConfigMutation.mutate({ mode: currentMode, direction });
    },
    [setSortConfigMutation],
  );

  const setTaskGroupMode = useCallback(
    (mode: TaskGroupMode, _currentMode: TaskGroupMode, currentDirection: SortDirection) => {
      setTaskGroupConfigMutation.mutate({ mode, direction: currentDirection });
    },
    [setTaskGroupConfigMutation],
  );

  const setTaskGroupDirection = useCallback(
    (direction: SortDirection, currentMode: TaskGroupMode) => {
      setTaskGroupConfigMutation.mutate({ mode: currentMode, direction });
    },
    [setTaskGroupConfigMutation],
  );

  const toggleSidebar = useCallback(() => {
    toggleSidebarCollapsed();
  }, [toggleSidebarCollapsed]);

  const selectFilter = useCallback(
    (filterId: string) => {
      if (isAnyModalOpen) return;
      setActiveFilterMutation.mutate(filterId);
    },
    [isAnyModalOpen, setActiveFilterMutation],
  );

  const selectCalendar = useCallback(
    (accountId: string, calendarId: string) => {
      if (isAnyModalOpen) return;
      setActiveAccountMutation.mutate(accountId);
      setActiveCalendarMutation.mutate(calendarId);
    },
    [isAnyModalOpen, setActiveAccountMutation, setActiveCalendarMutation],
  );

  const selectTag = useCallback(
    (tagId: string) => {
      if (isAnyModalOpen) return;
      setActiveTagMutation.mutate(tagId);
    },
    [isAnyModalOpen, setActiveTagMutation],
  );

  const allTasks = useCallback(() => {
    if (isAnyModalOpen) return;
    setAllTasksViewMutation.mutate();
    setActiveAccountMutation.mutate(null);
  }, [isAnyModalOpen, setActiveAccountMutation, setAllTasksViewMutation]);

  const recentlyDeleted = useCallback(() => {
    if (isAnyModalOpen) return;
    setRecentlyDeletedViewMutation.mutate();
  }, [isAnyModalOpen, setRecentlyDeletedViewMutation]);

  return {
    openSettings,
    openImport,
    search,
    openAbout,
    openKeyboardShortcuts,
    toggleCompleted,
    toggleCompletedToBottom,
    toggleUnstarted,
    setSortMode,
    setSortDirection,
    setTaskGroupMode,
    setTaskGroupDirection,
    allTasks,
    recentlyDeleted,
    selectFilter,
    selectCalendar,
    selectTag,
    toggleSidebar,
    navPrevList,
    navNextList,
  };
};
