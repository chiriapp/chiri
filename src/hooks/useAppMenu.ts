import { useEffect, useMemo } from 'react';
import { useModalState } from '$context/modalStateContext';
import { useSettingsStore } from '$context/settingsContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useUIState } from '$hooks/queries/useUIState';
import { rebuildAppMenu, updateMenuState } from '$utils/menu';

/**
 * hook to manage macOS app menu state synchronization
 */
export const useAppMenu = (isSyncing?: boolean) => {
  const { data: accounts = [] } = useAccounts();
  const { data: uiState } = useUIState();
  const { isAnyModalOpen } = useModalState();
  const { keyboardShortcuts } = useSettingsStore();

  const caldavAccounts = useMemo(() => accounts.filter((a) => a.caldav), [accounts]);

  const menuAccounts = useMemo(
    () =>
      caldavAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        calendars: a.calendars.map((c) => ({ id: c.id, displayName: c.displayName })),
      })),
    [caldavAccounts],
  );

  const caldavAccountCount = caldavAccounts.length;

  // update lightweight state (sort, filters, sync, editor) without a full rebuild
  useEffect(() => {
    const sortMode = uiState?.sortConfig?.mode ?? 'manual';
    const sortDirection = uiState?.sortConfig?.direction ?? 'asc';
    const isEditorOpen =
      (uiState?.isEditorOpen ?? false) && (uiState?.selectedTaskId ?? null) !== null;

    updateMenuState({
      accountCount: caldavAccountCount,
      showCompleted: uiState?.showCompletedTasks ?? true,
      showUnstarted: uiState?.showUnstartedTasks ?? true,
      sortMode,
      sortDirection,
      isSyncing: isSyncing ?? false,
      isEditorOpen,
      isModalOpen: isAnyModalOpen,
    });
  }, [
    caldavAccountCount,
    uiState?.showCompletedTasks,
    uiState?.showUnstartedTasks,
    uiState?.sortConfig?.mode,
    uiState?.sortConfig?.direction,
    uiState?.isEditorOpen,
    uiState?.selectedTaskId,
    isSyncing,
    isAnyModalOpen,
  ]);

  // Full rebuild when shortcuts or account list (id/name) changes
  useEffect(() => {
    const sortMode = uiState?.sortConfig?.mode ?? 'manual';
    const sortDirection = uiState?.sortConfig?.direction ?? 'asc';
    const isEditorOpen =
      (uiState?.isEditorOpen ?? false) && (uiState?.selectedTaskId ?? null) !== null;

    rebuildAppMenu({
      showCompleted: uiState?.showCompletedTasks ?? true,
      showUnstarted: uiState?.showUnstartedTasks ?? true,
      sortMode,
      sortDirection,
      shortcuts: keyboardShortcuts,
      accounts: menuAccounts,
      caldavAccountCount,
      isSyncing: isSyncing ?? false,
      isEditorOpen,
      isModalOpen: isAnyModalOpen,
    });
  }, [
    keyboardShortcuts,
    menuAccounts,
    caldavAccountCount,
    uiState?.showCompletedTasks,
    uiState?.showUnstartedTasks,
    uiState?.sortConfig?.mode,
    uiState?.sortConfig?.direction,
    uiState?.isEditorOpen,
    uiState?.selectedTaskId,
    isSyncing,
    isAnyModalOpen,
  ]);
};
