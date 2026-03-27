import { useEffect, useMemo } from 'react';
import { useAccounts } from '$hooks/queries/useAccounts';
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
  const { data: uiState } = useUIState();
  const { keyboardShortcuts } = useSettingsStore();

  // Skip menu operations under CEF - IPC causes deadlocks
  // TODO: Figure out how to support the app menu on macOS under CEF.
  const skipMenu = isCEF();

  const menuAccounts = useMemo(
    () =>
      accounts.map((a) => ({
        id: a.id,
        name: a.name,
        calendars: a.calendars.map((c) => ({ id: c.id, displayName: c.displayName })),
      })),
    [accounts],
  );

  // update lightweight state (sort, filters, sync, editor) without a full rebuild
  useEffect(() => {
    if (skipMenu) return;
    const sortMode = uiState?.sortConfig?.mode ?? 'manual';
    const isEditorOpen =
      (uiState?.isEditorOpen ?? false) && (uiState?.selectedTaskId ?? null) !== null;

    log.debug('Updating menu state with sortMode:', sortMode);
    updateMenuState({
      accountCount: accounts.length,
      showCompleted: uiState?.showCompletedTasks ?? true,
      showUnstarted: uiState?.showUnstartedTasks ?? true,
      sortMode,
      isSyncing: isSyncing ?? false,
      isEditorOpen,
    });
  }, [
    accounts.length,
    uiState?.showCompletedTasks,
    uiState?.showUnstartedTasks,
    uiState?.sortConfig?.mode,
    uiState?.isEditorOpen,
    uiState?.selectedTaskId,
    isSyncing,
    skipMenu,
  ]);

  // Full rebuild when shortcuts or account list (id/name) changes
  useEffect(() => {
    if (skipMenu) return;
    const sortMode = uiState?.sortConfig?.mode ?? 'manual';
    const isEditorOpen =
      (uiState?.isEditorOpen ?? false) && (uiState?.selectedTaskId ?? null) !== null;

    rebuildAppMenu({
      showCompleted: uiState?.showCompletedTasks ?? true,
      showUnstarted: uiState?.showUnstartedTasks ?? true,
      sortMode,
      shortcuts: keyboardShortcuts,
      accounts: menuAccounts,
      isSyncing: isSyncing ?? false,
      isEditorOpen,
    });
  }, [
    keyboardShortcuts,
    menuAccounts,
    uiState?.showCompletedTasks,
    uiState?.showUnstartedTasks,
    uiState?.sortConfig?.mode,
    uiState?.isEditorOpen,
    uiState?.selectedTaskId,
    isSyncing,
    skipMenu,
  ]);
};
