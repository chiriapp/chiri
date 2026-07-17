import { useEffect, useMemo } from 'react';
import { useModalState } from '$context/modalStateContext';
import { useSettingsStore } from '$context/settingsContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useFilters } from '$hooks/queries/useFilters';
import { useUIState } from '$hooks/queries/useUIState';
import { rebuildAppMenu, updateDockMenu, updateMenuState } from '$utils/menu';

/**
 * hook to manage macOS app menu state synchronization
 */
export const useAppMenu = (isSyncing?: boolean) => {
  const { data: accounts = [] } = useAccounts();
  const { data: filters = [] } = useFilters();
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
  const dockSyncEnabled = caldavAccountCount > 0;

  const dockFilters = useMemo(
    () =>
      [...filters]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((filter) => ({ id: filter.id, label: filter.name })),
    [filters],
  );

  useEffect(() => {
    updateDockMenu({
      filters: dockFilters,
      syncEnabled: dockSyncEnabled,
      isModalOpen: isAnyModalOpen,
    });
  }, [dockFilters, dockSyncEnabled, isAnyModalOpen]);

  // update lightweight state (sort, filters, sync) without a full rebuild
  useEffect(() => {
    const sortMode = uiState?.sortConfig?.mode ?? 'manual';
    const sortDirection = uiState?.sortConfig?.direction ?? 'asc';

    updateMenuState({
      accountCount: caldavAccountCount,
      showCompleted: uiState?.showCompletedTasks ?? true,
      showUnstarted: uiState?.showUnstartedTasks ?? true,
      sortMode,
      sortDirection,
      isSyncing: isSyncing ?? false,
      isModalOpen: isAnyModalOpen,
    });
  }, [
    caldavAccountCount,
    uiState?.showCompletedTasks,
    uiState?.showUnstartedTasks,
    uiState?.sortConfig?.mode,
    uiState?.sortConfig?.direction,
    isSyncing,
    isAnyModalOpen,
  ]);

  // full rebuild when shortcuts or account list (id/name) changes
  useEffect(() => {
    const sortMode = uiState?.sortConfig?.mode ?? 'manual';
    const sortDirection = uiState?.sortConfig?.direction ?? 'asc';

    rebuildAppMenu({
      showCompleted: uiState?.showCompletedTasks ?? true,
      showUnstarted: uiState?.showUnstartedTasks ?? true,
      sortMode,
      sortDirection,
      shortcuts: keyboardShortcuts,
      accounts: menuAccounts,
      caldavAccountCount,
      isSyncing: isSyncing ?? false,
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
    isSyncing,
    isAnyModalOpen,
  ]);
};
