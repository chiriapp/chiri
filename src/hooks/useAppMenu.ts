import { useEffect } from 'react';
import { useAccounts, useTasks, useUIState } from '@/hooks/queries';
import { loggers } from '@/lib/logger';
import { useSettingsStore } from '@/store/settingsStore';
import type { SortMode } from '@/types';
import { rebuildAppMenu, updateMenuState } from '@/utils/menu';
import { isCEF } from '@/utils/platform';

const log = loggers.app;

/**
 * hook to manage macOS app menu state synchronization
 */
export function useAppMenu() {
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
    const menuSortMode: SortMode = sortMode === 'start-date' ? 'manual' : sortMode;

    log.debug('Updating menu state with sortMode:', menuSortMode);
    updateMenuState({
      hasAccounts: accounts.length > 0,
      hasTasks: tasks.length > 0,
      showCompleted: uiState?.showCompletedTasks ?? true,
      sortMode: menuSortMode,
    });
  }, [accounts.length, tasks.length, uiState?.showCompletedTasks, uiState?.sortConfig?.mode]);

  // Rebuild menu when keyboard shortcuts change
  useEffect(() => {
    const sortMode = uiState?.sortConfig?.mode ?? 'manual';
    const menuSortMode: SortMode = sortMode === 'start-date' ? 'manual' : sortMode;

    rebuildAppMenu({
      showCompleted: uiState?.showCompletedTasks ?? true,
      sortMode: menuSortMode,
      shortcuts: keyboardShortcuts,
    });
  }, [keyboardShortcuts, uiState?.showCompletedTasks, uiState?.sortConfig?.mode]);
}
