/**
 * ntfy push provider.
 *
 * Provides WebDAV Push message reception through an ntfy UnifiedPush endpoint.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { log } from '$lib/caldav/utils';
import { base64UrlEncode, generateWebPushKeyPair } from '$lib/push/webPushKeys';
import type { Calendar } from '$types';
import {
  NTFY_DIRECT_PROVIDER_ID,
  type NtfyProviderConfig,
  type PushEndpointSubscription,
  type PushMessageHandler,
  type PushProviderSubscriptionDiagnostics,
  type PushSubscription,
  type WebPushKeyPair,
} from '$types/push';

export const DEFAULT_NTFY_SERVER_URL = 'https://ntfy.sh';
const DEFAULT_NTFY_PROVIDER_CONFIG: NtfyProviderConfig = {
  serverUrl: DEFAULT_NTFY_SERVER_URL,
  topicPrefix: 'up',
};

export const normalizeNtfyProviderServerUrl = (serverUrl?: string | null) => {
  const trimmed = serverUrl?.trim();
  if (!trimmed) return DEFAULT_NTFY_SERVER_URL;

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    url.hash = '';
    url.search = '';
    url.pathname = url.pathname.replace(/\/+$/, '');

    return url.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_NTFY_SERVER_URL;
  }
};

export const createNtfyProviderConfig = (serverUrl?: string | null): NtfyProviderConfig => ({
  ...DEFAULT_NTFY_PROVIDER_CONFIG,
  serverUrl: normalizeNtfyProviderServerUrl(serverUrl),
});

const joinNtfyUrl = (serverUrl: string, path: string) =>
  `${serverUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

export const getNtfyProviderSseUrl = (endpoint: string) => joinNtfyUrl(endpoint, 'sse');

export const isNtfyProviderPushResource = (
  pushResource: string,
  config: NtfyProviderConfig,
): boolean => {
  try {
    const pushUrl = new URL(pushResource);
    const serverUrl = new URL(config.serverUrl);
    const serverPath = serverUrl.pathname.replace(/\/+$/, '');
    const pathMatches =
      serverPath === '' ||
      serverPath === '/' ||
      pushUrl.pathname === serverPath ||
      pushUrl.pathname.startsWith(`${serverPath}/`);

    return pushUrl.origin === serverUrl.origin && pathMatches;
  } catch {
    return false;
  }
};

/**
 * Active local ntfy subscription state.
 */
interface NtfyProviderSubscription {
  /** ntfy topic */
  topic: string;
  /** Full push endpoint URL */
  endpoint: string;
  /** Key pair for Web Push registration */
  keyPair: WebPushKeyPair;
  /** Whether the native ntfy SSE listener has been requested but not connected yet */
  starting?: boolean;
  /** Whether the native ntfy SSE listener is active */
  listening?: boolean;
  /** When the current listener was started */
  listenerStartedAt?: Date;
  /** Last successful SSE connection */
  lastConnectedAt?: Date;
  /** Last received WebDAV Push message */
  lastMessageAt?: Date;
  /** Number of WebDAV Push messages received in this app runtime */
  receivedMessages: number;
  /** Last provider/listener error in this app runtime */
  lastError?: string;
  /** When the last provider/listener error happened */
  lastErrorAt?: Date;
}

const activeNtfyProviderSubscriptions = new Map<string, NtfyProviderSubscription>();
const ntfyProviderMessageHandlers = new Map<string, PushMessageHandler>();
let receivedMessageCount = 0;
let lastMessageAt: Date | null = null;
let unlistenConnected: UnlistenFn | null = null;
let unlistenEvent: UnlistenFn | null = null;
let unlistenError: UnlistenFn | null = null;
let listenerSetupPromise: Promise<void> | null = null;

interface NativeNtfyConnectedEvent {
  calendarId: string;
  topic: string;
}

interface NativeNtfySseEvent {
  calendarId: string;
  topic: string;
  data: string;
}

interface NativeNtfyErrorEvent {
  calendarId: string;
  topic: string;
  error: string;
}

const formatProviderError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const setNtfyProviderError = (subscription: NtfyProviderSubscription, error: unknown) => {
  subscription.lastError = formatProviderError(error);
  subscription.lastErrorAt = new Date();
};

const getNtfyProviderSubscriptionByTopic = (topic: string) =>
  [...activeNtfyProviderSubscriptions.values()].find(
    (subscription) => subscription.topic === topic,
  ) ?? null;

const ensureNtfyNativeEventListeners = () => {
  if (unlistenConnected && unlistenEvent && unlistenError) {
    return Promise.resolve();
  }
  if (listenerSetupPromise) return listenerSetupPromise;

  const setupPromise = Promise.all([
    listen<NativeNtfyConnectedEvent>('ntfy://connected', (event) => {
      const subscription = activeNtfyProviderSubscriptions.get(event.payload.calendarId);
      if (!subscription || subscription.topic !== event.payload.topic) return;

      subscription.starting = false;
      subscription.listening = true;
      subscription.lastConnectedAt = new Date();
      subscription.lastError = undefined;
      subscription.lastErrorAt = undefined;
      log.info(`Connected to native ntfy SSE for topic ${subscription.topic}`);
    }),
    listen<NativeNtfySseEvent>('ntfy://event', (event) => {
      const subscription = activeNtfyProviderSubscriptions.get(event.payload.calendarId);
      if (!subscription || subscription.topic !== event.payload.topic) return;

      try {
        const data = JSON.parse(event.payload.data);
        const messageLength = typeof data.message === 'string' ? data.message.length : 0;
        log.debug(
          `ntfy SSE event received (type=${data.event}, topic=${data.topic ?? subscription.topic}, encoding=${data.encoding ?? 'plain'}, messageBytes=${messageLength})`,
        );

        if (data.event !== 'message') return;

        receivedMessageCount++;
        lastMessageAt = new Date();
        subscription.receivedMessages++;
        subscription.lastMessageAt = lastMessageAt;
        subscription.lastError = undefined;
        subscription.lastErrorAt = undefined;
        log.info(`Received push message for calendar ${event.payload.calendarId}`);

        const messageContent =
          data.message || data.attachment?.name || 'WebDAV Push message received';
        ntfyProviderMessageHandlers.get(event.payload.calendarId)?.(
          event.payload.calendarId,
          messageContent,
        );
      } catch (error) {
        setNtfyProviderError(subscription, error);
        log.warn('Failed to parse native ntfy message:', error);
      }
    }),
    listen<NativeNtfyErrorEvent>('ntfy://error', (event) => {
      const subscription =
        activeNtfyProviderSubscriptions.get(event.payload.calendarId) ??
        getNtfyProviderSubscriptionByTopic(event.payload.topic);
      if (!subscription) return;

      subscription.starting = false;
      subscription.listening = false;
      setNtfyProviderError(subscription, event.payload.error);
      log.error(`Native ntfy SSE error for topic ${subscription.topic}:`, event.payload.error);
    }),
  ])
    .then(([connected, event, error]) => {
      unlistenConnected = connected;
      unlistenEvent = event;
      unlistenError = error;
    })
    .catch((error) => {
      listenerSetupPromise = null;
      log.warn('Failed to listen for native ntfy SSE events:', error);
      throw error;
    });

  listenerSetupPromise = setupPromise;
  return setupPromise;
};

const generateNtfyProviderTopic = (config: NtfyProviderConfig = DEFAULT_NTFY_PROVIDER_CONFIG) => {
  // ntfy's UnifiedPush subscriber-based rate limiting expects topics that:
  // - start with "up"
  // - are exactly 14 chars long
  const randomBytes = crypto.getRandomValues(new Uint8Array(9));
  const suffix = base64UrlEncode(randomBytes).slice(0, 12);
  return `${config.topicPrefix}${suffix}`;
};

const createActiveNtfyProviderSubscription = async (
  calendar: Calendar,
  config: NtfyProviderConfig = DEFAULT_NTFY_PROVIDER_CONFIG,
) => {
  const existing = activeNtfyProviderSubscriptions.get(calendar.id);
  if (existing) {
    log.debug(`Already subscribed to ntfy for calendar ${calendar.displayName}`);
    return existing;
  }

  const keyPair = await generateWebPushKeyPair();
  const topic = generateNtfyProviderTopic(config);
  const endpoint = joinNtfyUrl(config.serverUrl, topic);

  const subscription: NtfyProviderSubscription = {
    topic,
    endpoint,
    keyPair,
    receivedMessages: 0,
  };

  activeNtfyProviderSubscriptions.set(calendar.id, subscription);
  log.info(`Created ntfy subscription for ${calendar.displayName}: ${endpoint}`);

  return subscription;
};

/**
 * Create an ntfy provider subscription for CalDAV registration.
 */
export const createNtfyProviderSubscription = async (
  calendar: Calendar,
  config: NtfyProviderConfig = DEFAULT_NTFY_PROVIDER_CONFIG,
) => {
  await createActiveNtfyProviderSubscription(calendar, config);
  return getNtfyProviderEndpointSubscription(calendar.id);
};

/**
 * Restore an ntfy provider subscription using an existing push endpoint.
 */
export const restoreNtfyProviderSubscription = async (
  subscription: PushSubscription,
  calendar: Calendar,
) => {
  const existing = activeNtfyProviderSubscriptions.get(subscription.calendarId);
  if (existing) {
    log.debug(`Already subscribed to ntfy for calendar ${calendar.displayName}`);
    return true;
  }

  let topic: string;
  try {
    const url = new URL(subscription.pushResource);
    topic = url.pathname.slice(1);
  } catch {
    log.error(`Invalid push resource URL: ${subscription.pushResource}`);
    return false;
  }

  const keyPair = await generateWebPushKeyPair();
  const ntfySubscription: NtfyProviderSubscription = {
    topic,
    endpoint: subscription.pushResource,
    keyPair,
    receivedMessages: 0,
  };

  activeNtfyProviderSubscriptions.set(subscription.calendarId, ntfySubscription);
  log.info(`Restored ntfy subscription for ${calendar.displayName}: ${subscription.pushResource}`);

  return true;
};

export const isNtfyProviderListening = (calendarId: string) => {
  const subscription = activeNtfyProviderSubscriptions.get(calendarId);
  return !!subscription?.listening;
};

/**
 * Start listening for push messages on an ntfy provider subscription.
 */
export const startNtfyProviderListening = (
  subscription: PushSubscription,
  onMessage: PushMessageHandler,
) => {
  const ntfySubscription = activeNtfyProviderSubscriptions.get(subscription.calendarId);
  if (!ntfySubscription) {
    log.warn(`No subscription found for calendar ${subscription.calendarId}`);
    return false;
  }

  ntfyProviderMessageHandlers.set(subscription.calendarId, onMessage);

  if (ntfySubscription.listening || ntfySubscription.starting) {
    log.debug(`Already listening for calendar ${subscription.calendarId}`);
    return true;
  }

  const sseUrl = getNtfyProviderSseUrl(ntfySubscription.endpoint);
  ntfySubscription.listenerStartedAt = new Date();
  ntfySubscription.starting = true;
  ntfySubscription.listening = false;

  void ensureNtfyNativeEventListeners()
    .then(() => {
      const currentSubscription = activeNtfyProviderSubscriptions.get(subscription.calendarId);
      if (currentSubscription !== ntfySubscription || !ntfySubscription.starting) return;

      return invoke('start_ntfy_sse_listener', {
        calendarId: subscription.calendarId,
        topic: ntfySubscription.topic,
        sseUrl,
      });
    })
    .catch((error) => {
      ntfySubscription.starting = false;
      ntfySubscription.listening = false;
      setNtfyProviderError(ntfySubscription, error);
      log.error(`Failed to start native ntfy SSE for topic ${ntfySubscription.topic}:`, error);
    });

  return true;
};

export const stopNtfyProviderListening = (calendarId: string) => {
  const subscription = activeNtfyProviderSubscriptions.get(calendarId);
  if (!subscription) return;

  const hadListener = Boolean(
    subscription.starting || subscription.listening || subscription.listenerStartedAt,
  );
  subscription.starting = false;
  subscription.listening = false;
  subscription.listenerStartedAt = undefined;
  ntfyProviderMessageHandlers.delete(calendarId);

  if (!hadListener) return;

  void invoke('stop_ntfy_sse_listener', { calendarId }).catch((error) => {
    setNtfyProviderError(subscription, error);
    log.warn(`Failed to stop native ntfy SSE for calendar ${calendarId}:`, error);
  });
  log.info(`Stopped listening for calendar ${calendarId}`);
};

export const removeNtfyProviderSubscription = (subscription: PushSubscription) => {
  stopNtfyProviderListening(subscription.calendarId);
  activeNtfyProviderSubscriptions.delete(subscription.calendarId);
  log.info(`Removed ntfy subscription for calendar ${subscription.calendarId}`);
};

export const getNtfyProviderPushEndpoint = (calendarId: string) => {
  return activeNtfyProviderSubscriptions.get(calendarId)?.endpoint ?? null;
};

export const getNtfyProviderEndpointSubscription = (
  calendarId: string,
): PushEndpointSubscription | null => {
  const subscription = activeNtfyProviderSubscriptions.get(calendarId);
  if (!subscription) return null;

  return {
    providerId: NTFY_DIRECT_PROVIDER_ID,
    pushResource: subscription.endpoint,
    subscriptionPublicKey: subscription.keyPair.publicKey,
    authSecret: subscription.keyPair.authSecret,
    contentEncoding: 'aes128gcm',
  };
};

export const isNtfyProviderAvailable = async (
  config: NtfyProviderConfig = DEFAULT_NTFY_PROVIDER_CONFIG,
) => {
  try {
    const response = await fetch(`${config.serverUrl}/v1/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const getNtfyProviderActiveSubscriptionCount = () => {
  return activeNtfyProviderSubscriptions.size;
};

interface NtfyProviderDiagnostics {
  activeSubscriptions: number;
  receivedMessages: number;
  lastMessageAt: Date | null;
}

export const getNtfyProviderDiagnostics = (): NtfyProviderDiagnostics => {
  return {
    activeSubscriptions: activeNtfyProviderSubscriptions.size,
    receivedMessages: receivedMessageCount,
    lastMessageAt,
  };
};

export const getNtfyProviderSubscriptionDiagnostics = (
  calendarId: string,
): PushProviderSubscriptionDiagnostics | null => {
  const subscription = activeNtfyProviderSubscriptions.get(calendarId);
  if (!subscription) return null;

  return {
    calendarId,
    providerId: NTFY_DIRECT_PROVIDER_ID,
    listening: !!subscription.listening,
    listenerStartedAt: subscription.listenerStartedAt ?? null,
    lastConnectedAt: subscription.lastConnectedAt ?? null,
    lastMessageAt: subscription.lastMessageAt ?? null,
    receivedMessages: subscription.receivedMessages,
    lastError: subscription.lastError ?? null,
    lastErrorAt: subscription.lastErrorAt ?? null,
  };
};

export const stopAllNtfyProviderListeners = () => {
  for (const subscription of activeNtfyProviderSubscriptions.values()) {
    subscription.starting = false;
    subscription.listening = false;
    subscription.listenerStartedAt = undefined;
  }
  ntfyProviderMessageHandlers.clear();
  activeNtfyProviderSubscriptions.clear();
  void invoke('stop_all_ntfy_sse_listeners').catch((error) => {
    log.warn('Failed to stop native ntfy SSE listeners:', error);
  });
  log.info('Stopped all ntfy subscriptions');
};
