import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const UPDATE_AVAILABLE_QUERY_KEY = ['system', 'updater', 'available'] as const;
const UPDATE_DISMISSED_QUERY_KEY = ['system', 'updater', 'dismissed'] as const;
const CHECK_UPDATES_MUTATION_KEY = ['system', 'updater', 'check'] as const;
const DOWNLOAD_UPDATE_MUTATION_KEY = ['system', 'updater', 'download'] as const;

type CheckForUpdatesArgs = {
  trigger: string;
  onUpdateFound?: () => void;
};

let activeUpdateCheckTrigger: string | null = null;
let isCheckInProgress = false;
let startupUpdateCheckScheduled = false;

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
  const queryClient = useQueryClient();

  const { data: updateAvailable = null } = useQuery<UpdateInfo | null>({
    queryKey: UPDATE_AVAILABLE_QUERY_KEY,
    queryFn: () => null,
    initialData: null,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const { data: dismissed = false } = useQuery<boolean>({
    queryKey: UPDATE_DISMISSED_QUERY_KEY,
    queryFn: () => false,
    initialData: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const [error, setError] = useState<UpdateError | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const checkForUpdatesMutation = useMutation<void, unknown, CheckForUpdatesArgs>({
    mutationKey: CHECK_UPDATES_MUTATION_KEY,
    mutationFn: async ({ trigger, onUpdateFound }) => {
      const isMenuCheck = trigger === 'menu-manual';

      const disableUpdates = await shouldDisableUpdates();
      if (disableUpdates) {
        log.info('Update check skipped for managed installation', {
          trigger,
        });
        queryClient.setQueryData(UPDATE_AVAILABLE_QUERY_KEY, null);
        return;
      }

      const currentVersion = await getVersion();
      log.info(`Starting update check... (Current version: ${currentVersion})`, {
        trigger,
      });

      const update = await check();
      if (update) {
        log.info(`Update available: ${update.version}`);

        if (isMenuCheck) {
          toastManager.dismiss('update-check-checking');
        }

        const body = update.body || (await fetchReleaseNotes(update.version));
        const updateInfo: UpdateInfo = {
          version: update.version,
          body,
          date: update.date,
          currentVersion,
        };

        queryClient.setQueryData(UPDATE_AVAILABLE_QUERY_KEY, updateInfo);

        if (onUpdateFound) {
          onUpdateFound();
        }
        return;
      }

      log.info('No updates available');
      queryClient.setQueryData(UPDATE_AVAILABLE_QUERY_KEY, null);

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
    },
  });

  const downloadUpdateMutation = useMutation<void, unknown, UpdateInfo>({
    mutationKey: DOWNLOAD_UPDATE_MUTATION_KEY,
    mutationFn: async () => {
      const disableUpdates = await shouldDisableUpdates();
      if (disableUpdates) {
        throw new Error('__managed_installation__');
      }

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
    },
  });

  const isChecking = useIsMutating({ mutationKey: CHECK_UPDATES_MUTATION_KEY }) > 0;
  const isDownloading = useIsMutating({ mutationKey: DOWNLOAD_UPDATE_MUTATION_KEY }) > 0;

  const checkForUpdates = useCallback(
    async (trigger = 'unknown', onUpdateFound?: () => void) => {
      if (isCheckInProgress) {
        log.info('Update check skipped - already in progress', {
          requestedBy: trigger,
          activeBy: activeUpdateCheckTrigger,
        });
        return;
      }

      isCheckInProgress = true;
      activeUpdateCheckTrigger = trigger;
      setError(null);

      const isMenuCheck = trigger === 'menu-manual';
      if (isMenuCheck) {
        toastManager.info('Checking for updates...', '', 'update-check-checking', undefined, false);
      }

      try {
        await checkForUpdatesMutation.mutateAsync({ trigger, onUpdateFound });
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
        isCheckInProgress = false;
        activeUpdateCheckTrigger = null;
      }
    },
    [checkForUpdatesMutation],
  );

  const downloadAndInstall = useCallback(async () => {
    if (!updateAvailable) {
      return;
    }

    setError(null);
    setDownloadProgress(0);

    try {
      await downloadUpdateMutation.mutateAsync(updateAvailable);
    } catch (err) {
      if (err instanceof Error && err.message === '__managed_installation__') {
        log.warn('Update download blocked for managed installation');
        setError({
          kind: 'download',
          title: 'Updates are managed by your package manager',
          description:
            'This installation is managed externally. Please update Chiri through your system package manager.',
        });
        return;
      }

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
    }
  }, [downloadUpdateMutation, updateAvailable]);

  const dismissUpdate = useCallback(() => {
    queryClient.setQueryData(UPDATE_DISMISSED_QUERY_KEY, true);
    queryClient.setQueryData(UPDATE_AVAILABLE_QUERY_KEY, null);
  }, [queryClient]);

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
