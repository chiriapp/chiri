import { BaseDirectory, remove } from '@tauri-apps/plugin-fs';
import { platform } from '@tauri-apps/plugin-os';
import { relaunch } from '@tauri-apps/plugin-process';
import { settingsStore } from '$context/settingsContext';
import { getUIState } from '$lib/database';
import { initLogger, loggers } from '$lib/logger';
import { initializeDataStore } from '$lib/store';
import { initAppMenu } from '$utils/menu';
import { isCEF } from '$utils/platform';

const currentPlatform = platform();

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
  await initializeDataStore();
  log.debug('Data store initialized');

  // initialize system tray based on settings
  log.debug('Initializing system tray...');
  const { invoke } = await import('@tauri-apps/api/core');
  const enableSystemTray = settingsStore.getState().enableSystemTray;

  try {
    await invoke('initialize_tray', { enabled: enableSystemTray });
    log.debug(`System tray initialized (enabled: ${enableSystemTray})`);
    // Sync the applied value with the current setting on app start
    settingsStore.setSystemTrayAppliedValue(enableSystemTray);
  } catch (error) {
    log.error('Failed to initialize system tray:', error);
  }

  log.debug('Getting UI state...');
  const uiState = await getUIState();
  const sortMode = uiState.sortConfig?.mode ?? 'manual';

  const shortcuts = settingsStore.getState().keyboardShortcuts;
  log.debug('Loaded keyboard shortcuts');

  // initialize macOS application menu with current state and user shortcuts
  // Skip under CEF to avoid IPC deadlock
  // TODO: Figure out how to support the app menu on macOS under CEF.
  const skipMenu = isCEF();
  log.debug(
    `CEF runtime check: ${skipMenu ? 'CEF detected, skipping menu' : 'Not CEF, initializing menu'}`,
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
    log.debug('Skipping app menu initialization (CEF runtime)');
  }

  log.info('Application initialization complete');
};

export const showWindow = async (delay: number = 200): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
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
    const baseDir =
      currentPlatform === 'macos' ? BaseDirectory.AppLocalData : BaseDirectory.AppConfig;
    await remove('caldav-tasks.db', { baseDir });
    log.info('Database file deleted successfully');

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
  const { createBootstrapErrorUI } = await import('$lib/errorUI');
  await createBootstrapErrorUI(error);
};

export const forceShowWindow = async () => {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().show();
};
