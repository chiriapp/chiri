import { openUrl } from '@tauri-apps/plugin-opener';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import ExternalLink from 'lucide-react/icons/external-link';
import Info from 'lucide-react/icons/info';
import Loader2 from 'lucide-react/icons/loader-2';
import Play from 'lucide-react/icons/play';
import TriangleAlert from 'lucide-react/icons/triangle-alert';
import XCircle from 'lucide-react/icons/x-circle';
import { useEffect, useRef, useState } from 'react';
import { Select } from '$components/Select';
import { PushOperationalControls } from '$components/settings/PushSettings/PushOperationalControls';
import { useSettingsStore } from '$context/settingsContext';
import { usePushProviderAvailability } from '$hooks/push/usePushProviderAvailability';
import { useAccounts } from '$hooks/queries/useAccounts';
import {
  DEFAULT_MOZILLA_AUTOPUSH_ENDPOINT_URL,
  DEFAULT_MOZILLA_AUTOPUSH_WEBSOCKET_URL,
} from '$lib/push/mozillaAutopushProvider';
import { DEFAULT_NTFY_SERVER_URL } from '$lib/push/ntfyProvider';
import { getPushProviderDescription, getPushProviderLabel } from '$lib/push/providers';
import {
  KUNIFIED_PUSH_PROVIDER_ID,
  MOZILLA_AUTOPUSH_PROVIDER_ID,
  NTFY_DIRECT_PROVIDER_ID,
  type PushProviderId,
} from '$types/push';

const NTFY_SERVER_URL_DEBOUNCE_MS = 500;
const WEBDAV_PUSH_DOCS_URL = 'https://github.com/chiriapp/chiri/blob/master/docs/WEBDAV_PUSH.md';

const useDebouncedDraftSetting = (
  value: string,
  setValue: (value: string) => void,
  delayMs: number,
) => {
  const [draftValue, setDraftValue] = useState(value);
  const draftValueRef = useRef(draftValue);
  const valueRef = useRef(value);
  const setValueRef = useRef(setValue);

  useEffect(() => {
    draftValueRef.current = draftValue;
  }, [draftValue]);

  useEffect(() => {
    valueRef.current = value;
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    setValueRef.current = setValue;
  }, [setValue]);

  useEffect(() => {
    if (draftValue === value) return;

    const timeoutId = window.setTimeout(() => {
      setValue(draftValue);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, draftValue, setValue, value]);

  useEffect(
    () => () => {
      if (draftValueRef.current !== valueRef.current) {
        setValueRef.current(draftValueRef.current);
      }
    },
    [],
  );

  const commitDraftValue = () => {
    if (draftValue !== value) {
      setValue(draftValue);
    }
  };

  return [draftValue, setDraftValue, commitDraftValue] as const;
};

const formatProviderCheckedAt = (checkedAt: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(checkedAt));

export const PushSettings = () => {
  const {
    enablePush,
    setEnablePush,
    enforceVapid,
    setEnforceVapid,
    pushProvider,
    setPushProvider,
    ntfyServerUrl,
    setNtfyServerUrl,
    mozillaAutopushWebsocketUrl,
    setMozillaAutopushWebsocketUrl,
    mozillaAutopushEndpointUrl,
    setMozillaAutopushEndpointUrl,
  } = useSettingsStore();
  const [draftNtfyServerUrl, setDraftNtfyServerUrl, commitDraftNtfyServerUrl] =
    useDebouncedDraftSetting(ntfyServerUrl, setNtfyServerUrl, NTFY_SERVER_URL_DEBOUNCE_MS);
  const [
    draftMozillaAutopushWebsocketUrl,
    setDraftMozillaAutopushWebsocketUrl,
    commitDraftMozillaAutopushWebsocketUrl,
  ] = useDebouncedDraftSetting(
    mozillaAutopushWebsocketUrl,
    setMozillaAutopushWebsocketUrl,
    NTFY_SERVER_URL_DEBOUNCE_MS,
  );
  const [
    draftMozillaAutopushEndpointUrl,
    setDraftMozillaAutopushEndpointUrl,
    commitDraftMozillaAutopushEndpointUrl,
  ] = useDebouncedDraftSetting(
    mozillaAutopushEndpointUrl,
    setMozillaAutopushEndpointUrl,
    NTFY_SERVER_URL_DEBOUNCE_MS,
  );
  const { data: accounts = [] } = useAccounts();
  const hasCalDAVAccounts = accounts.some((account) => account.caldav);
  const pushGated = !hasCalDAVAccounts;

  const {
    availability: providerAvailability,
    availabilityMetadata: providerAvailabilityMetadata,
    isResolvingKUnifiedPush,
    kunifiedPushAllowed,
    pushProviderConfig,
  } = usePushProviderAvailability({
    enabled: enablePush,
    pushProvider,
    ntfyServerUrl,
    mozillaAutopushWebsocketUrl,
    mozillaAutopushEndpointUrl,
  });
  const showKUnifiedPushOption = kunifiedPushAllowed;
  const providerChecking =
    isResolvingKUnifiedPush ||
    (providerAvailability.isFetching && providerAvailability.data === undefined);
  const providerAvailable = providerAvailability.data === true;
  const providerStatusLabel = providerChecking
    ? 'Checking'
    : providerAvailable
      ? 'Available'
      : 'Unavailable';
  const showProviderResult =
    providerChecking || providerAvailability.data !== undefined || providerAvailability.error;
  const providerName = getPushProviderLabel(pushProviderConfig.providerId);
  const providerDescription = getPushProviderDescription(pushProviderConfig);

  const handleTestProvider = async () => {
    await providerAvailability.refetch();
  };

  return (
    <div className="space-y-4">
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
        <label
          className={`flex items-center justify-between p-4 ${pushGated ? 'cursor-not-allowed opacity-50' : ''}`}
        >
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
            disabled={pushGated}
            onChange={(e) => setEnablePush(e.target.checked)}
            className="rounded border-surface-300 outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed dark:border-surface-600"
          />
        </label>

        {pushGated && (
          <div className="mx-4 mb-4 flex gap-2 rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 px-3 py-2 text-surface-700 text-xs dark:text-surface-300">
            <TriangleAlert className="mt-px size-3.5 shrink-0 text-semantic-warning" />
            <span>Add a CalDAV account first to use WebDAV Push.</span>
          </div>
        )}

        {enablePush && !pushGated && (
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
              <Select
                value={pushProvider}
                onChange={(e) => setPushProvider(e.target.value as PushProviderId)}
                className="shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
              >
                <option value={NTFY_DIRECT_PROVIDER_ID}>ntfy</option>
                <option value={MOZILLA_AUTOPUSH_PROVIDER_ID}>Mozilla Autopush</option>
                {showKUnifiedPushOption && (
                  <option value={KUNIFIED_PUSH_PROVIDER_ID}>KUnifiedPush</option>
                )}
              </Select>
            </div>

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

            {pushProviderConfig.providerId === MOZILLA_AUTOPUSH_PROVIDER_ID && (
              <>
                <div className="border-surface-200 border-t dark:border-surface-700" />

                <div className="space-y-4 p-4">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-surface-700 dark:text-surface-300">
                        WebSocket URL
                      </p>
                      <p className="text-surface-500 text-xs dark:text-surface-400">
                        Leave blank to use Mozilla production
                      </p>
                    </div>
                    <input
                      type="url"
                      value={draftMozillaAutopushWebsocketUrl}
                      onBlur={commitDraftMozillaAutopushWebsocketUrl}
                      onChange={(e) => setDraftMozillaAutopushWebsocketUrl(e.target.value)}
                      placeholder={DEFAULT_MOZILLA_AUTOPUSH_WEBSOCKET_URL}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm text-surface-800 outline-none transition-colors focus:border-primary-500 focus:bg-white dark:border-surface-600 dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
                    />
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-surface-700 dark:text-surface-300">Endpoint URL</p>
                      <p className="text-surface-500 text-xs dark:text-surface-400">
                        Leave blank to use Mozilla production
                      </p>
                    </div>
                    <input
                      type="url"
                      value={draftMozillaAutopushEndpointUrl}
                      onBlur={commitDraftMozillaAutopushEndpointUrl}
                      onChange={(e) => setDraftMozillaAutopushEndpointUrl(e.target.value)}
                      placeholder={DEFAULT_MOZILLA_AUTOPUSH_ENDPOINT_URL}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm text-surface-800 outline-none transition-colors focus:border-primary-500 focus:bg-white dark:border-surface-600 dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {enablePush && !pushGated && (
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <label className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-surface-700 dark:text-surface-300">
                Require VAPID public key
              </p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Only use WebDAV Push when the server provides a VAPID key
              </p>
            </div>
            <input
              type="checkbox"
              checked={enforceVapid}
              onChange={(e) => setEnforceVapid(e.target.checked)}
              className="rounded border-surface-300 outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-surface-600"
            />
          </label>

          <div className="mx-4 mb-4 flex gap-2 rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 px-3 py-2 text-surface-700 text-xs dark:text-surface-300">
            <TriangleAlert className="mt-px size-3.5 shrink-0 text-semantic-warning" />
            <div className="min-w-0 space-y-1">
              <p>
                VAPID binds push subscriptions to a specific server, so only that server can send
                push messages to this device.
              </p>
              <p>
                However, some servers don't support VAPID yet. Enforcing it will disable WebDAV Push
                on those servers.
              </p>
            </div>
          </div>
        </div>
      )}

      {enablePush && (
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm text-surface-700 dark:text-surface-300">Provider test</p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Check whether Chiri can reach the selected push provider.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestProvider}
              disabled={providerAvailability.isFetching || isResolvingKUnifiedPush}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-surface-700 dark:text-surface-200 dark:hover:bg-surface-600"
            >
              {providerAvailability.isFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Test now
            </button>
          </div>

          {showProviderResult && (
            <div className="mx-4 mb-4 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs dark:border-surface-700 dark:bg-surface-900/60">
              <div className="flex gap-2">
                {providerChecking ? (
                  <Loader2 className="mt-px size-4 shrink-0 animate-spin text-semantic-info" />
                ) : providerAvailable ? (
                  <CheckCircle2 className="mt-px size-4 shrink-0 text-semantic-success" />
                ) : (
                  <XCircle className="mt-px size-4 shrink-0 text-semantic-error" />
                )}
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-surface-700 dark:text-surface-200">
                    {providerStatusLabel} · {providerName}
                  </p>
                  <p className="text-surface-500 dark:text-surface-400">
                    {providerAvailabilityMetadata
                      ? `${formatProviderCheckedAt(providerAvailabilityMetadata.checkedAt)} · ${
                          providerAvailabilityMetadata.durationMs
                        }ms · ${providerDescription}`
                      : providerDescription}
                  </p>
                  {providerAvailability.error && (
                    <p className="text-semantic-error">
                      {providerAvailability.error instanceof Error
                        ? providerAvailability.error.message
                        : String(providerAvailability.error)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {enablePush && (
        <PushOperationalControls
          providerAvailable={providerAvailable}
          providerConfig={pushProviderConfig}
          isResolvingProvider={isResolvingKUnifiedPush}
        />
      )}
    </div>
  );
};
