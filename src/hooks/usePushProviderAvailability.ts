import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { isPushProviderAvailable } from '$lib/push';
import { createNtfyProviderConfig } from '$lib/push/ntfyProvider';
import { NTFY_DIRECT_PROVIDER_ID, type PushProviderConfig, type PushProviderId } from '$types/push';

interface UsePushProviderAvailabilityOptions {
  enabled: boolean;
  pushProvider: PushProviderId;
  ntfyServerUrl: string;
}

export const usePushProviderConfig = (
  pushProvider: PushProviderId,
  ntfyServerUrl: string,
): PushProviderConfig =>
  useMemo(
    () => ({
      providerId: pushProvider,
      ntfyConfig:
        pushProvider === NTFY_DIRECT_PROVIDER_ID
          ? createNtfyProviderConfig(ntfyServerUrl)
          : undefined,
    }),
    [pushProvider, ntfyServerUrl],
  );

export const usePushProviderAvailability = ({
  enabled,
  pushProvider,
  ntfyServerUrl,
}: UsePushProviderAvailabilityOptions) => {
  const pushProviderConfig = usePushProviderConfig(pushProvider, ntfyServerUrl);
  const availability = useQuery({
    queryKey: [
      'push-provider-availability',
      pushProviderConfig.providerId,
      pushProviderConfig.ntfyConfig?.serverUrl ?? '',
    ],
    queryFn: () => isPushProviderAvailable(pushProviderConfig),
    enabled,
    staleTime: 60_000,
  });

  return {
    availability,
    pushProviderConfig,
  };
};
