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
import { isLinuxPlatform, isMacPlatform, isWindowsPlatform } from '$utils/platform';

const log = loggers.bootstrap;

export interface BootstrapResult {
  success: boolean;
  error?: Error;
}

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
  // Initialize logger first so all subsequent logs are captured
  await initLogger();
  log.info('Starting application initialization...');

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
    // Sync the applied value with the current setting on app start
    settingsStore.setSystemTrayAppliedValue(enableSystemTray);
  } catch (error) {
    log.error('Failed to initialize system tray:', error);
  }

  // Apply window decorations override. 'auto' leaves the startup-time
  // per-DE decision in place; explicit 'on'/'off' overrides it.
  const decorationsMode = settingsStore.getState().windowDecorationsMode;
  if (decorationsMode !== 'auto' && isLinuxPlatform()) {
    try {
      await invoke('set_window_decorations', { enabled: decorationsMode === 'on' });
    } catch (error) {
      log.error('Failed to apply window decorations override:', error);
    }
  }
  settingsStore.setWindowDecorationsAppliedValue(decorationsMode);

  log.debug('Getting UI state...');
  const uiState = await db.getUIState();
  const sortMode = uiState.sortConfig?.mode ?? 'manual';

  const shortcuts = settingsStore.getState().keyboardShortcuts;
  log.debug('Loaded keyboard shortcuts');

  // Initialize app menu only on macOS.
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

export const shouldShowWindowOnStartup = async (): Promise<boolean> => {
  if (!isMacPlatform()) {
    return true;
  }

  const launchedAtLogin = await invoke<boolean>('was_macos_launched_as_login_item').catch(
    (error) => {
      log.warn('Failed to detect macOS login-item launch:', error);
      return false;
    },
  );

  if (!launchedAtLogin) {
    log.debug('Showing window for normal app launch');
    return true;
  }

  const enableSystemTray = settingsStore.getState().enableSystemTray;
  if (!enableSystemTray) {
    log.info('Showing window for login-item launch because system tray is disabled');
    return true;
  }

  const showWindowOnLoginLaunch = settingsStore.getState().showWindowOnLoginLaunch;
  if (showWindowOnLoginLaunch) {
    log.info('Showing window for login-item launch because startup window setting is enabled');
    return true;
  }

  log.info('Keeping window hidden for macOS login-item launch');
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

    // Reset user preferences along with the database
    log.info('Resetting user preferences...');
    settingsStore.resetSettings();
    log.info('User preferences reset successfully');

    // Relaunch the app so migrations run on the fresh database
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
