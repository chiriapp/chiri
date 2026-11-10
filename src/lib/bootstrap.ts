import { setDockVisibility } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs';
import { relaunch } from '@tauri-apps/plugin-process';
import { settingsStore } from '$context/settingsContext';
import { preloadAutostartState } from '$hooks/system/useAutostart';
import { loggers } from '$lib/logger';
import { initAppMenu } from '$lib/menu';
import { flushTaskSnoozes, initializeTaskSnoozes } from '$lib/notifications/snoozes';
import { LEGACY_PREFERENCES_KEYS } from '$lib/preferences/persistence';
import { preferencesRepository } from '$lib/preferences/repository';
import { dataStore } from '$lib/store';
import { setActiveFilter, setAllTasksView, setRecentlyDeletedView } from '$lib/store/ui';
import { getActiveListKey, getCurrentListIndex, getOrderedListItems } from '$utils/navigation';
import { getTrayHostAvailable, isLinuxPlatform, isMacPlatform } from '$utils/platform';

const log = loggers.bootstrap;

const applyMacDockIconPreference = async () => {
  if (!isMacPlatform()) return;

  const { hideDockIconWhenWindowClosed } = settingsStore.getState();
  try {
    await invoke('set_hide_dock_icon_when_window_closed', {
      enabled: hideDockIconWhenWindowClosed,
    });
  } catch (error) {
    log.error('Failed to apply Dock icon preference:', error);
  }
};

const applyMacWindowDecorationPreference = async () => {
  if (!isMacPlatform()) return;

  const { windowDecorationStyle } = settingsStore.getState();
  try {
    await invoke('set_macos_window_decoration_style', {
      style: windowDecorationStyle,
    });
  } catch (error) {
    log.error('Failed to apply macOS window decoration preference:', error);
  }
};

const applyDefaultLaunchViewPreference = () => {
  const { defaultLaunchView } = settingsStore.getState();

  if (defaultLaunchView === 'last-view') return;

  if (defaultLaunchView === 'all-tasks') {
    setAllTasksView();
    return;
  }

  if (defaultLaunchView.startsWith('filter:')) {
    const filterId = defaultLaunchView.slice('filter:'.length);
    if (dataStore.load().filters.some((filter) => filter.id === filterId)) {
      setActiveFilter(filterId);
    } else {
      log.warn('Configured default launch filter no longer exists; opening All Tasks', {
        filterId,
      });
      setAllTasksView();
    }
    return;
  }

  setRecentlyDeletedView();
};

export const setMacDockIconVisible = async (visible: boolean) => {
  if (!isMacPlatform()) return;

  try {
    await setDockVisibility(visible);
  } catch (error) {
    log.error('Failed to update Dock icon visibility:', error);
  }
};

export const applyHiddenWindowDockIconState = async () => {
  if (!settingsStore.getState().hideDockIconWhenWindowClosed) return;
  await setMacDockIconVisible(false);
};

export const applyTrayDefaultForGNOME = async () => {
  const { enableSystemTrayExplicitlySet, onboardingCompleted } = settingsStore.getState();

  // only apply the GNOME default once during the initial onboarding session
  // users who have already completed onboarding keep their existing choice
  if (onboardingCompleted || enableSystemTrayExplicitlySet) {
    return;
  }

  if (!isLinuxPlatform()) {
    settingsStore.setEnableSystemTrayExplicitlySet(true);
    return;
  }

  const isGNOME = await invoke<boolean>('is_gnome_desktop').catch((error) => {
    log.warn('Failed to detect GNOME desktop for tray default:', error);
    return false;
  });

  if (isGNOME) {
    const trayHostAvailable = await invoke<boolean>('is_tray_host_available').catch((error) => {
      log.warn('Failed to detect SNI tray host for GNOME default:', error);
      return false;
    });

    if (!trayHostAvailable) {
      log.info('GNOME detected without an SNI tray host; disabling system tray by default');
      settingsStore.setEnableSystemTray(false);
    } else {
      log.info('GNOME detected with an SNI tray host; leaving system tray enabled by default');
    }
  }

  settingsStore.setEnableSystemTrayExplicitlySet(true);
};

export const initializeApp = async () => {
  log.info('Starting application initialization...');

  await settingsStore.initialize();
  await applyMacWindowDecorationPreference();

  await dataStore.initialize();
  await initializeTaskSnoozes();
  applyDefaultLaunchViewPreference();

  await preloadAutostartState().catch((error) => {
    log.warn('Failed to preload launch-at-login status:', error);
  });

  await applyMacDockIconPreference();

  // On first run, default the system tray based on the desktop environment. On
  // GNOME we only disable it if no SNI tray host (e.g., AppIndicator extension)
  // is present on the session bus.
  await applyTrayDefaultForGNOME();

  await initializeTray();

  // install the complete menu before the hidden startup window is shown
  const startupData = dataStore.load();
  const uiState = startupData.ui;
  const shortcuts = settingsStore.getState().keyboardShortcuts;
  log.debug('Loaded keyboard shortcuts');
  const caldavAccounts = startupData.accounts.filter((account) => account.caldav);
  const menuAccounts = caldavAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    calendars: account.calendars.map((calendar) => ({
      id: calendar.id,
      displayName: calendar.displayName,
    })),
  }));
  const localCalendars = startupData.accounts
    .filter((account) => !account.caldav)
    .flatMap((account) =>
      account.calendars.map((calendar) => ({
        id: calendar.id,
        displayName: calendar.displayName,
        accountId: account.id,
      })),
    );
  const navigationFilters = [...startupData.filters]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((filter) => ({ id: filter.id, label: filter.name }));
  const navigationTags = [...startupData.tags]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((tag) => ({ id: tag.id, label: tag.name }));
  const orderedLists = getOrderedListItems(
    startupData.accounts,
    startupData.filters,
    startupData.tags,
  );
  const currentListIndex = getCurrentListIndex(orderedLists, uiState);

  if (isMacPlatform()) {
    void initAppMenu({
      showCompleted: uiState.showCompletedTasks,
      moveCompletedTasksToBottom: uiState.moveCompletedTasksToBottom,
      showUnstarted: uiState.showUnstartedTasks,
      sortMode: uiState.sortConfig.mode,
      sortDirection: uiState.sortConfig.direction,
      shortcuts,
      accounts: menuAccounts,
      navigation: {
        filters: navigationFilters,
        localCalendars,
        accountCalendars: menuAccounts,
        tags: navigationTags,
        activeListKey: getActiveListKey(uiState),
        canGoPrevious: currentListIndex > 0,
        canGoNext: currentListIndex < orderedLists.length - 1,
      },
      caldavAccountCount: caldavAccounts.length,
      isSyncing: false,
    }).catch((error) => {
      log.error('Failed to initialize app menu:', error);
    });
  }

  log.info('Application initialization finished');
};

/**
 * initialize the tray even when normal app startup has failed. the bootstrap
 * error screen is still a usable app state and must retain its tray recovery
 * path on every platform
 */
export const initializeTray = async () => {
  const enableSystemTray = settingsStore.getState().enableSystemTray;

  if (!enableSystemTray) {
    settingsStore.setSystemTrayAppliedValue(false);
    return;
  }

  try {
    await invoke('initialize_tray', { enabled: true });
    log.debug('System tray initialized');
    settingsStore.setSystemTrayAppliedValue(true);
  } catch (error) {
    log.error('Failed to initialize system tray:', error);
  }
};

export const showWindow = async (delay: number = 200): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const window = getCurrentWindow();
      await setMacDockIconVisible(true);
      await window.show();
      await window.setFocus();

      log.debug('Window shown and focused');
      resolve();
    }, delay);
  });
};

export const shouldShowWindowOnStartup = async () => {
  const launchedAtLogin = isMacPlatform()
    ? await invoke<boolean>('was_macos_launched_as_login_item').catch((error) => {
        log.warn('Failed to detect macOS login-item launch:', error);
        return false;
      })
    : await invoke<boolean>('was_launched_from_autostart').catch((error) => {
        log.warn('Failed to detect autostart launch:', error);
        return false;
      });

  if (!launchedAtLogin || settingsStore.getState().showWindowOnLoginLaunch) return true;

  const enableSystemTray = settingsStore.getState().enableSystemTray;
  const trayHostAvailable =
    isLinuxPlatform() && enableSystemTray ? await getTrayHostAvailable() : true;

  if (!enableSystemTray) {
    log.info('Showing window for login/autostart launch because system tray is disabled');
    return true;
  }

  if (!trayHostAvailable) {
    log.info('Showing window for login/autostart launch because no tray host is available');
    return true;
  }

  log.info('Keeping window hidden for login/autostart launch');
  return false;
};

/**
 * delete the database file and restart the app (for worst-case recovery)
 */
export const deleteDatabase = async () => {
  try {
    log.warn('Deleting database file...');
    await flushTaskSnoozes();
    const baseDir = isMacPlatform() ? BaseDirectory.AppLocalData : BaseDirectory.AppConfig;
    await remove('chiri.db', { baseDir });
    log.info('Database file deleted successfully');

    // relaunch the app so migrations run on the fresh database
    log.info('Relaunching app to reinitialize database...');
    await settingsStore.flush();
    await relaunch();
  } catch (error) {
    log.error('Failed to delete database:', error);
    throw error;
  }
};

export const resetPreferences = async () => {
  try {
    log.warn('Resetting user preferences...');

    try {
      settingsStore.resetSettings();
      await settingsStore.flush();
    } catch (error) {
      log.warn('Could not write default preferences; removing the database files instead:', error);
      await preferencesRepository.close().catch(() => undefined);

      const baseDir = isMacPlatform() ? BaseDirectory.AppLocalData : BaseDirectory.AppConfig;
      for (const file of ['preferences.db', 'preferences.db-wal', 'preferences.db-shm']) {
        if (await exists(file, { baseDir })) await remove(file, { baseDir });
      }
    }

    for (const key of LEGACY_PREFERENCES_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        log.warn(`Could not remove legacy preferences from ${key}:`, error);
      }
    }
    log.info('User preferences reset successfully');
    await relaunch();
  } catch (error) {
    log.error('Failed to reset user preferences:', error);
    throw error;
  }
};

export const forceShowWindow = async () => {
  await getCurrentWindow().show();
};
