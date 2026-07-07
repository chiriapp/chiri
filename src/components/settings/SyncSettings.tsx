import { Select } from '$components/Select';
import { SYNC_INTERVAL_OPTIONS } from '$constants/settings';
import { useSettingsStore } from '$context/settingsContext';

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

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Sync</h3>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">Auto-sync</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Automatically sync with CalDAV servers
            </p>
          </div>
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(event) => setAutoSync(event.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-surface-600"
          />
        </label>

        {autoSync && (
          <div className="px-4 pb-4">
            <div className="border-surface-200 border-l-2 pl-4 dark:border-surface-600">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-surface-700 dark:text-surface-300">Sync interval</p>
                  <p className="text-surface-500 text-xs dark:text-surface-400">
                    How often to check for changes
                  </p>
                </div>
                <Select
                  id="sync-interval"
                  value={syncInterval.toString()}
                  onChange={(event) => setSyncInterval(Number(event.target.value))}
                  className="shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
                >
                  {SYNC_INTERVAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <label className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">Sync on startup</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Sync immediately when the app launches
            </p>
          </div>
          <input
            type="checkbox"
            checked={syncOnStartup}
            onChange={(event) => setSyncOnStartup(event.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-surface-600"
          />
        </label>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <label className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">Sync on reconnect</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Sync when internet connection is restored
            </p>
          </div>
          <input
            type="checkbox"
            checked={syncOnReconnect}
            onChange={(event) => setSyncOnReconnect(event.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-surface-600"
          />
        </label>
      </div>
    </div>
  );
};
