import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { usePlatform } from '$hooks/system/usePlatform';
import { isPushProviderAvailable } from '$lib/push';
import { createMozillaAutopushProviderConfig } from '$lib/push/mozillaAutopushProvider';
import { createNtfyProviderConfig } from '$lib/push/ntfyProvider';
import { getPushProviderConfigKey } from '$lib/push/providers';
import {
  KUNIFIED_PUSH_PROVIDER_ID,
  MOZILLA_AUTOPUSH_PROVIDER_ID,
  NTFY_DIRECT_PROVIDER_ID,
  type PushProviderId,
} from '$types/push';
import { isLinuxPlatform } from '$utils/platform';

interface UsePushProviderAvailabilityOptions {
  enabled: boolean;
  pushProvider: PushProviderId;
  ntfyServerUrl: string;
  mozillaAutopushWebsocketUrl: string;
  mozillaAutopushEndpointUrl: string;
}

export interface PushProviderAvailabilityMetadata {
  checkedAt: string;
  durationMs: number;
}

const pushProviderAvailabilityMetadata = new Map<string, PushProviderAvailabilityMetadata>();

export const usePushProviderConfig = (
  pushProvider: PushProviderId,
  ntfyServerUrl: string,
  mozillaAutopushWebsocketUrl: string,
  mozillaAutopushEndpointUrl: string,
) => {
  const { pushProviderConfig } = usePushProviderConfigState(
    pushProvider,
    ntfyServerUrl,
    mozillaAutopushWebsocketUrl,
    mozillaAutopushEndpointUrl,
  );
  return pushProviderConfig;
};

export const usePushProviderConfigState = (
  pushProvider: PushProviderId,
  ntfyServerUrl: string,
  mozillaAutopushWebsocketUrl: string,
  mozillaAutopushEndpointUrl: string,
) => {
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
      mozillaAutopushConfig:
        resolvedPushProvider === MOZILLA_AUTOPUSH_PROVIDER_ID
          ? createMozillaAutopushProviderConfig(
              mozillaAutopushWebsocketUrl,
              mozillaAutopushEndpointUrl,
            )
          : undefined,
    }),
    [resolvedPushProvider, ntfyServerUrl, mozillaAutopushEndpointUrl, mozillaAutopushWebsocketUrl],
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
  mozillaAutopushWebsocketUrl,
  mozillaAutopushEndpointUrl,
}: UsePushProviderAvailabilityOptions) => {
  const { isResolvingKUnifiedPush, kunifiedPushAllowed, pushProviderConfig, resolvedPushProvider } =
    usePushProviderConfigState(
      pushProvider,
      ntfyServerUrl,
      mozillaAutopushWebsocketUrl,
      mozillaAutopushEndpointUrl,
    );
  const providerConfigKey = getPushProviderConfigKey(pushProviderConfig);
  const availability = useQuery({
    queryKey: ['push-provider-availability', providerConfigKey],
    queryFn: async () => {
      const startTime = performance.now();
      try {
        return await isPushProviderAvailable(pushProviderConfig);
      } finally {
        pushProviderAvailabilityMetadata.set(providerConfigKey, {
          checkedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - startTime),
        });
      }
    },
    enabled: enabled && !isResolvingKUnifiedPush,
    staleTime: 60_000,
  });

  return {
    availability,
    availabilityMetadata:
      availability.dataUpdatedAt || availability.errorUpdatedAt
        ? (pushProviderAvailabilityMetadata.get(providerConfigKey) ?? null)
        : null,
    isResolvingKUnifiedPush,
    kunifiedPushAllowed,
    pushProviderConfig,
    resolvedPushProvider,
  };
};
