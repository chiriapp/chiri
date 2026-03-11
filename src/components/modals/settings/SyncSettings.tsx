import { SYNC_INTERVAL_OPTIONS } from '$data/settings';
import { useSettingsStore } from '$hooks/useSettingsStore';

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
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">Sync</h3>
      <div className="space-y-4 rounded-lg border border-surface-200 dark:border-surface-700 p-4 bg-white dark:bg-surface-800">
        <label className="flex items-center justify-between">
          <div>
            <h4 className="text-sm text-surface-700 dark:text-surface-300">Auto-sync</h4>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Automatically sync with CalDAV servers
            </p>
          </div>
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.target.checked)}
            className="rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none"
          />
        </label>
        {autoSync && (
          <label
            htmlFor="sync-interval"
            className="flex items-center justify-between text-sm text-surface-700 dark:text-surface-300 mb-2"
          >
            Sync interval
            <select
              id="sync-interval"
              value={syncInterval.toString()}
              onChange={(e) => setSyncInterval(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
            >
              {SYNC_INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center justify-between">
          <div>
            <span className="text-sm text-surface-700 dark:text-surface-300">Sync on startup</span>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Sync immediately when app launches
            </p>
          </div>
          <input
            type="checkbox"
            checked={syncOnStartup}
            onChange={(e) => setSyncOnStartup(e.target.checked)}
            className="rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none"
          />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <span className="text-sm text-surface-700 dark:text-surface-300">
              Sync after connection comes back online
            </span>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Automatically sync when reconnecting to the internet
            </p>
          </div>
          <input
            type="checkbox"
            checked={syncOnReconnect}
            onChange={(e) => setSyncOnReconnect(e.target.checked)}
            className="rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none"
          />
        </label>
      </div>
    </div>
  );
};
