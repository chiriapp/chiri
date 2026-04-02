import { getVersion } from '@tauri-apps/api/app';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';
import { useCallback, useEffect, useState } from 'react';
import { settingsStore } from '$context/settingsContext';
import { toastManager } from '$hooks/ui/useToast';
import { loggers } from '$lib/logger';
import { shouldDisableUpdates } from '$utils/platform';
import { fetchReleaseNotes } from '$utils/version';

const log = loggers.updater;

export interface UpdateInfo {
  version: string;
  body?: string;
  date?: string;
  currentVersion: string;
}

export interface UpdateError {
  kind: 'check' | 'download';
  title: string;
  description: string;
}

export interface UseUpdateCheckerResult {
  updateAvailable: UpdateInfo | null;
  isChecking: boolean;
  error: UpdateError | null;
  checkForUpdates: (trigger?: string, onUpdateFound?: () => void) => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  dismissUpdate: () => void;
  isDownloading: boolean;
  downloadProgress: number;
}

// Module-level state that persists across component mounts
let sharedUpdateState: UpdateInfo | null = null;
let sharedDismissed = false;
let sharedIsChecking = false;
let activeUpdateCheckTrigger: string | null = null;
let startupUpdateCheckScheduled = false;
const stateChangeListeners = new Set<() => void>();

const notifyListeners = () => {
  for (const listener of stateChangeListeners) {
    listener();
  }
};

const extractErrorMessage = (err: unknown) => {
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === 'string') {
    return err;
  }

  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Unknown error';
};

const toUserFriendlyUpdateCheckError = (rawMessage: string) => {
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes('valid release json') ||
    normalized.includes('release json') ||
    normalized.includes('manifest')
  ) {
    return 'Unable to read update metadata from the update server. Please try again later.';
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('connection') ||
    normalized.includes('dns') ||
    normalized.includes('offline')
  ) {
    return 'Network error while checking for updates. Please check your internet connection and try again.';
  }

  if (normalized.includes('timeout') || normalized.includes('timed out')) {
    return 'Update check timed out. Please try again in a moment.';
  }

  if (
    normalized.includes('401') ||
    normalized.includes('403') ||
    normalized.includes('unauthorized') ||
    normalized.includes('forbidden')
  ) {
    return 'Update server rejected the request (permission/auth issue). Please verify updater credentials or endpoint access.';
  }

  if (normalized.includes('404') || normalized.includes('not found')) {
    return 'Update endpoint was not found. Please verify the configured update URL.';
  }

  return `Update check failed: ${rawMessage}`;
};

const toUserFriendlyUpdateDownloadError = (rawMessage: string) => {
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes('not enough space') || normalized.includes('no space')) {
    return 'Not enough disk space to download the update.';
  }

  if (normalized.includes('signature') || normalized.includes('integrity')) {
    return 'Downloaded update failed verification. Please try again later.';
  }

  if (normalized.includes('network') || normalized.includes('failed to fetch')) {
    return 'Network error while downloading the update. Please check your connection and retry.';
  }

  return `Update download failed: ${rawMessage}`;
};

export const useUpdateChecker = (): UseUpdateCheckerResult => {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(sharedUpdateState);
  const [isChecking, setIsChecking] = useState(sharedIsChecking);
  const [error, setError] = useState<UpdateError | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [dismissed, setDismissed] = useState(sharedDismissed);

  // Sync with shared state
  useEffect(() => {
    const listener = () => {
      setUpdateAvailable(sharedUpdateState);
      setDismissed(sharedDismissed);
      setIsChecking(sharedIsChecking);
    };
    stateChangeListeners.add(listener);
    return () => {
      stateChangeListeners.delete(listener);
    };
  }, []);

  const checkForUpdates = useCallback(async (trigger = 'unknown', onUpdateFound?: () => void) => {
    if (sharedIsChecking) {
      log.info('Update check skipped - already in progress', {
        requestedBy: trigger,
        activeBy: activeUpdateCheckTrigger,
      });
      return;
    }

    sharedIsChecking = true;
    activeUpdateCheckTrigger = trigger;
    notifyListeners();
    setIsChecking(true);
    setError(null);

    // Show feedback only for app menu checks
    const isMenuCheck = trigger === 'menu-manual';
    if (isMenuCheck) {
      toastManager.info('Checking for updates...', '', 'update-check-checking', undefined, false);
    }

    try {
      const disableUpdates = await shouldDisableUpdates();
      if (disableUpdates) {
        log.info('Update check skipped for managed installation', {
          trigger,
        });
        sharedUpdateState = null;
        setUpdateAvailable(null);
        notifyListeners();
        return;
      }

      const currentVersion = await getVersion();
      log.info(`Starting update check... (Current version: ${currentVersion})`, {
        trigger,
      });

      const update = await check();
      if (update) {
        log.info(`Update available: ${update.version}`);

        // Dismiss the checking toast for menu checks
        if (isMenuCheck) {
          toastManager.dismiss('update-check-checking');
        }

        // Fetch release notes from GitHub API if not provided by updater
        const body = update.body || (await fetchReleaseNotes(update.version));

        const updateInfo = {
          version: update.version,
          body,
          date: update.date,
          currentVersion,
        };
        sharedUpdateState = updateInfo;
        setUpdateAvailable(updateInfo);
        notifyListeners();

        // Call the callback if provided (to show modal)
        if (onUpdateFound) {
          onUpdateFound();
        }
      } else {
        log.info('No updates available');
        sharedUpdateState = null;
        setUpdateAvailable(null);
        notifyListeners();

        // Show success message for menu checks
        if (isMenuCheck) {
          toastManager.dismiss('update-check-checking');
          toastManager.success(
            "You're up to date!",
            `Running version ${currentVersion}`,
            'update-check-success',
            undefined,
            false,
          );
        }
      }
    } catch (err) {
      const rawMessage = extractErrorMessage(err);
      const userMessage = toUserFriendlyUpdateCheckError(rawMessage);
      log.error('Update check failed:', {
        error: err,
        trigger,
        rawMessage,
        userMessage,
      });
      setError({
        kind: 'check',
        title: 'Update check failed',
        description: userMessage,
      });

      // Show error toast for menu checks
      if (isMenuCheck) {
        toastManager.dismiss('update-check-checking');
        toastManager.error(
          'Update check failed',
          userMessage,
          'update-check-error',
          undefined,
          false,
        );
      }
    } finally {
      sharedIsChecking = false;
      activeUpdateCheckTrigger = null;
      notifyListeners();
      setIsChecking(false);
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!updateAvailable) {
      return;
    }

    const disableUpdates = await shouldDisableUpdates();
    if (disableUpdates) {
      log.warn('Update download blocked for managed installation');
      setError({
        kind: 'download',
        title: 'Updates are managed by your package manager',
        description:
          'This installation is managed externally. Please update Chiri through your system package manager.',
      });
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      const update = await check();
      if (!update) {
        throw new Error('Update no longer available');
      }

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0;
            log.info(`Download started: ${contentLength} bytes`);
            break;
          case 'Progress': {
            downloaded += event.data.chunkLength;
            const progress = contentLength > 0 ? (downloaded / contentLength) * 100 : 0;
            setDownloadProgress(progress);
            break;
          }
          case 'Finished':
            log.info('Download finished');
            setDownloadProgress(100);
            break;
        }
      });

      log.info('Update installed, relaunching...');
      await relaunch();
    } catch (err) {
      const rawMessage = extractErrorMessage(err);
      const userMessage = toUserFriendlyUpdateDownloadError(rawMessage);
      log.error('Update download failed:', {
        error: err,
        rawMessage,
        userMessage,
      });
      setError({
        kind: 'download',
        title: 'Update download failed',
        description: userMessage,
      });
    } finally {
      setIsDownloading(false);
    }
  }, [updateAvailable]);

  const dismissUpdate = useCallback(() => {
    sharedDismissed = true;
    sharedUpdateState = null;
    setDismissed(true);
    setUpdateAvailable(null);
    notifyListeners();
  }, []);

  useEffect(() => {
    // Check if automatic updates are enabled
    const { checkForUpdatesAutomatically } = settingsStore.getState();
    if (!checkForUpdatesAutomatically) {
      log.info('Automatic update checks are disabled');
      return;
    }

    if (startupUpdateCheckScheduled) {
      return;
    }

    startupUpdateCheckScheduled = true;

    checkForUpdates('startup-auto');
  }, [checkForUpdates]);

  return {
    updateAvailable: dismissed ? null : updateAvailable,
    isChecking,
    error,
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
    isDownloading,
    downloadProgress,
  };
};
