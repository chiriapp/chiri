import { getVersion } from '@tauri-apps/api/app';
import { useCallback, useState } from 'react';
import { useUpdateChecker } from '$hooks/system/useUpdateChecker';
import { toastManager } from '$hooks/ui/useToast';
import { useChangelog } from '$hooks/useChangelog';

export const useAppUpdates = () => {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const { openChangelog, closeChangelog, changelogData } = useChangelog();
  const {
    updateAvailable,
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
    isDownloading,
    downloadProgress,
    error: updateError,
  } = useUpdateChecker();

  const checkForUpdatesFromMenu = useCallback(() => {
    checkForUpdates('menu-manual', () => setShowUpdateModal(true));
  }, [checkForUpdates]);

  const showChangelogFromMenu = useCallback(async () => {
    toastManager.info('Loading release notes...', '', 'changelog-loading', undefined, false);
    if (updateAvailable?.body) {
      await openChangelog(updateAvailable.version, updateAvailable.body, updateAvailable.date);
      toastManager.dismiss('changelog-loading');
      return;
    }

    const version = await getVersion();
    await openChangelog(version);
    toastManager.dismiss('changelog-loading');
  }, [openChangelog, updateAvailable]);

  return {
    showUpdateModal,
    setShowUpdateModal,
    updateAvailable,
    isDownloading,
    downloadProgress,
    updateError,
    downloadAndInstall,
    dismissUpdate,
    changelogData,
    closeChangelog,
    checkForUpdatesFromMenu,
    showChangelogFromMenu,
  };
};
