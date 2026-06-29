import { useCallback } from 'react';
import { useModalState } from '$context/modalStateContext';
import { useSettingsStore } from '$context/settingsContext';
import { useListNavigationCommands } from '$hooks/commands/useListNavigationCommands';
import {
  useSetActiveFilter,
  useSetShowCompletedTasks,
  useSetShowUnstartedTasks,
  useSetSortConfig,
} from '$hooks/queries/useUIState';
import type { AppModals } from '$types/controller';
import type { SortDirection, SortMode } from '$types/sort';

interface UseViewCommandsOptions {
  modals: AppModals;
}

export const useViewCommands = ({ modals }: UseViewCommandsOptions) => {
  const setShowCompletedMutation = useSetShowCompletedTasks();
  const setShowUnstartedMutation = useSetShowUnstartedTasks();
  const setSortConfigMutation = useSetSortConfig();
  const setActiveFilterMutation = useSetActiveFilter();
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

  return {
    openSettings,
    openImport,
    search,
    openAbout,
    openKeyboardShortcuts,
    toggleCompleted,
    toggleUnstarted,
    setSortMode,
    setSortDirection,
    selectFilter,
    toggleSidebar,
    navPrevList,
    navNextList,
  };
};
