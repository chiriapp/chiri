import CheckCircle from 'lucide-react/icons/check-circle';
import CircleAlert from 'lucide-react/icons/circle-alert';
import Loader2 from 'lucide-react/icons/loader-2';
import { AppSelect } from '$components/AppSelect';
import { useSettingsStore } from '$context/settingsContext';
import { usePushProviderAvailability } from '$hooks/usePushProviderAvailability';
import { DEFAULT_NTFY_SERVER_URL } from '$lib/push/ntfyProvider';
import {
  KUNIFIED_PUSH_PROVIDER_ID,
  NTFY_DIRECT_PROVIDER_ID,
  type PushProviderId,
} from '$types/push';

export const WebDAVPushSettings = () => {
  const {
    enablePush,
    setEnablePush,
    pushProvider,
    setPushProvider,
    ntfyServerUrl,
    setNtfyServerUrl,
  } = useSettingsStore();
  const {
    availability: providerAvailability,
    isResolvingKUnifiedPush,
    kunifiedPushAllowed,
    pushProviderConfig,
  } = usePushProviderAvailability({ enabled: enablePush, pushProvider, ntfyServerUrl });
  const showKUnifiedPushOption = kunifiedPushAllowed;
  const showPushProviderSelect = showKUnifiedPushOption;
  const providerChecking =
    isResolvingKUnifiedPush ||
    (providerAvailability.isFetching && providerAvailability.data === undefined);
  const providerAvailable = providerAvailability.data === true;
  const providerStatusLabel = providerChecking
    ? 'Checking'
    : providerAvailable
      ? 'Available'
      : 'Unavailable';
  const providerStatusClass = providerChecking
    ? 'text-semantic-info'
    : providerAvailable
      ? 'text-semantic-success'
      : 'text-semantic-warning';
  const providerName =
    pushProviderConfig.providerId === KUNIFIED_PUSH_PROVIDER_ID ? 'KUnifiedPush' : 'ntfy';
  const providerDescription =
    pushProviderConfig.providerId === KUNIFIED_PUSH_PROVIDER_ID
      ? 'Uses your system UnifiedPush distributor'
      : `Uses ${pushProviderConfig.ntfyConfig?.serverUrl ?? DEFAULT_NTFY_SERVER_URL}`;

  return (
    <>
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
        WebDAV Push
      </h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Enable WebDAV Push (experimental)
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Use WebDAV Push when a CalDAV server supports it
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
          <>
            {showPushProviderSelect && (
              <>
                <div className="border-t border-surface-200 dark:border-surface-700" />

                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-surface-700 dark:text-surface-300">
                      Receive push messages via
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      Local receiver for Web Push callbacks
                    </p>
                  </div>
                  <AppSelect
                    value={pushProvider}
                    onChange={(e) => setPushProvider(e.target.value as PushProviderId)}
                    className="text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors shrink-0"
                  >
                    <option value={NTFY_DIRECT_PROVIDER_ID}>ntfy</option>
                    {showKUnifiedPushOption && (
                      <option value={KUNIFIED_PUSH_PROVIDER_ID}>KUnifiedPush</option>
                    )}
                  </AppSelect>
                </div>
              </>
            )}

            {pushProviderConfig.providerId === NTFY_DIRECT_PROVIDER_ID && (
              <>
                <div className="border-t border-surface-200 dark:border-surface-700" />

                <div className="p-4 space-y-2">
                  <div>
                    <p className="text-sm text-surface-700 dark:text-surface-300">ntfy server</p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      Leave blank to use ntfy.sh
                    </p>
                  </div>
                  <input
                    type="url"
                    value={ntfyServerUrl}
                    onChange={(e) => setNtfyServerUrl(e.target.value)}
                    placeholder={DEFAULT_NTFY_SERVER_URL}
                    className="w-full text-sm px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700 text-surface-800 dark:text-surface-200 outline-none focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
                  />
                </div>
              </>
            )}

            <div className="border-t border-surface-200 dark:border-surface-700" />

            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm text-surface-700 dark:text-surface-300">Provider status</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  {providerName} - {providerDescription}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium shrink-0 ${providerStatusClass}`}
              >
                {providerChecking ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : providerAvailable ? (
                  <CheckCircle className="size-3.5" />
                ) : (
                  <CircleAlert className="size-3.5" />
                )}
                {providerStatusLabel}
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
};
