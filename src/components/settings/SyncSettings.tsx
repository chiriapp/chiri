import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import { Info } from 'lucide-react';
import { useState } from 'react';
import { AppSelect } from '$components/AppSelect';
import { CONNECTIVITY_CHECK_INTERVAL_OPTIONS, SYNC_INTERVAL_OPTIONS } from '$constants/settings';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { DEFAULT_CONNECTIVITY_CHECK_URL } from '$hooks/system/useOffline';

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
    connectivityCheckEnabled,
    setConnectivityCheckEnabled,
    connectivityCheckUrl,
    setConnectivityCheckUrl,
    connectivityCheckInterval,
    setConnectivityCheckInterval,
    enablePush,
    setEnablePush,
    ntfyServerUrl,
    setNtfyServerUrl,
  } = useSettingsStore();

  const [showAdvanced, setShowAdvanced] = useState(false);

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

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              WebDAV Push (experimental)
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Real-time sync when server sends push messages
            </p>
          </div>
          <input
            type="checkbox"
            checked={enablePush}
            onChange={(e) => setEnablePush(e.target.checked)}
            className="rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none"
          />
        </label>

        {enablePush && (
          <div className="px-4 pb-4">
            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-500/30 dark:border-yellow-500/40 bg-yellow-50 dark:bg-yellow-900/10 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-200">
                Note: Not all CalDAV servers support WebDAV Push. If your server doesn't support it,
                Chiri will continue to use regular polling.
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 transition-colors"
              >
                {showAdvanced ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                Advanced settings
              </button>

              {showAdvanced && (
                <div className="pl-4 border-l-2 border-surface-200 dark:border-surface-600 space-y-2">
                  <label className="block">
                    <p className="text-sm text-surface-700 dark:text-surface-300 mb-1">
                      ntfy server URL
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mb-2">
                      UnifiedPush distributor endpoint
                    </p>
                    <input
                      type="url"
                      value={ntfyServerUrl}
                      onChange={(e) => setNtfyServerUrl(e.target.value)}
                      placeholder="https://ntfy.sh"
                      className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-none focus:border-primary-500 dark:focus:border-primary-400 transition-colors"
                    />
                  </label>
                  <p className="text-xs text-surface-500 dark:text-surface-400 italic">
                    Note: Changing the server URL requires restarting the app to take effect.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
        Connectivity
      </h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              External connectivity check
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Probe an external URL to confirm network access when CalDAV servers are unreachable.
              It's recommended to keep this enabled.
            </p>
          </div>
          <input
            type="checkbox"
            checked={connectivityCheckEnabled}
            onChange={(e) => setConnectivityCheckEnabled(e.target.checked)}
            className="shrink-0 rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none"
          />
        </label>

        {!connectivityCheckEnabled && (
          <div className="mx-4 mb-4 flex gap-2 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 px-3 py-2 text-xs text-primary-700 dark:text-primary-300">
            <Info className="mt-px size-3.5 shrink-0" />
            <span>
              Disabling this may cause the app to incorrectly report offline status when your CalDAV
              servers are temporarily unreachable.
            </span>
          </div>
        )}

        {connectivityCheckEnabled && (
          <>
            <div className="border-t border-surface-200 dark:border-surface-700" />

            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-surface-700 dark:text-surface-300">Check interval</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  How often to probe for connectivity
                </p>
              </div>
              <AppSelect
                id="connectivity-check-interval"
                value={connectivityCheckInterval.toString()}
                onChange={(e) => setConnectivityCheckInterval(Number(e.target.value))}
                className="text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors shrink-0"
              >
                {CONNECTIVITY_CHECK_INTERVAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AppSelect>
            </div>

            <div className="border-t border-surface-200 dark:border-surface-700" />

            <div className="p-4 space-y-2">
              <div>
                <p className="text-sm text-surface-700 dark:text-surface-300">Check URL</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  Fallback endpoint used to verify network access when CalDAV servers are
                  unreachable
                </p>
              </div>
              <input
                type="url"
                value={connectivityCheckUrl}
                onChange={(e) => setConnectivityCheckUrl(e.target.value)}
                placeholder={DEFAULT_CONNECTIVITY_CHECK_URL}
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 text-surface-800 dark:text-surface-200 outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
