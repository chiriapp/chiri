import CheckCircle from 'lucide-react/icons/check-circle';
import Download from 'lucide-react/icons/download';
import FileText from 'lucide-react/icons/file-text';
import Info from 'lucide-react/icons/info';
import Loader from 'lucide-react/icons/loader-circle';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import { useState } from 'react';
import { ChangelogModal } from '$components/modals/ChangelogModal';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { useManagedInstallation } from '$hooks/system/useManagedInstallation';
import { useUpdateChecker } from '$hooks/system/useUpdateChecker';
import { getAppInfo } from '$utils/version';

export const UpdateSettings = () => {
  const { version } = getAppInfo();
  const { checkForUpdatesAutomatically, setCheckForUpdatesAutomatically } = useSettingsStore();
  const {
    isManagedInstall,
    installType,
    isLoading: isManagedInstallLoading,
  } = useManagedInstallation();
  const {
    updateAvailable,
    isChecking,
    error,
    checkForUpdates,
    downloadAndInstall,
    isDownloading,
    downloadProgress,
  } = useUpdateChecker();
  const [hasManuallyChecked, setHasManuallyChecked] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);

  const handleManualCheck = async () => {
    setHasManuallyChecked(true);
    await checkForUpdates('settings-manual');
  };

  const showError =
    !isManagedInstall && !isChecking && error && (hasManuallyChecked || error.kind === 'download');
  const showUpToDate =
    !isManagedInstall && hasManuallyChecked && !isChecking && !updateAvailable && !error;

  const getPackageManagerName = () => {
    switch (installType) {
      case 'nix':
        return 'Nix';
      case 'aur':
        return 'AUR (Arch User Repository)';
      case 'flatpak':
        return 'Flatpak';
      default:
        return 'your package manager';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">Updates</h3>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <div className="flex items-center justify-between p-4">
          <p className="text-sm text-surface-700 dark:text-surface-300">Current version</p>
          <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
            {version}
          </span>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        {!isManagedInstallLoading && isManagedInstall && (
          <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium">Updates managed by {getPackageManagerName()}</p>
              <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
                This installation is managed by {getPackageManagerName()}. Update Chiri through your
                system's update mechanism.
              </p>
            </div>
          </div>
        )}

        {!isManagedInstallLoading && !isManagedInstall && (
          <>
            <label className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-surface-700 dark:text-surface-300">
                  Check for updates automatically
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  Check for new releases on startup
                </p>
              </div>
              <input
                type="checkbox"
                checked={checkForUpdatesAutomatically}
                onChange={(e) => setCheckForUpdatesAutomatically(e.target.checked)}
                className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
              />
            </label>

            <div className="border-t border-surface-200 dark:border-surface-700" />

            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm text-surface-700 dark:text-surface-300">Check for updates</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  Look for new releases now
                </p>
              </div>
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isChecking}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 disabled:opacity-50 disabled:cursor-not-allowed text-surface-700 dark:text-surface-300 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset shrink-0"
              >
                {isChecking ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Check now
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {showError && (
          <>
            <div className="border-t border-surface-200 dark:border-surface-700" />
            <div className="px-4 py-3 bg-red-50 dark:bg-red-950/50">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{error.title}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error.description}</p>
            </div>
          </>
        )}

        {showUpToDate && (
          <>
            <div className="border-t border-surface-200 dark:border-surface-700" />
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-950/50">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">You're up to date!</p>
            </div>
          </>
        )}
      </div>

      {!isManagedInstallLoading && !isManagedInstall && updateAvailable && (
        <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
          <div className="flex items-start gap-3 p-4">
            <Download className="w-5 h-5 mt-0.5 shrink-0 text-primary-500" />
            <div>
              <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                Update available — {updateAvailable.version}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                A new version is ready to download and install.
              </p>
            </div>
          </div>

          {isDownloading && (
            <>
              <div className="border-t border-surface-200 dark:border-surface-700" />
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-surface-600 dark:text-surface-400">
                    Downloading update...
                  </span>
                  <span className="text-xs font-medium text-surface-800 dark:text-surface-200">
                    {Math.round(downloadProgress)}%
                  </span>
                </div>
                <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary-500 h-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            </>
          )}

          <div className="border-t border-surface-200 dark:border-surface-700" />

          <div className="flex gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => setShowChangelogModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 border border-surface-200 dark:border-surface-600 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <FileText className="w-4 h-4" />
              Changelog
            </button>

            <button
              type="button"
              onClick={downloadAndInstall}
              disabled={isDownloading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-primary-contrast rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              {isDownloading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download & install
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {showChangelogModal && updateAvailable && (
        <ChangelogModal
          version={updateAvailable.version}
          changelog={updateAvailable.body || ''}
          onClose={() => setShowChangelogModal(false)}
        />
      )}
    </div>
  );
};
