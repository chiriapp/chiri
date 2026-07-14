import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { log } from '$lib/caldav/utils';
import { generateWebPushKeyPair } from '$lib/push/keys';
import type { Calendar } from '$types';
import {
  MOZILLA_AUTOPUSH_PROVIDER_ID,
  type MozillaAutopushProviderConfig,
  type PushEndpointSubscription,
  type PushMessageHandler,
  type PushProviderSubscriptionDiagnostics,
  type PushSubscription,
} from '$types/push';
import { generateUUID } from '$utils/misc';

export const DEFAULT_MOZILLA_AUTOPUSH_WEBSOCKET_URL = 'wss://push.services.mozilla.com/';
export const DEFAULT_MOZILLA_AUTOPUSH_ENDPOINT_URL = 'https://updates.push.services.mozilla.com';

const DEFAULT_MOZILLA_AUTOPUSH_PROVIDER_CONFIG: MozillaAutopushProviderConfig = {
  websocketUrl: DEFAULT_MOZILLA_AUTOPUSH_WEBSOCKET_URL,
  endpointUrl: DEFAULT_MOZILLA_AUTOPUSH_ENDPOINT_URL,
};

interface MozillaAutopushRegistration {
  uaid: string;
  channelId: string;
  endpoint: string;
}

interface MozillaAutopushProviderMetadata {
  version: 1;
  uaid: string;
  channelId: string;
  websocketUrl: string;
  endpointUrl: string;
}

interface MozillaAutopushNotificationEvent {
  calendarId: string;
  channelId: string;
  version: string;
  data: string | null;
}

interface MozillaAutopushConnectedEvent {
  calendarId: string;
  channelId: string;
}

interface MozillaAutopushErrorEvent {
  calendarId: string;
  channelId: string;
  error: string;
}

const calendarIdsByChannelId = new Map<string, string>();
const autopushProviderMessageHandlers = new Map<string, PushMessageHandler>();
const autopushProviderDiagnosticsByCalendar = new Map<
  string,
  PushProviderSubscriptionDiagnostics
>();
let unlistenNotification: UnlistenFn | null = null;
let unlistenConnected: UnlistenFn | null = null;
let unlistenError: UnlistenFn | null = null;
let listenerSetupPromise: Promise<void> | null = null;

const normalizeAutopushUrl = (
  url: string | null | undefined,
  fallback: string,
  allowedSchemes: readonly string[],
) => {
  const trimmed = url?.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = new URL(trimmed);
    if (!allowedSchemes.includes(parsed.protocol.replace(':', ''))) return fallback;
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return fallback;
  }
};

export const createMozillaAutopushProviderConfig = (
  websocketUrl?: string | null,
  endpointUrl?: string | null,
): MozillaAutopushProviderConfig => ({
  websocketUrl: normalizeAutopushUrl(websocketUrl, DEFAULT_MOZILLA_AUTOPUSH_WEBSOCKET_URL, [
    'ws',
    'wss',
  ]),
  endpointUrl: normalizeAutopushUrl(endpointUrl, DEFAULT_MOZILLA_AUTOPUSH_ENDPOINT_URL, [
    'http',
    'https',
  ]).replace(/\/$/, ''),
});

const getConfig = (
  config: MozillaAutopushProviderConfig = DEFAULT_MOZILLA_AUTOPUSH_PROVIDER_CONFIG,
) => createMozillaAutopushProviderConfig(config.websocketUrl, config.endpointUrl);

const parseMetadata = (subscription: PushSubscription): MozillaAutopushProviderMetadata | null => {
  if (!subscription.providerMetadata) return null;

  try {
    const metadata = JSON.parse(
      subscription.providerMetadata,
    ) as Partial<MozillaAutopushProviderMetadata>;
    if (
      metadata.version !== 1 ||
      !metadata.uaid ||
      !metadata.channelId ||
      !metadata.websocketUrl ||
      !metadata.endpointUrl
    ) {
      return null;
    }

    return metadata as MozillaAutopushProviderMetadata;
  } catch {
    return null;
  }
};

const stringifyMetadata = (metadata: MozillaAutopushProviderMetadata) => JSON.stringify(metadata);

const createMetadata = (
  registration: MozillaAutopushRegistration,
  config: MozillaAutopushProviderConfig,
): MozillaAutopushProviderMetadata => ({
  version: 1,
  uaid: registration.uaid,
  channelId: registration.channelId,
  websocketUrl: config.websocketUrl,
  endpointUrl: config.endpointUrl,
});

const getOrCreateDiagnostics = (calendarId: string): PushProviderSubscriptionDiagnostics => {
  const existing = autopushProviderDiagnosticsByCalendar.get(calendarId);
  if (existing) return existing;

  const diagnostics: PushProviderSubscriptionDiagnostics = {
    calendarId,
    providerId: MOZILLA_AUTOPUSH_PROVIDER_ID,
    listening: false,
    listenerStartedAt: null,
    lastConnectedAt: null,
    lastMessageAt: null,
    receivedMessages: 0,
    lastError: null,
    lastErrorAt: null,
  };

  autopushProviderDiagnosticsByCalendar.set(calendarId, diagnostics);
  return diagnostics;
};

const markError = (calendarId: string, error: string) => {
  const diagnostics = getOrCreateDiagnostics(calendarId);
  diagnostics.lastError = error;
  diagnostics.lastErrorAt = new Date();
};

const ensureAutopushEventListeners = () => {
  if (unlistenNotification && unlistenConnected && unlistenError) return Promise.resolve();
  if (listenerSetupPromise) return listenerSetupPromise;

  const setupPromise = Promise.all([
    listen<MozillaAutopushNotificationEvent>('mozilla-autopush://notification', (event) => {
      const { calendarId, channelId, version, data } = event.payload;
      if (calendarIdsByChannelId.get(channelId) !== calendarId) return;

      const diagnostics = getOrCreateDiagnostics(calendarId);
      diagnostics.lastConnectedAt ??= new Date();
      diagnostics.lastMessageAt = new Date();
      diagnostics.receivedMessages++;
      diagnostics.lastError = null;
      diagnostics.lastErrorAt = null;

      autopushProviderMessageHandlers.get(calendarId)?.(
        calendarId,
        data || `Mozilla Autopush notification ${version}`,
      );
    }),
    listen<MozillaAutopushConnectedEvent>('mozilla-autopush://connected', (event) => {
      const { calendarId, channelId } = event.payload;
      if (calendarIdsByChannelId.get(channelId) !== calendarId) return;

      const diagnostics = getOrCreateDiagnostics(calendarId);
      diagnostics.listening = true;
      diagnostics.lastConnectedAt = new Date();
      diagnostics.lastError = null;
      diagnostics.lastErrorAt = null;
      log.info(`Connected to Mozilla Autopush for channel ${channelId}`);
    }),
    listen<MozillaAutopushErrorEvent>('mozilla-autopush://error', (event) => {
      const { calendarId, channelId, error } = event.payload;
      if (calendarIdsByChannelId.get(channelId) !== calendarId) return;

      const diagnostics = getOrCreateDiagnostics(calendarId);
      diagnostics.listening = false;
      markError(calendarId, error);
      log.warn(`Mozilla Autopush listener error for ${channelId}: ${error}`);
    }),
  ])
    .then(([notification, connected, error]) => {
      if (listenerSetupPromise !== setupPromise) {
        notification();
        connected();
        error();
        return;
      }

      unlistenNotification = notification;
      unlistenConnected = connected;
      unlistenError = error;
    })
    .catch((error) => {
      listenerSetupPromise = null;
      log.warn('Failed to listen for Mozilla Autopush messages:', error);
    });

  listenerSetupPromise = setupPromise;
  return setupPromise;
};

export const isMozillaAutopushProviderAvailable = async (
  config: MozillaAutopushProviderConfig = DEFAULT_MOZILLA_AUTOPUSH_PROVIDER_CONFIG,
) => {
  try {
    return await invoke<boolean>('mozilla_autopush_available', {
      websocketUrl: getConfig(config).websocketUrl,
    });
  } catch {
    return false;
  }
};

export const createMozillaAutopushProviderSubscription = async (
  calendar: Calendar,
  config: MozillaAutopushProviderConfig = DEFAULT_MOZILLA_AUTOPUSH_PROVIDER_CONFIG,
): Promise<PushEndpointSubscription | null> => {
  const resolvedConfig = getConfig(config);

  try {
    const channelId = generateUUID();
    const registration = await invoke<MozillaAutopushRegistration>('mozilla_autopush_register', {
      websocketUrl: resolvedConfig.websocketUrl,
      uaid: null,
      channelId,
      vapidPublicKey: calendar.pushVapidKey ?? null,
    });
    const keyPair = await generateWebPushKeyPair();

    log.info(
      `Created Mozilla Autopush endpoint for ${calendar.displayName}: ${registration.endpoint}`,
    );

    return {
      providerId: MOZILLA_AUTOPUSH_PROVIDER_ID,
      providerToken: registration.channelId,
      providerMetadata: stringifyMetadata(createMetadata(registration, resolvedConfig)),
      pushResource: registration.endpoint,
      subscriptionPublicKey: keyPair.publicKey,
      authSecret: keyPair.authSecret,
      contentEncoding: 'aes128gcm',
    };
  } catch (error) {
    log.warn(`Failed to create Mozilla Autopush subscription for ${calendar.displayName}:`, error);
    return null;
  }
};

export const restoreMozillaAutopushProviderSubscription = async (
  subscription: PushSubscription,
  calendar: Calendar,
  config: MozillaAutopushProviderConfig = DEFAULT_MOZILLA_AUTOPUSH_PROVIDER_CONFIG,
) => {
  const metadata = parseMetadata(subscription);
  if (!metadata) return false;

  const resolvedConfig = getConfig(config);

  try {
    await invoke<string>('mozilla_autopush_restore', {
      websocketUrl: resolvedConfig.websocketUrl,
      uaid: metadata.uaid,
      channelId: metadata.channelId,
    });

    log.info(`Restored Mozilla Autopush endpoint for ${calendar.displayName}`);
    return true;
  } catch (error) {
    log.warn(`Failed to restore Mozilla Autopush subscription for ${calendar.displayName}:`, error);
    return false;
  }
};

export const startMozillaAutopushProviderListening = (
  subscription: PushSubscription,
  onMessage: PushMessageHandler,
  config: MozillaAutopushProviderConfig = DEFAULT_MOZILLA_AUTOPUSH_PROVIDER_CONFIG,
) => {
  const metadata = parseMetadata(subscription);
  if (!metadata) return false;

  const resolvedConfig = getConfig(config);
  calendarIdsByChannelId.set(metadata.channelId, subscription.calendarId);
  autopushProviderMessageHandlers.set(subscription.calendarId, onMessage);

  const diagnostics = getOrCreateDiagnostics(subscription.calendarId);
  diagnostics.listening = true;
  diagnostics.listenerStartedAt = new Date();
  diagnostics.lastError = null;
  diagnostics.lastErrorAt = null;

  ensureAutopushEventListeners();

  void invoke('start_mozilla_autopush_listener', {
    calendarId: subscription.calendarId,
    websocketUrl: resolvedConfig.websocketUrl,
    uaid: metadata.uaid,
    channelId: metadata.channelId,
  }).catch((error) => {
    diagnostics.listening = false;
    markError(subscription.calendarId, String(error));
  });

  return true;
};

export const stopMozillaAutopushProviderListening = (calendarId: string) => {
  autopushProviderMessageHandlers.delete(calendarId);

  for (const [channelId, activeCalendarId] of calendarIdsByChannelId.entries()) {
    if (activeCalendarId === calendarId) {
      calendarIdsByChannelId.delete(channelId);
    }
  }

  const diagnostics = autopushProviderDiagnosticsByCalendar.get(calendarId);
  if (diagnostics) {
    diagnostics.listening = false;
    diagnostics.listenerStartedAt = null;
  }

  void invoke('stop_mozilla_autopush_listener', { calendarId }).catch((error) => {
    log.warn('Failed to stop Mozilla Autopush listener:', error);
  });
};

export const removeMozillaAutopushProviderSubscription = async (
  subscription: PushSubscription,
  config?: MozillaAutopushProviderConfig,
) => {
  stopMozillaAutopushProviderListening(subscription.calendarId);
  autopushProviderDiagnosticsByCalendar.delete(subscription.calendarId);

  const metadata = parseMetadata(subscription);
  if (!metadata) return;

  const resolvedConfig = getConfig(config);
  try {
    await invoke('mozilla_autopush_unregister', {
      websocketUrl: resolvedConfig.websocketUrl,
      uaid: metadata.uaid,
      channelId: metadata.channelId,
    });
  } catch (error) {
    log.warn('Failed to unregister Mozilla Autopush subscription:', error);
  }
};

export const getMozillaAutopushProviderSubscriptionDiagnostics = (
  calendarId: string,
): PushProviderSubscriptionDiagnostics | null => {
  return autopushProviderDiagnosticsByCalendar.get(calendarId) ?? null;
};

export const stopAllMozillaAutopushProviderListeners = () => {
  calendarIdsByChannelId.clear();
  autopushProviderMessageHandlers.clear();
  autopushProviderDiagnosticsByCalendar.clear();
  unlistenNotification?.();
  unlistenConnected?.();
  unlistenError?.();
  unlistenNotification = null;
  unlistenConnected = null;
  unlistenError = null;
  listenerSetupPromise = null;

  void invoke('stop_all_mozilla_autopush_listeners').catch((error) => {
    log.warn('Failed to stop Mozilla Autopush listeners:', error);
  });
};

export const isMozillaAutopushProviderPushResource = (
  subscription: PushSubscription,
  config: MozillaAutopushProviderConfig,
) => {
  const metadata = parseMetadata(subscription);
  if (!metadata) return false;
  const resolvedConfig = getConfig(config);
  return (
    subscription.providerId === MOZILLA_AUTOPUSH_PROVIDER_ID &&
    metadata.websocketUrl === resolvedConfig.websocketUrl &&
    metadata.endpointUrl === resolvedConfig.endpointUrl
  );
};
