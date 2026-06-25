import { setDockVisibility } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { BaseDirectory, remove } from '@tauri-apps/plugin-fs';
import { relaunch } from '@tauri-apps/plugin-process';
import { settingsStore } from '$context/settingsContext';
import { preloadAutostartState } from '$hooks/system/useAutostart';
import { db } from '$lib/database';
import { initLogger, loggers } from '$lib/logger';
import { dataStore } from '$lib/store';
import { initAppMenu } from '$utils/menu';
import { isMacPlatform, isWindowsPlatform } from '$utils/platform';

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

export const initializeApp = async () => {
  // initialize logger first so all subsequent logs are captured
  await initLogger();
  log.info('Starting application initialization...');

  await applyMacWindowDecorationPreference();

  log.debug('Initializing data store...');
  await dataStore.initialize();
  log.debug('Data store initialized');

  log.debug('Reading launch-at-login status...');
  await preloadAutostartState().catch((error) => {
    log.warn('Failed to preload launch-at-login status:', error);
  });

  await applyMacDockIconPreference();

  // initialize system tray based on settings
  log.debug('Initializing system tray...');
  const enableSystemTray = settingsStore.getState().enableSystemTray;

  try {
    await invoke('initialize_tray', { enabled: enableSystemTray });
    log.debug(`System tray initialized (enabled: ${enableSystemTray})`);
    // sync the applied value with the current setting on app start
    settingsStore.setSystemTrayAppliedValue(enableSystemTray);
  } catch (error) {
    log.error('Failed to initialize system tray:', error);
  }

  log.debug('Getting UI state...');
  const uiState = await db.getUIState();
  const sortMode = uiState.sortConfig?.mode ?? 'manual';

  const shortcuts = settingsStore.getState().keyboardShortcuts;
  log.debug('Loaded keyboard shortcuts');

  // initialize app menu only on macOS
  const isWindows = isWindowsPlatform();
  const isMac = isMacPlatform();

  if (isWindows) {
    log.debug('Windows platform detected (WebView2 runtime); skipping app menu initialization');
  } else if (!isMac) {
    log.debug('Non-macOS platform detected; skipping app menu initialization');
  } else {
    log.debug('macOS platform detected; initializing app menu');
    await initAppMenu({
      showCompleted: uiState.showCompletedTasks,
      sortMode,
      shortcuts,
    }).catch((error) => {
      log.error('Failed to initialize app menu:', error);
    });
  }

  log.info('Application initialization finished');
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

  if (!launchedAtLogin) {
    log.debug('Showing window for normal app launch');
    return true;
  }

  const enableSystemTray = settingsStore.getState().enableSystemTray;
  if (!enableSystemTray) {
    log.info('Showing window for login/autostart launch because system tray is disabled');
    return true;
  }

  const showWindowOnLoginLaunch = settingsStore.getState().showWindowOnLoginLaunch;
  if (showWindowOnLoginLaunch) {
    log.info('Showing window for login/autostart launch because startup window setting is enabled');
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
    const baseDir = isMacPlatform() ? BaseDirectory.AppLocalData : BaseDirectory.AppConfig;
    await remove('chiri.db', { baseDir });
    log.info('Database file deleted successfully');

    // reset user preferences along with the database
    log.info('Resetting user preferences...');
    settingsStore.resetSettings();
    log.info('User preferences reset successfully');

    // relaunch the app so migrations run on the fresh database
    log.info('Relaunching app to reinitialize database...');
    await relaunch();
  } catch (error) {
    log.error('Failed to delete database:', error);
    throw error;
  }
};

export const forceShowWindow = async () => {
  await getCurrentWindow().show();
};
