import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import TriangleAlert from 'lucide-react/icons/triangle-alert';
import XCircle from 'lucide-react/icons/x-circle';
import { LoadingSpinner } from '$components/LoadingSpinner';
import { Select } from '$components/Select';
import { SYNC_INTERVAL_OPTIONS } from '$constants/settings';
import { SYNC_SOURCE_LABELS } from '$constants/sync';
import { useSettingsStore } from '$context/settingsContext';
import { useSyncStore } from '$context/syncContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import type { DateFormat, TimeFormat } from '$types/settings/categories/region';
import { formatDate, formatTime } from '$utils/date';
import { pluralize } from '$utils/misc';

const formatSyncDate = (date: Date, dateFormat: DateFormat, timeFormat: TimeFormat) =>
  `${formatDate(date, true, dateFormat)} ${formatTime(date, timeFormat)}`;

const SyncEmptyState = ({ hasCalDAVAccounts }: { hasCalDAVAccounts: boolean }) => {
  const Icon = hasCalDAVAccounts ? RefreshCw : TriangleAlert;

  return (
    <div className="flex gap-2">
      <Icon
        className={`mt-px size-4 shrink-0 ${
          hasCalDAVAccounts ? 'text-surface-500' : 'text-semantic-warning'
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
    dateFormat,
    timeFormat,
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
  const caldavAccounts = accounts.filter((account) => account.caldav);
  const hasCalDAVAccounts = caldavAccounts.length > 0;
  const syncingAccount = syncingCalendarId
    ? (caldavAccounts.find((account) =>
        account.calendars.some((calendar) => calendar.id === syncingCalendarId),
      ) ?? null)
    : null;
  const syncingCalendarName = syncingAccount?.calendars.find(
    (calendar) => calendar.id === syncingCalendarId,
  )?.displayName;
  const isSyncInProgress = isSyncing || syncingCalendarId !== null;
  const lastSyncSourceLabel = lastSyncSource ? SYNC_SOURCE_LABELS[lastSyncSource] : null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Sync</h3>

      <section className="space-y-2">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Status</h4>
        <div className="overflow-hidden rounded-lg border border-surface-300 bg-white dark:border-surface-700 dark:bg-surface-800">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm text-surface-700 dark:text-surface-300">Sync status</p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                {hasCalDAVAccounts
                  ? `${caldavAccounts.length} ${pluralize(caldavAccounts.length, 'CalDAV account')} configured`
                  : 'No CalDAV accounts configured'}
              </p>
            </div>
            <button
              type="button"
              onClick={requestSync}
              disabled={!hasCalDAVAccounts || isSyncInProgress}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-ink disabled:cursor-not-allowed disabled:opacity-60 dark:bg-surface-700 dark:text-surface-200 dark:hover:bg-surface-600"
            >
              {isSyncInProgress ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}

              {isSyncInProgress ? 'Syncing...' : 'Sync now'}
            </button>
          </div>

          <div className="mx-4 mb-4 rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 text-xs dark:border-surface-700 dark:bg-surface-900/60">
            {isSyncInProgress ? (
              <div className="flex gap-2">
                <LoadingSpinner className="mt-px size-4 text-semantic-info" />
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-surface-700 dark:text-surface-200">
                    {syncingCalendarName ? `Syncing ${syncingCalendarName}` : 'Syncing'}
                  </p>
                  <p className="text-surface-500 dark:text-surface-400">
                    {syncingAccount ? `${syncingAccount.name} · ` : ''}
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
                    {formatSyncDate(lastSyncTime, dateFormat, timeFormat)}
                  </p>
                </div>
              </div>
            ) : (
              <SyncEmptyState hasCalDAVAccounts={hasCalDAVAccounts} />
            )}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Schedule</h4>
        <div className="overflow-hidden rounded-lg border border-surface-300 bg-white dark:border-surface-700 dark:bg-surface-800">
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
              className="shrink-0 rounded border-surface-300 outline-none focus:ring-2 focus:ring-primary-ink focus:ring-offset-2 dark:border-surface-600"
            />
          </label>

          <div className="border-surface-300 border-t dark:border-surface-700" />

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
              className="shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-ink focus:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
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
        <div className="overflow-hidden rounded-lg border border-surface-300 bg-white dark:border-surface-700 dark:bg-surface-800">
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
              className="shrink-0 rounded border-surface-300 outline-none focus:ring-2 focus:ring-primary-ink focus:ring-offset-2 dark:border-surface-600"
            />
          </label>

          <div className="border-surface-300 border-t dark:border-surface-700" />

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
              className="shrink-0 rounded border-surface-300 outline-none focus:ring-2 focus:ring-primary-ink focus:ring-offset-2 dark:border-surface-600"
            />
          </label>
        </div>
      </section>
    </div>
  );
};
