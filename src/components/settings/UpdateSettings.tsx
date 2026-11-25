import CheckCircle from 'lucide-react/icons/check-circle';
import CircleX from 'lucide-react/icons/circle-x';
import Download from 'lucide-react/icons/download';
import FileText from 'lucide-react/icons/file-text';
import Info from 'lucide-react/icons/info';
import Loader from 'lucide-react/icons/loader-circle';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { LoadingSpinner } from '$components/LoadingSpinner';
import { ChangelogModal } from '$components/modals/ChangelogModal';
import { useSettingsStore } from '$context/settingsContext';
import { useManagedInstallation } from '$hooks/system/useManagedInstallation';
import { useUpdateChecker } from '$hooks/system/useUpdateChecker';
import { useChangelog } from '$hooks/useChangelog';
import { getAppInfo } from '$utils/meta';
import { getPackageManagerName } from '$utils/platform';

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
  const { openChangelog, closeChangelog, changelogData } = useChangelog();

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

      <div className="overflow-hidden rounded-lg border border-surface-300 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between p-4">
          <p className="text-sm text-surface-700 dark:text-surface-300">Current version</p>
          <span className="font-medium text-sm text-surface-800 dark:text-surface-200">
            {version}
          </span>
        </div>

        {!isManagedInstallLoading && !isManagedInstall && (
          <>
            <div className="border-surface-300 border-t dark:border-surface-700" />

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
                className="rounded-sm border-surface-300 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-offset-2"
              />
            </label>

            <div className="border-surface-300 border-t dark:border-surface-700" />

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
                className="flex shrink-0 items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
              >
                {isChecking ? (
                  <>
                    <LoadingSpinner className="h-4 w-4" />
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
      </div>

      {!isManagedInstallLoading && isManagedInstall && (
        <div className="flex items-start gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 p-3 text-sm text-surface-700 dark:text-surface-300">
          <Info className="mt-0.5 size-4 shrink-0 text-semantic-info" />
          <div className="min-w-0">
            <p className="font-medium text-semantic-info">
              Updates managed by {packageManagerName}
            </p>
            <p className="mt-1 text-xs">
              This installation is managed by {packageManagerName}. Update Chiri through your
              system's update mechanism.
            </p>
          </div>
        </div>
      )}

      {showError && (
        <div className="flex items-start gap-2 rounded-lg border border-semantic-error/30 bg-semantic-error/10 p-3 text-sm text-surface-700 dark:text-surface-300">
          <CircleX className="mt-0.5 size-4 shrink-0 text-semantic-error" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-semantic-error">{error.title}</p>
            <p className="mt-1 text-xs">{error.description}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsStatusDismissed(true)}
            aria-label="Dismiss update message"
            className="-m-1 self-start rounded-sm p-1 text-semantic-error outline-hidden transition-colors hover:bg-semantic-error/10 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {showUpToDate && (
        <div className="flex items-center gap-2 rounded-lg border border-semantic-success/30 bg-semantic-success/10 p-3 text-sm text-surface-700 dark:text-surface-300">
          <CheckCircle className="size-4 shrink-0 text-semantic-success" />
          <p className="min-w-0 flex-1">You're up to date!</p>
          <button
            type="button"
            onClick={() => setIsStatusDismissed(true)}
            aria-label="Dismiss update message"
            className="-m-1 self-center rounded-sm p-1 text-semantic-success outline-hidden transition-colors hover:bg-semantic-success/10 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {!isManagedInstallLoading && !isManagedInstall && updateAvailable && (
        <div className="rounded-lg border border-primary-ink/30 bg-primary-500/10 p-3 text-sm text-surface-700 dark:text-surface-300">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <Download className="size-4 shrink-0 text-primary-ink" />
            <p className="whitespace-nowrap font-medium text-surface-800 dark:text-surface-100">
              Chiri v{updateAvailable.version} is available
            </p>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openChangelog(updateAvailable.version, {
                    body: updateAvailable.body ?? '',
                    date: updateAvailable.date,
                  })
                }
                className="flex items-center gap-1.5 rounded-lg border border-surface-300 bg-surface-100 px-2.5 py-1.5 text-surface-700 text-xs outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
              >
                <FileText className="size-3.5" />
                What's new
              </button>

              <button
                type="button"
                onClick={downloadAndInstall}
                disabled={isDownloading}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-500 px-2.5 py-1.5 font-medium text-primary-contrast text-xs outline-hidden transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <Loader className="size-3.5 motion-safe:animate-spin" />
                    Downloading
                  </>
                ) : (
                  <>
                    <Download className="size-3.5" />
                    Install
                  </>
                )}
              </button>
            </div>
          </div>

          {isDownloading && (
            <div className="mt-2">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span>Downloading update...</span>
                <span className="font-medium text-surface-800 dark:text-surface-200">
                  {Math.round(downloadProgress)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-500/20">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {changelogData && (
        <ChangelogModal
          version={changelogData.version}
          html={changelogData.html}
          date={changelogData.date}
          onClose={closeChangelog}
        />
      )}
    </div>
  );
};
