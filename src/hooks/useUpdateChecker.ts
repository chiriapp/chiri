import { getVersion } from '@tauri-apps/api/app';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';
import { useCallback, useEffect, useState } from 'react';
import { settingsStore } from '$context/settingsContext';
import { loggers } from '$lib/logger';

const log = loggers.updater;

export interface UpdateInfo {
  version: string;
  body?: string;
  date?: string;
  currentVersion: string;
}

export interface UseUpdateCheckerResult {
  updateAvailable: UpdateInfo | null;
  isChecking: boolean;
  error: string | null;
  checkForUpdates: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  dismissUpdate: () => void;
  isDownloading: boolean;
  downloadProgress: number;
}

// Module-level state that persists across component mounts
let sharedUpdateState: UpdateInfo | null = null;
let sharedDismissed = false;
const stateChangeListeners = new Set<() => void>();

const notifyListeners = () => {
  for (const listener of stateChangeListeners) {
    listener();
  }
};

export const useUpdateChecker = (): UseUpdateCheckerResult => {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(sharedUpdateState);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [dismissed, setDismissed] = useState(sharedDismissed);

  // Sync with shared state
  useEffect(() => {
    const listener = () => {
      setUpdateAvailable(sharedUpdateState);
      setDismissed(sharedDismissed);
    };
    stateChangeListeners.add(listener);
    return () => {
      stateChangeListeners.delete(listener);
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    setError(null);

    try {
      log.info('Starting update check...');
      const currentVersion = await getVersion();
      log.info(`Current version: ${currentVersion}`);

      log.info('Checking for updates from endpoint...');
      const update = await check();
      if (update) {
        log.info(`Update available: ${update.version}`);

        // Fetch release notes from GitHub API if not provided by updater
        let body = update.body || '';
        if (!body) {
          try {
            log.info('Fetching release notes from GitHub API...');
            const response = await fetch(
              `https://api.github.com/repos/SapphoSys/chiri/releases/tags/app-v${update.version}`,
              { headers: { Accept: 'application/vnd.github.v3+json' } },
            );
            if (response.ok) {
              const release = await response.json();
              body = release.body || '';
              log.info('Release notes fetched successfully');
            }
          } catch (e) {
            log.warn('Failed to fetch release notes from GitHub:', e);
          }
        }

        const updateInfo = {
          version: update.version,
          body,
          date: update.date,
          currentVersion,
        };
        sharedUpdateState = updateInfo;
        setUpdateAvailable(updateInfo);
        notifyListeners();
      } else {
        log.info('No updates available');
        sharedUpdateState = null;
        setUpdateAvailable(null);
        notifyListeners();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check for updates';
      log.error('Update check failed:', err);
      setError(message);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!updateAvailable) {
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

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
      const message = err instanceof Error ? err.message : 'Failed to download update';
      log.error('Update download failed:', err);
      setError(message);
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

    const timer = setTimeout(() => {
      checkForUpdates();
    }, 5000); // Check 5 seconds after app starts

    return () => {
      clearTimeout(timer);
    };
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
