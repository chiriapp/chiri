import Info from 'lucide-react/icons/info';
import { Select } from '$components/Select';
import { CONNECTIVITY_CHECK_INTERVAL_OPTIONS } from '$constants/settings';
import { useSettingsStore } from '$context/settingsContext';
import { DEFAULT_CONNECTIVITY_CHECK_URL } from '$hooks/system/useOffline';

export const NetworkSettings = () => {
  const {
    connectivityCheckEnabled,
    setConnectivityCheckEnabled,
    connectivityCheckUrl,
    setConnectivityCheckUrl,
    connectivityCheckInterval,
    setConnectivityCheckInterval,
  } = useSettingsStore();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Network</h3>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">
              External connectivity check
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Probe an external URL to confirm network access when CalDAV servers are unreachable.
              It's recommended to keep this enabled.
            </p>
          </div>
          <input
            type="checkbox"
            checked={connectivityCheckEnabled}
            onChange={(event) => setConnectivityCheckEnabled(event.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-surface-600"
          />
        </label>

        {!connectivityCheckEnabled && (
          <div className="mx-4 mb-4 flex gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-surface-700 text-xs dark:text-surface-300">
            <Info className="mt-px size-3.5 shrink-0 text-semantic-info" />
            <span>
              Disabling this may cause the app to incorrectly report offline status when your CalDAV
              servers are temporarily unreachable.
            </span>
          </div>
        )}

        {connectivityCheckEnabled && (
          <>
            <div className="border-surface-200 border-t dark:border-surface-700" />

            <div className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-sm text-surface-700 dark:text-surface-300">Check interval</p>
                <p className="text-surface-500 text-xs dark:text-surface-400">
                  How often to probe for connectivity
                </p>
              </div>
              <Select
                id="connectivity-check-interval"
                value={connectivityCheckInterval.toString()}
                onChange={(event) => setConnectivityCheckInterval(Number(event.target.value))}
                className="shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-none transition-colors focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
              >
                {CONNECTIVITY_CHECK_INTERVAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="border-surface-200 border-t dark:border-surface-700" />

            <div className="space-y-2 p-4">
              <div>
                <p className="text-sm text-surface-700 dark:text-surface-300">Check URL</p>
                <p className="text-surface-500 text-xs dark:text-surface-400">
                  Fallback endpoint used to verify network access when CalDAV servers are
                  unreachable
                </p>
              </div>
              <input
                type="url"
                value={connectivityCheckUrl}
                onChange={(event) => setConnectivityCheckUrl(event.target.value)}
                placeholder={DEFAULT_CONNECTIVITY_CHECK_URL}
                className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm text-surface-800 outline-none transition-colors focus:border-primary-500 focus:bg-white dark:border-surface-600 dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
