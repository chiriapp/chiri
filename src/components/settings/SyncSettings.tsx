import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import Loader2 from 'lucide-react/icons/loader-2';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import TriangleAlert from 'lucide-react/icons/triangle-alert';
import XCircle from 'lucide-react/icons/x-circle';
import { Select } from '$components/Select';
import { SYNC_INTERVAL_OPTIONS } from '$constants/settings';
import { useSettingsStore } from '$context/settingsContext';
import { useSyncStore } from '$context/syncContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useTasks } from '$hooks/queries/useTasks';

const SYNC_SOURCE_LABELS: Record<string, string> = {
  'header-sync-button': 'manually',
  'tray-sync': 'manually',
  'keyboard-shortcut': 'manually',
  'app-menu': 'manually',
  'settings-sync-button': 'manually',
  'auto-interval': 'automatically',
  'startup-initial': 'on startup',
  'auto-reconnect': 'on reconnect',
  'webdav-push': 'from WebDAV Push',
};

const formatSyncDate = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);

const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const SyncEmptyState = ({ hasCalDAVAccounts }: { hasCalDAVAccounts: boolean }) => {
  const Icon = hasCalDAVAccounts ? RefreshCw : TriangleAlert;

  return (
    <div className="flex gap-2">
      <Icon
        className={`mt-px size-4 shrink-0 ${
          hasCalDAVAccounts ? 'text-surface-400' : 'text-semantic-warning'
        }`}
      />
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-surface-700 dark:text-surface-200">
          {hasCalDAVAccounts ? 'Not synced yet' : 'Sync unavailable'}
        </p>
        <p className="text-surface-500 dark:text-surface-400">
          {hasCalDAVAccounts
            ? 'Sync runs after startup, reconnect, schedule, push, or manual requests.'
            : 'Add a CalDAV account to enable sync.'}
        </p>
      </div>
    </div>
  );
};

export const SyncSettings = () => {
  const {
    autoSync,
    setAutoSync,
    syncInterval,
    setSyncInterval,
    syncOnStartup,
    setSyncOnStartup,
    syncOnReconnect,
    setSyncOnReconnect,
  } = useSettingsStore();
  const {
    isSyncing,
    syncingCalendarId,
    syncProgress,
    lastSyncTime,
    lastSyncSource,
    lastSyncError,
    requestSync,
  } = useSyncStore();
  const { data: accounts = [] } = useAccounts();
  const { data: tasks = [] } = useTasks();
  const caldavAccounts = accounts.filter((account) => account.caldav);
  const caldavAccountIds = new Set(caldavAccounts.map((account) => account.id));
  const hasCalDAVAccounts = caldavAccounts.length > 0;
  const isSyncInProgress = isSyncing || syncingCalendarId !== null;
  const syncingCalendarName = syncingCalendarId
    ? (caldavAccounts
        .flatMap((account) => account.calendars)
        .find((calendar) => calendar.id === syncingCalendarId)?.displayName ?? null)
    : null;
  const unsyncedTaskCount = tasks.filter(
    (task) => caldavAccountIds.has(task.accountId) && !task.localOnly && !task.synced,
  ).length;
  const lastSyncSourceLabel = lastSyncSource ? SYNC_SOURCE_LABELS[lastSyncSource] : null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Sync</h3>

      <section className="space-y-2">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Status</h4>
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm text-surface-700 dark:text-surface-300">Sync status</p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                {hasCalDAVAccounts
                  ? `${pluralize(caldavAccounts.length, 'CalDAV account')} configured`
                  : 'No CalDAV accounts configured'}
              </p>
            </div>
            <button
              type="button"
              onClick={requestSync}
              disabled={!hasCalDAVAccounts || isSyncInProgress}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-surface-700 dark:text-surface-200 dark:hover:bg-surface-600"
            >
              {isSyncInProgress ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Sync now
            </button>
          </div>

          <div className="mx-4 mb-4 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs dark:border-surface-700 dark:bg-surface-900/60">
            {isSyncInProgress ? (
              <div className="flex gap-2">
                <Loader2 className="mt-px size-4 shrink-0 animate-spin text-semantic-info" />
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-surface-700 dark:text-surface-200">
                    {syncingCalendarName ? `Syncing ${syncingCalendarName}` : 'Syncing'}
                  </p>
                  <p className="text-surface-500 dark:text-surface-400">
                    {syncProgress
                      ? `${syncProgress.current}/${syncProgress.total} calendars`
                      : 'Checking CalDAV accounts'}
                  </p>
                </div>
              </div>
            ) : lastSyncError ? (
              <div className="flex gap-2">
                <XCircle className="mt-px size-4 shrink-0 text-semantic-error" />
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-surface-700 dark:text-surface-200">
                    Last sync failed
                  </p>
                  <p className="wrap-break-word text-surface-500 dark:text-surface-400">
                    {lastSyncError}
                  </p>
                </div>
              </div>
            ) : lastSyncTime ? (
              <div className="flex gap-2">
                <CheckCircle2 className="mt-px size-4 shrink-0 text-semantic-success" />
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-surface-700 dark:text-surface-200">
                    Last synced{lastSyncSourceLabel ? ` ${lastSyncSourceLabel}` : ''}
                  </p>
                  <p className="text-surface-500 dark:text-surface-400">
                    {formatSyncDate(lastSyncTime)}
                  </p>
                </div>
              </div>
            ) : (
              <SyncEmptyState hasCalDAVAccounts={hasCalDAVAccounts} />
            )}
          </div>

          <div className="border-surface-200 border-t dark:border-surface-700" />

          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm text-surface-700 dark:text-surface-300">
                Unsynced local changes
              </p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                CalDAV tasks waiting to be sent to the server
              </p>
            </div>
            <p className="shrink-0 text-sm text-surface-700 dark:text-surface-300">
              {unsyncedTaskCount}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Schedule</h4>
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <label className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm text-surface-700 dark:text-surface-300">Scheduled sync</p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Check CalDAV servers on a timer
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(event) => setAutoSync(event.target.checked)}
              className="shrink-0 rounded border-surface-300 outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-surface-600"
            />
          </label>

          <div className="border-surface-200 border-t dark:border-surface-700" />

          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm text-surface-700 dark:text-surface-300">Check interval</p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                How often Chiri checks for remote changes
              </p>
            </div>
            <Select
              id="sync-interval"
              value={syncInterval.toString()}
              onChange={(event) => setSyncInterval(Number(event.target.value))}
              disabled={!autoSync}
              className="shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
            >
              {SYNC_INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Triggers</h4>
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <label className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm text-surface-700 dark:text-surface-300">Sync on startup</p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Sync when Chiri opens
              </p>
            </div>
            <input
              type="checkbox"
              checked={syncOnStartup}
              onChange={(event) => setSyncOnStartup(event.target.checked)}
              className="shrink-0 rounded border-surface-300 outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-surface-600"
            />
          </label>

          <div className="border-surface-200 border-t dark:border-surface-700" />

          <label className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm text-surface-700 dark:text-surface-300">Sync on reconnect</p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Sync after the network comes back
              </p>
            </div>
            <input
              type="checkbox"
              checked={syncOnReconnect}
              onChange={(event) => setSyncOnReconnect(event.target.checked)}
              className="shrink-0 rounded border-surface-300 outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-surface-600"
            />
          </label>
        </div>
      </section>
    </div>
  );
};
