import { useEffect, useMemo } from 'react';
import { useModalState } from '$context/modalStateContext';
import { useSettingsStore } from '$context/settingsContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useFilters } from '$hooks/queries/useFilters';
import { useTags } from '$hooks/queries/useTags';
import { useUIState } from '$hooks/queries/useUIState';
import { rebuildAppMenu, updateDockMenu, updateMenuState } from '$utils/menu';
import { getActiveListKey, getCurrentListIndex, getOrderedListItems } from '$utils/navigation';

/**
 * hook to manage macOS app menu state synchronization
 */
export const useAppMenu = (isSyncing?: boolean) => {
  const { data: accounts = [] } = useAccounts();
  const { data: filters = [] } = useFilters();
  const { data: tags = [] } = useTags();
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

  const localCalendars = useMemo(
    () =>
      accounts
        .filter((account) => !account.caldav)
        .flatMap((account) =>
          account.calendars.map((calendar) => ({
            id: calendar.id,
            displayName: calendar.displayName,
            accountId: account.id,
          })),
        ),
    [accounts],
  );

  const navigationFilters = useMemo(
    () =>
      [...filters]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((filter) => ({ id: filter.id, label: filter.name })),
    [filters],
  );

  const navigationTags = useMemo(
    () =>
      [...tags]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((tag) => ({ id: tag.id, label: tag.name })),
    [tags],
  );

  const orderedLists = useMemo(
    () => getOrderedListItems(accounts, filters, tags),
    [accounts, filters, tags],
  );

  const activeListKey = getActiveListKey(uiState);
  const currentListIndex = getCurrentListIndex(orderedLists, uiState);
  const canGoPrevious = currentListIndex > 0;
  const canGoNext = currentListIndex < orderedLists.length - 1;

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
      moveCompletedTasksToBottom: uiState?.moveCompletedTasksToBottom ?? false,
      showUnstarted: uiState?.showUnstartedTasks ?? true,
      sortMode,
      sortDirection,
      isSyncing: isSyncing ?? false,
      isModalOpen: isAnyModalOpen,
    });
  }, [
    caldavAccountCount,
    uiState?.showCompletedTasks,
    uiState?.moveCompletedTasksToBottom,
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
      moveCompletedTasksToBottom: uiState?.moveCompletedTasksToBottom ?? false,
      showUnstarted: uiState?.showUnstartedTasks ?? true,
      sortMode,
      sortDirection,
      shortcuts: keyboardShortcuts,
      accounts: menuAccounts,
      navigation: {
        filters: navigationFilters,
        localCalendars,
        accountCalendars: menuAccounts,
        tags: navigationTags,
        activeListKey,
        canGoPrevious,
        canGoNext,
      },
      caldavAccountCount,
      isSyncing: isSyncing ?? false,
    });
  }, [
    keyboardShortcuts,
    menuAccounts,
    navigationFilters,
    localCalendars,
    navigationTags,
    activeListKey,
    canGoPrevious,
    canGoNext,
    caldavAccountCount,
    uiState?.showCompletedTasks,
    uiState?.moveCompletedTasksToBottom,
    uiState?.showUnstartedTasks,
    uiState?.sortConfig?.mode,
    uiState?.sortConfig?.direction,
    isSyncing,
  ]);
};
