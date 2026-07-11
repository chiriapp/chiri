import {
  createKUnifiedPushProviderSubscription,
  getKUnifiedPushProviderSubscriptionDiagnostics,
  isKUnifiedPushProviderAvailable,
  removeKUnifiedPushProviderSubscription,
  restoreKUnifiedPushProviderSubscription,
  startKUnifiedPushProviderListening,
  stopAllKUnifiedPushProviderListeners,
  stopKUnifiedPushProviderListening,
} from '$lib/push/kUnifiedPushProvider';
import {
  createMozillaAutopushProviderSubscription,
  getMozillaAutopushProviderSubscriptionDiagnostics,
  isMozillaAutopushProviderAvailable,
  isMozillaAutopushProviderPushResource,
  removeMozillaAutopushProviderSubscription,
  restoreMozillaAutopushProviderSubscription,
  startMozillaAutopushProviderListening,
  stopAllMozillaAutopushProviderListeners,
  stopMozillaAutopushProviderListening,
} from '$lib/push/mozillaAutopushProvider';
import {
  createNtfyProviderSubscription,
  getNtfyProviderSubscriptionDiagnostics,
  isNtfyProviderAvailable,
  isNtfyProviderPushResource,
  removeNtfyProviderSubscription,
  restoreNtfyProviderSubscription,
  startNtfyProviderListening,
  stopAllNtfyProviderListeners,
  stopNtfyProviderListening,
} from '$lib/push/ntfyProvider';
import type { Calendar } from '$types';
import {
  KUNIFIED_PUSH_PROVIDER_ID,
  MOZILLA_AUTOPUSH_PROVIDER_ID,
  NTFY_DIRECT_PROVIDER_ID,
  type PushEndpointSubscription,
  type PushMessageHandler,
  type PushProviderConfig,
  type PushProviderId,
  type PushProviderSubscriptionDiagnostics,
  type PushSubscription,
} from '$types/push';

export type PushProviderInvalidationHandler = (calendarId: string, reason: string) => void;

interface PushProvider {
  id: PushProviderId;
  label: string;
  description: (config: PushProviderConfig) => string;
  configKey: (config: PushProviderConfig) => string;
  isAvailable: (config: PushProviderConfig) => Promise<boolean>;
  createSubscription: (
    calendar: Calendar,
    config: PushProviderConfig,
  ) => Promise<PushEndpointSubscription | null>;
  restoreSubscription: (
    subscription: PushSubscription,
    calendar: Calendar,
    config: PushProviderConfig,
  ) => Promise<boolean>;
  removeSubscription: (
    subscription: PushSubscription,
    config?: PushProviderConfig,
  ) => Promise<void> | void;
  startListening: (
    subscription: PushSubscription,
    onMessage: PushMessageHandler,
    config: PushProviderConfig,
    onInvalidated?: PushProviderInvalidationHandler,
  ) => boolean;
  stopListening: (calendarId: string) => void;
  stopAllListeners: () => void;
  getDiagnostics: (calendarId: string) => PushProviderSubscriptionDiagnostics | null;
  matchesSubscription: (subscription: PushSubscription, config: PushProviderConfig) => boolean;
}

const ntfyProvider: PushProvider = {
  id: NTFY_DIRECT_PROVIDER_ID,
  label: 'ntfy',
  description: (config) => `Uses ${config.ntfyConfig?.serverUrl ?? 'https://ntfy.sh'}`,
  configKey: (config) => `${NTFY_DIRECT_PROVIDER_ID}|${config.ntfyConfig?.serverUrl ?? ''}`,
  isAvailable: (config) => isNtfyProviderAvailable(config.ntfyConfig),
  createSubscription: (calendar, config) =>
    createNtfyProviderSubscription(calendar, config.ntfyConfig),
  restoreSubscription: (subscription, calendar) =>
    restoreNtfyProviderSubscription(subscription, calendar),
  removeSubscription: (subscription) => removeNtfyProviderSubscription(subscription),
  startListening: (subscription, onMessage) => startNtfyProviderListening(subscription, onMessage),
  stopListening: stopNtfyProviderListening,
  stopAllListeners: stopAllNtfyProviderListeners,
  getDiagnostics: getNtfyProviderSubscriptionDiagnostics,
  matchesSubscription: (subscription, config) =>
    config.ntfyConfig
      ? isNtfyProviderPushResource(subscription.pushResource, config.ntfyConfig)
      : true,
};

const kunifiedPushProvider: PushProvider = {
  id: KUNIFIED_PUSH_PROVIDER_ID,
  label: 'KUnifiedPush',
  description: () => 'Uses your system UnifiedPush distributor',
  configKey: () => KUNIFIED_PUSH_PROVIDER_ID,
  isAvailable: () => isKUnifiedPushProviderAvailable(),
  createSubscription: (calendar) => createKUnifiedPushProviderSubscription(calendar),
  restoreSubscription: (subscription, calendar) =>
    restoreKUnifiedPushProviderSubscription(subscription, calendar),
  removeSubscription: (subscription) => removeKUnifiedPushProviderSubscription(subscription),
  startListening: (subscription, onMessage, _config, onInvalidated) =>
    startKUnifiedPushProviderListening(subscription, onMessage, onInvalidated),
  stopListening: stopKUnifiedPushProviderListening,
  stopAllListeners: stopAllKUnifiedPushProviderListeners,
  getDiagnostics: getKUnifiedPushProviderSubscriptionDiagnostics,
  matchesSubscription: (subscription) => !!subscription.providerToken,
};

const mozillaAutopushProvider: PushProvider = {
  id: MOZILLA_AUTOPUSH_PROVIDER_ID,
  label: 'Mozilla Autopush',
  description: (config) =>
    config.mozillaAutopushConfig?.websocketUrl
      ? `Uses ${config.mozillaAutopushConfig.websocketUrl}`
      : 'Uses Mozilla Autopush',
  configKey: (config) =>
    [
      MOZILLA_AUTOPUSH_PROVIDER_ID,
      config.mozillaAutopushConfig?.websocketUrl ?? '',
      config.mozillaAutopushConfig?.endpointUrl ?? '',
    ].join('|'),
  isAvailable: (config) => isMozillaAutopushProviderAvailable(config.mozillaAutopushConfig),
  createSubscription: (calendar, config) =>
    createMozillaAutopushProviderSubscription(calendar, config.mozillaAutopushConfig),
  restoreSubscription: (subscription, calendar, config) =>
    restoreMozillaAutopushProviderSubscription(
      subscription,
      calendar,
      config.mozillaAutopushConfig,
    ),
  removeSubscription: (subscription, config) =>
    removeMozillaAutopushProviderSubscription(subscription, config?.mozillaAutopushConfig),
  startListening: (subscription, onMessage, config) =>
    startMozillaAutopushProviderListening(subscription, onMessage, config.mozillaAutopushConfig),
  stopListening: stopMozillaAutopushProviderListening,
  stopAllListeners: stopAllMozillaAutopushProviderListeners,
  getDiagnostics: getMozillaAutopushProviderSubscriptionDiagnostics,
  matchesSubscription: (subscription, config) =>
    !!config.mozillaAutopushConfig &&
    isMozillaAutopushProviderPushResource(subscription, config.mozillaAutopushConfig),
};

const providers: Record<PushProviderId, PushProvider> = {
  [NTFY_DIRECT_PROVIDER_ID]: ntfyProvider,
  [KUNIFIED_PUSH_PROVIDER_ID]: kunifiedPushProvider,
  [MOZILLA_AUTOPUSH_PROVIDER_ID]: mozillaAutopushProvider,
};

export const normalizePushProviderId = (providerId: string | null | undefined): PushProviderId => {
  if (
    providerId === NTFY_DIRECT_PROVIDER_ID ||
    providerId === KUNIFIED_PUSH_PROVIDER_ID ||
    providerId === MOZILLA_AUTOPUSH_PROVIDER_ID
  ) {
    return providerId;
  }

  return NTFY_DIRECT_PROVIDER_ID;
};

export const getPushProvider = (providerId: PushProviderId) => providers[providerId];

export const getPushProviderForSubscription = (subscription: PushSubscription) =>
  providers[subscription.providerId] ?? ntfyProvider;

export const getPushProviderLabel = (providerId: PushProviderId) =>
  providers[providerId]?.label ?? ntfyProvider.label;

export const getPushProviderDescription = (config: PushProviderConfig) =>
  getPushProvider(config.providerId).description(config);

export const getPushProviderConfigKey = (config: PushProviderConfig) =>
  getPushProvider(config.providerId).configKey(config);

export const stopAllPushProviderListeners = () => {
  for (const provider of Object.values(providers)) {
    provider.stopAllListeners();
  }
};
