import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { usePlatform } from '$hooks/system/usePlatform';
import { isPushProviderAvailable } from '$lib/push';
import { createNtfyProviderConfig } from '$lib/push/ntfyProvider';
import {
  KUNIFIED_PUSH_PROVIDER_ID,
  NTFY_DIRECT_PROVIDER_ID,
  type PushProviderId,
} from '$types/push';
import { isLinuxPlatform } from '$utils/platform';

interface UsePushProviderAvailabilityOptions {
  enabled: boolean;
  pushProvider: PushProviderId;
  ntfyServerUrl: string;
}

export const usePushProviderConfig = (pushProvider: PushProviderId, ntfyServerUrl: string) => {
  const { pushProviderConfig } = usePushProviderConfigState(pushProvider, ntfyServerUrl);
  return pushProviderConfig;
};

export const usePushProviderConfigState = (pushProvider: PushProviderId, ntfyServerUrl: string) => {
  const { isKDE, isLoading } = usePlatform();
  const kunifiedPushSelected = pushProvider === KUNIFIED_PUSH_PROVIDER_ID;
  const kunifiedPushAllowed = isLinuxPlatform() && isKDE;
  const isResolvingKUnifiedPush = kunifiedPushSelected && isLinuxPlatform() && isLoading;
  const resolvedPushProvider =
    kunifiedPushSelected && !isResolvingKUnifiedPush && !kunifiedPushAllowed
      ? NTFY_DIRECT_PROVIDER_ID
      : pushProvider;

  const pushProviderConfig = useMemo(
    () => ({
      providerId: resolvedPushProvider,
      ntfyConfig:
        resolvedPushProvider === NTFY_DIRECT_PROVIDER_ID
          ? createNtfyProviderConfig(ntfyServerUrl)
          : undefined,
    }),
    [resolvedPushProvider, ntfyServerUrl],
  );

  return {
    isResolvingKUnifiedPush,
    kunifiedPushAllowed,
    pushProviderConfig,
    resolvedPushProvider,
  };
};

export const usePushProviderAvailability = ({
  enabled,
  pushProvider,
  ntfyServerUrl,
}: UsePushProviderAvailabilityOptions) => {
  const { isResolvingKUnifiedPush, kunifiedPushAllowed, pushProviderConfig, resolvedPushProvider } =
    usePushProviderConfigState(pushProvider, ntfyServerUrl);
  const availability = useQuery({
    queryKey: [
      'push-provider-availability',
      pushProviderConfig.providerId,
      pushProviderConfig.ntfyConfig?.serverUrl ?? '',
    ],
    queryFn: () => isPushProviderAvailable(pushProviderConfig),
    enabled: enabled && !isResolvingKUnifiedPush,
    staleTime: 60_000,
  });

  return {
    availability,
    isResolvingKUnifiedPush,
    kunifiedPushAllowed,
    pushProviderConfig,
    resolvedPushProvider,
  };
};
