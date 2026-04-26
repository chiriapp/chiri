import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { BaseDirectory, remove } from '@tauri-apps/plugin-fs';
import { relaunch } from '@tauri-apps/plugin-process';
import { settingsStore } from '$context/settingsContext';
import { db } from '$lib/database';
import { createBootstrapErrorUI } from '$lib/errorUI';
import { initLogger, loggers } from '$lib/logger';
import { dataStore } from '$lib/store';
import { initAppMenu } from '$utils/menu';
import { isCEF, isLinuxPlatform, isMacPlatform, isWindowsPlatform } from '$utils/platform';

const log = loggers.bootstrap;

export interface BootstrapResult {
  success: boolean;
  error?: Error;
}

export const initializeApp = async () => {
  // Initialize logger first so all subsequent logs are captured
  await initLogger();
  log.info('Starting application initialization...');

  log.debug('Initializing data store...');
  await dataStore.initialize();
  log.debug('Data store initialized');

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

  log.debug('Getting UI state...');
  const uiState = await db.getUIState();
  const sortMode = uiState.sortConfig?.mode ?? 'manual';

  const shortcuts = settingsStore.getState().keyboardShortcuts;
  log.debug('Loaded keyboard shortcuts');

  // Initialize app menu only on macOS.
  // Skip under CEF on macOS to avoid IPC deadlock.
  // TODO: Figure out how to support the app menu on macOS under CEF.
  const isWindows = isWindowsPlatform();
  const isMac = isMacPlatform();

  if (isWindows) {
    log.debug('Windows platform detected (WebView2 runtime); skipping app menu initialization');
  } else if (!isMac) {
    log.debug('Non-macOS platform detected; skipping app menu initialization');
  } else {
    const skipMenu = isCEF();
    log.debug(
      `macOS runtime check: ${skipMenu ? 'CEF detected, skipping menu' : 'WebKit detected, initializing menu'}`,
    );

    if (!skipMenu) {
      log.debug('Initializing app menu...');
      await initAppMenu({
        showCompleted: uiState.showCompletedTasks,
        sortMode,
        shortcuts,
      }).catch((error) => {
        log.error('Failed to initialize app menu:', error);
      });
    } else {
      log.debug('Skipping app menu initialization (macOS CEF runtime)');
    }
  }

  log.info('Application initialization finished');
};

export const showWindow = async (delay: number = 200): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const window = getCurrentWindow();
      await window.show();
      await window.setFocus();
      log.debug('Window shown and focused');
      resolve();
    }, delay);
  });
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

/**
 * display an error message in the DOM when initialization fails
 *
 * @param error - the error that occurred during initialization
 */
export const showBootstrapError = async (error: unknown): Promise<void> => {
  await createBootstrapErrorUI(error);
};

export const forceShowWindow = async () => {
  await getCurrentWindow().show();
};
