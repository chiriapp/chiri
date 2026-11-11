import { useEffect, useMemo, useRef } from 'react';
import { useModalState } from '$context/modalStateContext';
import { useSettingsStore } from '$context/settingsContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useFilters } from '$hooks/queries/useFilters';
import { useTags } from '$hooks/queries/useTags';
import { useUIState } from '$hooks/queries/useUIState';
import { rebuildAppMenu } from '$lib/menu';
import {
  updateAccountsMenu,
  updateDockMenu,
  updateGoMenu,
  updateMenuState,
} from '$lib/menu/update';
import { dataStore } from '$lib/store';
import { getActiveListKey, getCurrentListIndex, getOrderedListItems } from '$utils/navigation';

/**
 * hook to manage macOS app menu state synchronization
 */
export const useAppMenu = (isSyncing?: boolean) => {
  const { data: accounts = [] } = useAccounts();
  const { data: filterData } = useFilters();
  const { data: tagData } = useTags();
  const filters = filterData ?? dataStore.load().filters;
  const tags = tagData ?? dataStore.load().tags;
  const { data: uiState } = useUIState();
  const { isAnyModalOpen } = useModalState();
  const { keyboardShortcuts } = useSettingsStore();
  const hasMountedGoMenuEffect = useRef(false);
  const lastRebuiltShortcuts = useRef(keyboardShortcuts);

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
  const menuAccountsKey = JSON.stringify(menuAccounts);
  const previousMenuAccountsKey = useRef(menuAccountsKey);
  const previousKeyboardShortcuts = useRef(keyboardShortcuts);

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
  const latestNavigationState = useRef({ activeListKey, canGoPrevious, canGoNext });
  latestNavigationState.current = { activeListKey, canGoPrevious, canGoNext };

  const caldavAccountCount = caldavAccounts.length;
  const dockSyncEnabled = caldavAccountCount > 0;

  const dockFilters = useMemo(
    () =>
      [...filters]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((filter) => ({ id: filter.id, label: filter.name })),
    [filters],
  );
  const currentMenuOptions = {
    showCompleted: uiState?.showCompletedTasks ?? true,
    moveCompletedTasksToBottom: uiState?.moveCompletedTasksToBottom ?? false,
    showUnstarted: uiState?.showUnstartedTasks ?? true,
    sortMode: uiState?.sortConfig?.mode ?? 'manual',
    sortDirection: uiState?.sortConfig?.direction ?? 'asc',
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
  };
  const latestMenuOptions = useRef(currentMenuOptions);
  latestMenuOptions.current = currentMenuOptions;
  const menuStateKey = JSON.stringify([
    caldavAccountCount,
    uiState?.showCompletedTasks,
    uiState?.moveCompletedTasksToBottom,
    uiState?.showUnstartedTasks,
    uiState?.sortConfig?.mode,
    uiState?.sortConfig?.direction,
    isSyncing ?? false,
    isAnyModalOpen,
    activeListKey,
    canGoPrevious,
    canGoNext,
  ]);
  const previousMenuStateKey = useRef(menuStateKey);

  useEffect(() => {
    updateDockMenu({
      filters: dockFilters,
      syncEnabled: dockSyncEnabled,
      isModalOpen: isAnyModalOpen,
    });
  }, [dockFilters, dockSyncEnabled, isAnyModalOpen]);

  // update lightweight state (sort, filters, sync) without a full rebuild
  useEffect(() => {
    if (previousMenuStateKey.current === menuStateKey) return;
    previousMenuStateKey.current = menuStateKey;

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
      activeListKey,
      canGoPrevious,
      canGoNext,
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
    activeListKey,
    canGoPrevious,
    canGoNext,
    menuStateKey,
  ]);

  // keep dynamic menu sections attached to the current app menu as their data changes
  useEffect(() => {
    if (!hasMountedGoMenuEffect.current) {
      // bootstrap created the first menu from the initialized data store
      hasMountedGoMenuEffect.current = true;
      previousMenuAccountsKey.current = menuAccountsKey;
      previousKeyboardShortcuts.current = keyboardShortcuts;
      return;
    }

    const shortcutsChanged = previousKeyboardShortcuts.current !== keyboardShortcuts;
    const accountsChanged = previousMenuAccountsKey.current !== menuAccountsKey;
    previousMenuAccountsKey.current = menuAccountsKey;
    previousKeyboardShortcuts.current = keyboardShortcuts;
    if (shortcutsChanged) return;

    if (accountsChanged) {
      updateAccountsMenu({
        accounts: menuAccounts,
        shortcuts: keyboardShortcuts,
        caldavAccountCount,
        isSyncing,
      });
    }

    updateGoMenu({
      shortcuts: keyboardShortcuts,
      navigation: {
        filters: navigationFilters,
        localCalendars,
        accountCalendars: menuAccounts,
        tags: navigationTags,
        ...latestNavigationState.current,
      },
    });
  }, [
    keyboardShortcuts,
    menuAccounts,
    menuAccountsKey,
    navigationFilters,
    localCalendars,
    navigationTags,
    caldavAccountCount,
    isSyncing,
  ]);

  // shortcut changes alter accelerators throughout the menu so rebuild once
  useEffect(() => {
    if (lastRebuiltShortcuts.current === keyboardShortcuts) return;
    lastRebuiltShortcuts.current = keyboardShortcuts;
    rebuildAppMenu(latestMenuOptions.current);
  }, [keyboardShortcuts]);
};
