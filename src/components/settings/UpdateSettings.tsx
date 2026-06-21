import CheckCircle from 'lucide-react/icons/check-circle';
import Download from 'lucide-react/icons/download';
import FileText from 'lucide-react/icons/file-text';
import Info from 'lucide-react/icons/info';
import Loader from 'lucide-react/icons/loader-circle';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { ChangelogModal } from '$components/modals/ChangelogModal';
import { useSettingsStore } from '$context/settingsContext';
import { useManagedInstallation } from '$hooks/system/useManagedInstallation';
import { useUpdateChecker } from '$hooks/system/useUpdateChecker';
import { getPackageManagerName } from '$utils/platform';
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
  const [isStatusDismissed, setIsStatusDismissed] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);

  const handleManualCheck = async () => {
    setHasManuallyChecked(true);
    setIsStatusDismissed(false);
    await checkForUpdates('settings-manual');
  };

  const showError =
    !isManagedInstall &&
    !isChecking &&
    !isStatusDismissed &&
    error &&
    (hasManuallyChecked || error.kind === 'download');
  const showUpToDate =
    !isManagedInstall &&
    hasManuallyChecked &&
    !isChecking &&
    !isStatusDismissed &&
    !updateAvailable &&
    !error;

  const packageManagerName = getPackageManagerName(installType);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Updates</h3>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between p-4">
          <p className="text-sm text-surface-700 dark:text-surface-300">Current version</p>
          <span className="font-medium text-sm text-surface-800 dark:text-surface-200">
            {version}
          </span>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        {!isManagedInstallLoading && isManagedInstall && (
          <div className="flex items-start gap-2 bg-semantic-info/10 px-4 py-3 text-surface-700 dark:text-surface-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-semantic-info" />
            <div>
              <p className="font-medium text-sm">Updates managed by {packageManagerName}</p>
              <p className="mt-0.5 text-xs">
                This installation is managed by {packageManagerName}. Update Chiri through your
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
                <p className="text-surface-500 text-xs dark:text-surface-400">
                  Check for new releases on startup
                </p>
              </div>
              <input
                type="checkbox"
                checked={checkForUpdatesAutomatically}
                onChange={(e) => setCheckForUpdatesAutomatically(e.target.checked)}
                className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              />
            </label>

            <div className="border-surface-200 border-t dark:border-surface-700" />

            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm text-surface-700 dark:text-surface-300">Check for updates</p>
                <p className="text-surface-500 text-xs dark:text-surface-400">
                  Look for new releases now
                </p>
              </div>
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isChecking}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
              >
                {isChecking ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Check now
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {showError && (
          <>
            <div className="border-surface-200 border-t dark:border-surface-700" />
            <div className="flex items-start gap-2 bg-semantic-error/10 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-semantic-error text-sm">{error.title}</p>
                <p className="mt-0.5 text-semantic-error text-xs opacity-80">{error.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsStatusDismissed(true)}
                aria-label="Dismiss update message"
                className="-mr-1 rounded-sm p-1 text-semantic-error outline-hidden transition-colors hover:bg-semantic-error/10 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {showUpToDate && (
          <>
            <div className="border-surface-200 border-t dark:border-surface-700" />
            <div className="flex items-center gap-2 bg-semantic-success/10 px-4 py-3">
              <CheckCircle className="h-4 w-4 shrink-0 text-semantic-success" />
              <p className="flex-1 text-semantic-success text-sm">You're up to date!</p>
              <button
                type="button"
                onClick={() => setIsStatusDismissed(true)}
                aria-label="Dismiss update message"
                className="-mr-1 rounded-sm p-1 text-semantic-success outline-hidden transition-colors hover:bg-semantic-success/10 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {!isManagedInstallLoading && !isManagedInstall && updateAvailable && (
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <div className="flex items-start gap-3 p-4">
            <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
            <div>
              <p className="font-semibold text-sm text-surface-800 dark:text-surface-200">
                Update available: {updateAvailable.version}
              </p>
              <p className="mt-0.5 text-surface-500 text-xs dark:text-surface-400">
                A new version is ready to download and install.
              </p>
            </div>
          </div>

          {isDownloading && (
            <>
              <div className="border-surface-200 border-t dark:border-surface-700" />
              <div className="px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-surface-600 text-xs dark:text-surface-400">
                    Downloading update...
                  </span>
                  <span className="font-medium text-surface-800 text-xs dark:text-surface-200">
                    {Math.round(downloadProgress)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            </>
          )}

          <div className="border-surface-200 border-t dark:border-surface-700" />

          <div className="flex gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => setShowChangelogModal(true)}
              className="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
            >
              <FileText className="h-4 w-4" />
              Changelog
            </button>

            <button
              type="button"
              onClick={downloadAndInstall}
              disabled={isDownloading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-500 px-3 py-1.5 font-medium text-primary-contrast text-sm outline-hidden transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
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
