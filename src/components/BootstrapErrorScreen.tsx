import { openUrl } from '@tauri-apps/plugin-opener';
import { arch, exeExtension, locale, platform, version } from '@tauri-apps/plugin-os';
import Bug from 'lucide-react/icons/bug';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Trash2 from 'lucide-react/icons/trash-2';
import { type ReactNode, useState } from 'react';
import { loggers } from '$lib/logger';
import { createErrorReportIssueUrl, getAppInfo } from '$utils/meta';
import { formatPlatformName } from '$utils/platform';

const log = loggers.bootstrap;

interface BootstrapErrorScreenProps {
  error: unknown;
  onResetDatabase: () => Promise<void>;
}

interface ActionCardProps {
  title: string;
  description?: string | string[];
  children: ReactNode;
}

const primaryButtonClasses =
  'inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-primary-500 px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-600 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-800';

const secondaryButtonClasses =
  'inline-flex items-center justify-center gap-2 rounded-md border border-surface-200 bg-surface-50 px-4 py-2 text-sm font-medium text-surface-800 transition-colors hover:bg-surface-100 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-surface-600 dark:bg-surface-700/60 dark:text-surface-200 dark:hover:bg-surface-700 dark:focus-visible:ring-offset-surface-800';

const warningButtonClasses =
  'inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-semantic-warning px-4 py-2 text-sm font-medium text-surface-900 transition-colors hover:opacity-90 outline-hidden focus-visible:ring-2 focus-visible:ring-semantic-warning focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-800';

const destructiveButtonClasses =
  'inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-semantic-error px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:opacity-90 outline-hidden focus-visible:ring-2 focus-visible:ring-semantic-error focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-surface-800';

const cancelButtonClasses =
  'inline-flex items-center justify-center rounded-md border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-100 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700 dark:focus-visible:ring-offset-surface-800';

const cardClasses =
  'rounded-lg border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800';

const errorToString = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const errorStack = (error: unknown) => {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }

  return 'No stack trace available';
};

const ActionCard = ({ title, description, children }: ActionCardProps) => {
  const descriptionLines =
    typeof description === 'undefined'
      ? []
      : Array.isArray(description)
        ? description
        : [description];

  return (
    <section className={`${cardClasses} space-y-3 p-5`}>
      <div className="space-y-2">
        <h2 className="font-semibold text-surface-900 text-xl dark:text-surface-50">{title}</h2>
        {descriptionLines.map((line) => (
          <p key={line} className="text-sm text-surface-600 dark:text-surface-400">
            {line}
          </p>
        ))}
      </div>
      {children}
    </section>
  );
};

export const BootstrapErrorScreen = ({ error, onResetDatabase }: BootstrapErrorScreenProps) => {
  const [confirmResetDatabase, setConfirmResetDatabase] = useState(false);
  const [confirmResetPrefs, setConfirmResetPrefs] = useState(false);
  const [isResettingDatabase, setIsResettingDatabase] = useState(false);
  const [resetDatabaseError, setResetDatabaseError] = useState<string | null>(null);

  const errorMessage = errorToString(error);

  const handleReportIssue = async () => {
    try {
      const [currentPlatform, currentArch, currentVersion, currentExtension, currentLocale] =
        await Promise.all([platform(), arch(), version(), exeExtension(), locale()]);
      const displayPlatform = formatPlatformName(currentPlatform);

      const errorTitle = `Critical startup error on ${displayPlatform} ${currentVersion}`;
      const systemInformation = `- App Version: ${getAppInfo().version}
- OS: ${displayPlatform}
- Version: ${currentVersion}
- Architecture: ${currentArch}
- App Extension: ${currentExtension || 'Unknown'}
- System Locale: ${currentLocale}`;

      const issueUrl = createErrorReportIssueUrl({
        title: errorTitle,
        steps: '1. Open Chiri\n2. See startup error',
        errorMessage,
        stackTrace: errorStack(error),
        systemInformation,
      });
      await openUrl(issueUrl);
    } catch (err) {
      log.error('Failed to open issue report:', err);
    }
  };

  const handleResetPreferences = () => {
    localStorage.removeItem('chiri-settings');
    window.location.reload();
  };

  const handleResetDatabase = async () => {
    setIsResettingDatabase(true);
    setResetDatabaseError(null);

    try {
      await onResetDatabase();
    } catch (err) {
      log.error('Failed to reset database:', err);
      setResetDatabaseError(`Failed to reset database: ${errorToString(err)}`);
      setIsResettingDatabase(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-white p-6 dark:bg-surface-900">
      <main className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col justify-center gap-6 py-10">
        <section className={`${cardClasses} space-y-6 p-6`}>
          <div className="space-y-2">
            <h1 className="font-bold text-3xl text-surface-900 dark:text-surface-50">
              Something went wrong :(
            </h1>
            <p className="text-surface-600 dark:text-surface-400">
              The app hit a critical startup error.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-lg text-surface-900 dark:text-surface-50">
              Error details:
            </h2>
            <div className="max-h-48 overflow-auto rounded-md border border-surface-200 bg-surface-100 p-4 font-mono text-sm dark:border-surface-700 dark:bg-surface-900">
              <p className="selectable whitespace-pre-line text-semantic-error">{errorMessage}</p>
            </div>
          </div>
        </section>

        <ActionCard
          title="Report Issue"
          description="Help us fix this issue by submitting a bug report on GitHub."
        >
          <button type="button" onClick={handleReportIssue} className={primaryButtonClasses}>
            <Bug className="h-4 w-4" aria-hidden="true" />
            File issue on GitHub
          </button>
        </ActionCard>

        <ActionCard title="Recovery">
          <div className="divide-y divide-surface-200 dark:divide-surface-700">
            <section className="space-y-3 pb-5">
              <div className="space-y-1.5">
                <h3 className="font-semibold text-base text-surface-900 dark:text-surface-50">
                  Reset Preferences
                </h3>
                <p
                  className={
                    confirmResetPrefs
                      ? 'font-semibold text-semantic-warning text-sm'
                      : 'text-sm text-surface-600 dark:text-surface-400'
                  }
                >
                  {confirmResetPrefs
                    ? 'Reset preferences to defaults and reload?'
                    : 'Restore defaults. Accounts and tasks stay intact.'}
                </p>
              </div>
              {!confirmResetPrefs ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmResetPrefs(true);
                    setConfirmResetDatabase(false);
                    setResetDatabaseError(null);
                  }}
                  className={secondaryButtonClasses}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reset Preferences
                </button>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleResetPreferences}
                    className={warningButtonClasses}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetPrefs(false)}
                    className={cancelButtonClasses}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </section>

            <section className="space-y-3 pt-5">
              <div className="space-y-1.5">
                <h3 className="font-semibold text-base text-surface-900 dark:text-surface-50">
                  Reset Database
                </h3>
                <p
                  className={
                    confirmResetDatabase
                      ? 'font-semibold text-semantic-error text-sm'
                      : 'text-sm text-surface-600 dark:text-surface-400'
                  }
                >
                  {confirmResetDatabase
                    ? 'Delete local data and reload? This cannot be undone.'
                    : 'Clear local data. CalDAV server data stays intact.'}
                </p>
              </div>
              {!confirmResetDatabase ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmResetDatabase(true);
                    setConfirmResetPrefs(false);
                  }}
                  className={destructiveButtonClasses}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Reset Database
                </button>
              ) : (
                <div className="space-y-3">
                  {resetDatabaseError && (
                    <p className="selectable text-semantic-error text-sm">{resetDatabaseError}</p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleResetDatabase}
                      disabled={isResettingDatabase}
                      className={destructiveButtonClasses}
                    >
                      {isResettingDatabase ? 'Resetting...' : 'Reset'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmResetDatabase(false);
                        setResetDatabaseError(null);
                      }}
                      disabled={isResettingDatabase}
                      className={cancelButtonClasses}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </ActionCard>
      </main>
    </div>
  );
};
