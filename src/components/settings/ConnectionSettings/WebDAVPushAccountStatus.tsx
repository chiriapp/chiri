import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import ChevronDown from 'lucide-react/icons/chevron-down';
import CircleAlert from 'lucide-react/icons/circle-alert';
import Loader2 from 'lucide-react/icons/loader-2';
import Zap from 'lucide-react/icons/zap';
import ZapOff from 'lucide-react/icons/zap-off';
import { useRef, useState } from 'react';
import { FloatingDropdownFrame } from '$components/FloatingDropdownFrame';
import { useSettingsStore } from '$context/settingsContext';
import { usePushProviderAvailability } from '$hooks/usePushProviderAvailability';
import { getWebDAVPushAccountDiagnostics } from '$lib/push';
import { queryKeys } from '$lib/queryClient';
import type { Account } from '$types';
import type { WebDAVPushAccountDiagnostics } from '$types/push';

type WebDAVPushStatusTone = 'success' | 'warning' | 'muted' | 'info';

interface WebDAVPushStatus {
  label: string;
  tone: WebDAVPushStatusTone;
  icon: 'ready' | 'off' | 'warning' | 'checking';
}

interface WebDAVPushAccountStatusProps {
  account: Account;
}

interface WebDAVPushStatusDetail {
  label: string;
  value: string;
}

const webdavPushToneClass: Record<WebDAVPushStatusTone, string> = {
  success: 'text-semantic-success',
  warning: 'text-semantic-warning',
  muted: 'text-surface-500 dark:text-surface-400',
  info: 'text-semantic-info',
};

const getWebDAVPushStatus = (
  account: Account,
  providerAvailable: boolean | undefined,
  providerChecking: boolean,
  diagnostics: WebDAVPushAccountDiagnostics | undefined,
): WebDAVPushStatus => {
  const calendarCount = account.calendars.length;
  const supportedCount = account.calendars.filter((calendar) => calendar.pushSupported).length;

  if (calendarCount === 0) {
    return {
      label: 'No calendars',
      tone: 'muted',
      icon: 'off',
    };
  }

  if (supportedCount === 0) {
    return {
      label: 'Unsupported',
      tone: 'muted',
      icon: 'off',
    };
  }

  if (providerChecking) {
    return {
      label: 'Checking provider',
      tone: 'info',
      icon: 'checking',
    };
  }

  if (providerAvailable === false) {
    return {
      label: 'Provider unavailable',
      tone: 'warning',
      icon: 'warning',
    };
  }

  if (!diagnostics) {
    return {
      label: 'Checking status',
      tone: 'info',
      icon: 'checking',
    };
  }

  if (diagnostics.registeredCalendars === 0) {
    return {
      label: 'Not registered',
      tone: 'warning',
      icon: 'warning',
    };
  }

  if (diagnostics.listeningCalendars === 0) {
    return {
      label: 'Registered, not listening',
      tone: 'warning',
      icon: 'warning',
    };
  }

  if (diagnostics.listeningCalendars < diagnostics.registeredCalendars) {
    return {
      label: 'Partially listening',
      tone: 'warning',
      icon: 'warning',
    };
  }

  if (diagnostics.expiringSoonCalendars > 0) {
    return {
      label: 'Renewal due',
      tone: 'info',
      icon: 'ready',
    };
  }

  return {
    label: 'Listening',
    tone: 'success',
    icon: 'ready',
  };
};

const formatAge = (date: Date | null): string | null => {
  if (!date) return null;
  return formatDistanceToNow(date, { addSuffix: true });
};

const getWebDAVPushStatusDetails = (
  diagnostics: WebDAVPushAccountDiagnostics | undefined,
): WebDAVPushStatusDetail[] => {
  if (!diagnostics || diagnostics.supportedCalendars === 0) return [];

  const details = [
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

const WebDAVPushStatusIcon = ({ icon }: { icon: WebDAVPushStatus['icon'] }) => {
  switch (icon) {
    case 'checking':
      return <Loader2 className="size-3.5 shrink-0 animate-spin" />;
    case 'warning':
      return <CircleAlert className="size-3.5 shrink-0" />;
    case 'off':
      return <ZapOff className="size-3.5 shrink-0" />;
    case 'ready':
      return <Zap className="size-3.5 shrink-0 fill-current" />;
  }
};

export const WebDAVPushAccountStatus = ({ account }: WebDAVPushAccountStatusProps) => {
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { enablePush, pushProvider, ntfyServerUrl } = useSettingsStore();
  const {
    availability: providerAvailability,
    isResolvingKUnifiedPush,
    pushProviderConfig,
  } = usePushProviderAvailability({
    enabled: enablePush,
    pushProvider,
    ntfyServerUrl,
  });
  const diagnostics = useQuery({
    queryKey: [
      ...queryKeys.pushDiagnostics.byAccount(account.id),
      pushProviderConfig.providerId,
      pushProviderConfig.ntfyConfig?.serverUrl ?? '',
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
  const details = getWebDAVPushStatusDetails(diagnostics.data);

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
            className={`-ml-1.5 inline-flex items-center rounded-md px-1.5 py-0.5 transition-colors outline-hidden hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:hover:bg-surface-700 ${detailsOpen ? 'bg-surface-200 dark:bg-surface-700' : ''} ${toneClass}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <WebDAVPushStatusIcon icon={status.icon} />
              <span>WebDAV Push: {status.label}</span>
              <ChevronDown
                className={`size-3 shrink-0 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
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
