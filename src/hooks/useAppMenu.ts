import { useEffect } from 'react';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useTasks } from '$hooks/queries/useTasks';
import { useUIState } from '$hooks/queries/useUIState';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { loggers } from '$lib/logger';
import { rebuildAppMenu, updateMenuState } from '$utils/menu';
import { isCEF } from '$utils/platform';

const log = loggers.app;

/**
 * hook to manage macOS app menu state synchronization
 */
export const useAppMenu = (isSyncing?: boolean) => {
  const { data: accounts = [] } = useAccounts();
  const { data: tasks = [] } = useTasks();
  const { data: uiState } = useUIState();
  const { keyboardShortcuts } = useSettingsStore();

  // Skip menu operations under CEF - IPC causes deadlocks
  // TODO: Figure out how to support the app menu on macOS under CEF.
  const skipMenu = isCEF();

  // update menu state when accounts or tasks change
  useEffect(() => {
    if (skipMenu) return;
    const sortMode = uiState?.sortConfig?.mode ?? 'manual';
    // only use menu-supported sort modes

    log.debug('Updating menu state with sortMode:', sortMode);
    updateMenuState({
      hasAccounts: accounts.length > 0,
      hasTasks: tasks.length > 0,
      showCompleted: uiState?.showCompletedTasks ?? true,
      showUnstarted: uiState?.showUnstartedTasks ?? true,
      sortMode,
      isSyncing: isSyncing ?? false,
    });
  }, [
    accounts.length,
    tasks.length,
    uiState?.showCompletedTasks,
    uiState?.showUnstartedTasks,
    uiState?.sortConfig?.mode,
    isSyncing,
    skipMenu,
  ]);

  // Rebuild menu when keyboard shortcuts change
  useEffect(() => {
    if (skipMenu) return;
    const sortMode = uiState?.sortConfig?.mode ?? 'manual';

    rebuildAppMenu({
      showCompleted: uiState?.showCompletedTasks ?? true,
      showUnstarted: uiState?.showUnstartedTasks ?? true,
      sortMode,
      shortcuts: keyboardShortcuts,
      hasAccounts: accounts.length > 0,
      hasTasks: tasks.length > 0,
      isSyncing: isSyncing ?? false,
    });
  }, [
    keyboardShortcuts,
    uiState?.showCompletedTasks,
    uiState?.showUnstartedTasks,
    uiState?.sortConfig?.mode,
    accounts.length,
    tasks.length,
    isSyncing,
    skipMenu,
  ]);
};
