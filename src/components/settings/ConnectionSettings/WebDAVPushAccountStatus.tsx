import { useQuery } from '@tanstack/react-query';
import CircleAlert from 'lucide-react/icons/circle-alert';
import Loader2 from 'lucide-react/icons/loader-2';
import Zap from 'lucide-react/icons/zap';
import ZapOff from 'lucide-react/icons/zap-off';
import { useMemo } from 'react';
import { useSettingsStore } from '$context/settingsContext';
import { isPushProviderAvailable } from '$lib/push';
import { createNtfyProviderConfig } from '$lib/push/ntfyProvider';
import type { Account } from '$types';
import { NTFY_DIRECT_PROVIDER_ID, type PushProviderConfig } from '$types/push';

type WebDAVPushStatusTone = 'success' | 'warning' | 'muted' | 'info';

interface WebDAVPushStatus {
  label: string;
  tone: WebDAVPushStatusTone;
  icon: 'ready' | 'off' | 'warning' | 'checking';
}

interface WebDAVPushAccountStatusProps {
  account: Account;
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
): WebDAVPushStatus => {
  const calendarCount = account.calendars.length;
  const supportedCount = account.calendars.filter((calendar) => calendar.pushSupported).length;

  if (calendarCount === 0) {
    return {
      label: 'Needs sync',
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

  return {
    label: 'Ready',
    tone: 'success',
    icon: 'ready',
  };
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
  const { enablePush, pushProvider, ntfyServerUrl } = useSettingsStore();
  const pushProviderConfig = useMemo<PushProviderConfig>(
    () => ({
      providerId: pushProvider,
      ntfyConfig:
        pushProvider === NTFY_DIRECT_PROVIDER_ID
          ? createNtfyProviderConfig(ntfyServerUrl)
          : undefined,
    }),
    [pushProvider, ntfyServerUrl],
  );
  const providerAvailability = useQuery({
    queryKey: [
      'push-provider-availability',
      pushProviderConfig.providerId,
      pushProviderConfig.ntfyConfig?.serverUrl ?? '',
    ],
    queryFn: () => isPushProviderAvailable(pushProviderConfig),
    enabled: enablePush,
    staleTime: 60_000,
  });

  if (!enablePush) {
    return null;
  }

  const status = getWebDAVPushStatus(
    account,
    providerAvailability.data,
    providerAvailability.isFetching && providerAvailability.data === undefined,
  );
  const toneClass = webdavPushToneClass[status.tone];

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className={`inline-flex items-center gap-1.5 ${toneClass}`}>
        <WebDAVPushStatusIcon icon={status.icon} />
        <span>WebDAV Push: {status.label}</span>
      </span>
    </div>
  );
};
