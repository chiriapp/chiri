import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import ChevronDown from 'lucide-react/icons/chevron-down';
import { useRef, useState } from 'react';
import { FloatingDropdownFrame } from '$components/FloatingDropdownFrame';
import { WebDAVPushStatusIcon } from '$components/WebDAVPushStatusIcon';
import { useSettingsStore } from '$context/settingsContext';
import { usePushProviderAvailability } from '$hooks/push/usePushProviderAvailability';
import { getWebDAVPushAccountDiagnostics } from '$lib/push';
import { getPushProviderConfigKey, getPushProviderLabel } from '$lib/push/providers';
import { getWebDAVPushStatus, webdavPushToneClass } from '$lib/push/status';
import { queryKeys } from '$lib/queryClient';
import type { Account } from '$types';
import type { PushProviderConfig, WebDAVPushAccountDiagnostics } from '$types/push';

interface WebDAVPushAccountStatusProps {
  account: Account;
}

interface WebDAVPushStatusDetail {
  label: string;
  value: string;
}

const formatAge = (date: Date | null) => {
  if (!date) return null;
  return formatDistanceToNow(date, { addSuffix: true });
};

const getWebDAVPushStatusDetails = (
  diagnostics: WebDAVPushAccountDiagnostics | undefined,
  providerConfig: PushProviderConfig,
): WebDAVPushStatusDetail[] => {
  if (!diagnostics || diagnostics.supportedCalendars === 0) return [];

  const details = [
    {
      label: 'Provider',
      value: getPushProviderLabel(providerConfig.providerId),
    },
    {
      label: 'Registered',
      value: `${diagnostics.registeredCalendars}/${diagnostics.supportedCalendars}`,
    },
  ];

  if (diagnostics.registeredCalendars > 0) {
    details.push({
      label: 'Listening',
      value: `${diagnostics.listeningCalendars}/${diagnostics.registeredCalendars}`,
    });
  }

  const lastPush = formatAge(diagnostics.lastMessageAt);
  if (lastPush) {
    details.push({ label: 'Last push', value: lastPush });
  }

  const lastRenewal = formatAge(diagnostics.lastRenewedAt);
  if (lastRenewal) {
    details.push({ label: 'Renewed', value: lastRenewal });
  }

  if (diagnostics.lastError) {
    details.push({ label: 'Last error', value: diagnostics.lastError });
  }

  return details;
};

export const WebDAVPushAccountStatus = ({ account }: WebDAVPushAccountStatusProps) => {
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const {
    enablePush,
    pushProvider,
    ntfyServerUrl,
    mozillaAutopushWebsocketUrl,
    mozillaAutopushEndpointUrl,
  } = useSettingsStore();
  const {
    availability: providerAvailability,
    isResolvingKUnifiedPush,
    pushProviderConfig,
  } = usePushProviderAvailability({
    enabled: enablePush,
    pushProvider,
    ntfyServerUrl,
    mozillaAutopushWebsocketUrl,
    mozillaAutopushEndpointUrl,
  });
  const diagnostics = useQuery({
    queryKey: [
      ...queryKeys.pushDiagnostics.byAccount(account.id),
      getPushProviderConfigKey(pushProviderConfig),
    ],
    queryFn: () => getWebDAVPushAccountDiagnostics(account, pushProviderConfig),
    enabled: enablePush && !isResolvingKUnifiedPush,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  if (!enablePush) {
    return null;
  }

  const status = getWebDAVPushStatus(
    account,
    providerAvailability.data,
    isResolvingKUnifiedPush ||
      (providerAvailability.isFetching && providerAvailability.data === undefined),
    diagnostics.data,
  );
  const toneClass = webdavPushToneClass[status.tone];
  const details = getWebDAVPushStatusDetails(diagnostics.data, pushProviderConfig);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {details.length > 0 && (
        <>
          <button
            type="button"
            ref={statusButtonRef}
            onClick={() => setDetailsOpen((open) => !open)}
            aria-haspopup="dialog"
            aria-expanded={detailsOpen}
            className={`-ml-1.5 inline-flex items-center rounded-md px-1.5 py-0.5 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:hover:bg-surface-700 ${detailsOpen ? 'bg-surface-200 dark:bg-surface-700' : ''} ${toneClass}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <WebDAVPushStatusIcon icon={status.icon} />
              <span>WebDAV Push: {status.label}</span>
              <ChevronDown
                className={`size-3 shrink-0 motion-safe:transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
              />
            </span>
          </button>

          {detailsOpen && (
            <FloatingDropdownFrame
              anchorRef={statusButtonRef}
              onClose={() => setDetailsOpen(false)}
              align="start"
              fallbackWidth={240}
              fallbackHeight={details.length * 32 + 16}
              backdropClassName="fixed inset-0 z-60 cursor-default"
              dropdownClassName="z-70 w-60 overflow-hidden p-1 text-xs"
              resetCursorOnOpen={false}
            >
              <div className="space-y-0.5">
                {details.map((detail) => (
                  <div
                    key={detail.label}
                    className="grid grid-cols-[minmax(4.5rem,auto)_1fr] gap-3 rounded-md px-2 py-1.5"
                  >
                    <span className="text-surface-500 dark:text-surface-400">{detail.label}</span>
                    <span className="min-w-0 text-right text-surface-700 dark:text-surface-200">
                      {detail.value}
                    </span>
                  </div>
                ))}
              </div>
            </FloatingDropdownFrame>
          )}
        </>
      )}
      {details.length === 0 && (
        <span className={`inline-flex items-center gap-1.5 ${toneClass}`}>
          <WebDAVPushStatusIcon icon={status.icon} />
          <span>WebDAV Push: {status.label}</span>
        </span>
      )}
    </div>
  );
};
