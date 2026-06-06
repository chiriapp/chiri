import { openUrl } from '@tauri-apps/plugin-opener';
import CheckCircle from 'lucide-react/icons/check-circle';
import CircleAlert from 'lucide-react/icons/circle-alert';
import ExternalLink from 'lucide-react/icons/external-link';
import Info from 'lucide-react/icons/info';
import Loader2 from 'lucide-react/icons/loader-2';
import { useEffect, useRef, useState } from 'react';
import { AppSelect } from '$components/AppSelect';
import { useSettingsStore } from '$context/settingsContext';
import { usePushProviderAvailability } from '$hooks/usePushProviderAvailability';
import { DEFAULT_NTFY_SERVER_URL } from '$lib/push/ntfyProvider';
import {
  KUNIFIED_PUSH_PROVIDER_ID,
  NTFY_DIRECT_PROVIDER_ID,
  type PushProviderId,
} from '$types/push';

const NTFY_SERVER_URL_DEBOUNCE_MS = 500;
const WEBDAV_PUSH_DOCS_URL = 'https://github.com/chiriapp/chiri/blob/master/docs/WEBDAV_PUSH.md';

export const WebDAVPushSettings = () => {
  const {
    enablePush,
    setEnablePush,
    pushProvider,
    setPushProvider,
    ntfyServerUrl,
    setNtfyServerUrl,
  } = useSettingsStore();
  const [draftNtfyServerUrl, setDraftNtfyServerUrl] = useState(ntfyServerUrl);
  const draftNtfyServerUrlRef = useRef(draftNtfyServerUrl);
  const ntfyServerUrlRef = useRef(ntfyServerUrl);
  const setNtfyServerUrlRef = useRef(setNtfyServerUrl);

  useEffect(() => {
    draftNtfyServerUrlRef.current = draftNtfyServerUrl;
  }, [draftNtfyServerUrl]);

  useEffect(() => {
    ntfyServerUrlRef.current = ntfyServerUrl;
    setDraftNtfyServerUrl(ntfyServerUrl);
  }, [ntfyServerUrl]);

  useEffect(() => {
    setNtfyServerUrlRef.current = setNtfyServerUrl;
  }, [setNtfyServerUrl]);

  useEffect(() => {
    if (draftNtfyServerUrl === ntfyServerUrl) return;

    const timeoutId = window.setTimeout(() => {
      setNtfyServerUrl(draftNtfyServerUrl);
    }, NTFY_SERVER_URL_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [draftNtfyServerUrl, ntfyServerUrl, setNtfyServerUrl]);

  useEffect(
    () => () => {
      if (draftNtfyServerUrlRef.current !== ntfyServerUrlRef.current) {
        setNtfyServerUrlRef.current(draftNtfyServerUrlRef.current);
      }
    },
    [],
  );

  const commitDraftNtfyServerUrl = () => {
    if (draftNtfyServerUrl !== ntfyServerUrl) {
      setNtfyServerUrl(draftNtfyServerUrl);
    }
  };
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
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">
        WebDAV Push
      </h3>
      <div className="flex gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-surface-700 text-xs dark:text-surface-300">
        <Info className="mt-px size-3.5 shrink-0 text-semantic-info" />
        <div className="space-y-1">
          <p>
            WebDAV Push allows for near-real-time sync for task updates. There are, however, some
            limitations to be aware of. Read the docs for details.
          </p>
          <button
            type="button"
            onClick={() => openUrl(WEBDAV_PUSH_DOCS_URL)}
            className="inline-flex items-center gap-1 font-medium text-semantic-info outline-hidden hover:underline focus-visible:underline"
          >
            Read WebDAV Push docs
            <ExternalLink className="size-3" />
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Enable WebDAV Push (experimental)
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Use WebDAV Push when a CalDAV server supports it
            </p>
          </div>
          <input
            type="checkbox"
            checked={enablePush}
            onChange={(e) => setEnablePush(e.target.checked)}
            className="rounded border-surface-300 outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-surface-600"
          />
        </label>

        {enablePush && (
          <>
            {showPushProviderSelect && (
              <>
                <div className="border-surface-200 border-t dark:border-surface-700" />

                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-surface-700 dark:text-surface-300">
                      Receive push messages via
                    </p>
                    <p className="text-surface-500 text-xs dark:text-surface-400">
                      Local receiver for Web Push callbacks
                    </p>
                  </div>
                  <AppSelect
                    value={pushProvider}
                    onChange={(e) => setPushProvider(e.target.value as PushProviderId)}
                    className="shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
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
                <div className="border-surface-200 border-t dark:border-surface-700" />

                <div className="space-y-2 p-4">
                  <div>
                    <p className="text-sm text-surface-700 dark:text-surface-300">ntfy server</p>
                    <p className="text-surface-500 text-xs dark:text-surface-400">
                      Leave blank to use ntfy.sh
                    </p>
                  </div>
                  <input
                    type="url"
                    value={draftNtfyServerUrl}
                    onBlur={commitDraftNtfyServerUrl}
                    onChange={(e) => setDraftNtfyServerUrl(e.target.value)}
                    placeholder={DEFAULT_NTFY_SERVER_URL}
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm text-surface-800 outline-none transition-colors focus:border-primary-500 focus:bg-white dark:border-surface-600 dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
                  />
                </div>
              </>
            )}

            <div className="border-surface-200 border-t dark:border-surface-700" />

            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm text-surface-700 dark:text-surface-300">Provider status</p>
                <p className="text-surface-500 text-xs dark:text-surface-400">
                  {providerName} - {providerDescription}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 font-medium text-xs ${providerStatusClass}`}
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
