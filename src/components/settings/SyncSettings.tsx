import { AppSelect } from '$components/AppSelect';
import { SYNC_INTERVAL_OPTIONS } from '$constants/settings';
import { useSettingsStore } from '$hooks/store/useSettingsStore';

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
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Auto-sync</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Automatically sync with CalDAV servers
            </p>
          </div>
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.target.checked)}
            className="rounded-sm border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
          />
        </label>

        {autoSync && (
          <div className="px-4 pb-4">
            <div className="pl-4 border-l-2 border-surface-200 dark:border-surface-600">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">Sync interval</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    How often to check for changes
                  </p>
                </div>
                <AppSelect
                  id="sync-interval"
                  value={syncInterval.toString()}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  className="text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors shrink-0"
                >
                  {SYNC_INTERVAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AppSelect>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Sync on startup</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Sync immediately when the app launches
            </p>
          </div>
          <input
            type="checkbox"
            checked={syncOnStartup}
            onChange={(e) => setSyncOnStartup(e.target.checked)}
            className="rounded-sm border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
          />
        </label>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Sync on reconnect</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Sync when internet connection is restored
            </p>
          </div>
          <input
            type="checkbox"
            checked={syncOnReconnect}
            onChange={(e) => setSyncOnReconnect(e.target.checked)}
            className="rounded-sm border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
          />
        </label>
      </div>
    </div>
  );
};
