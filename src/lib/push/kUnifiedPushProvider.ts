import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { log } from '$lib/caldav/utils';
import { generateWebPushKeyPair } from '$lib/push/webPushKeys';
import type { Calendar } from '$types';
import {
  KUNIFIED_PUSH_PROVIDER_ID,
  type PushEndpointSubscription,
  type PushMessageHandler,
  type PushProviderSubscriptionDiagnostics,
  type PushSubscription,
} from '$types/push';
import { generateUUID } from '$utils/misc';

interface KUnifiedPushProviderRegistration {
  endpoint: string;
  token: string;
  distributor: string;
}

interface KUnifiedPushProviderMessageEvent {
  token: string;
  message: string;
  messageBytes: number;
}

interface KUnifiedPushProviderEndpointEvent {
  token: string;
  endpoint: string;
}

interface KUnifiedPushProviderUnregisteredEvent {
  token: string;
}

const calendarIdsByProviderToken = new Map<string, string>();
const pushResourcesByProviderToken = new Map<string, string>();
const providerMessageHandlers = new Map<string, PushMessageHandler>();
const providerInvalidationHandlers = new Map<
  string,
  (calendarId: string, reason: string) => void
>();
const providerDiagnosticsByCalendar = new Map<string, PushProviderSubscriptionDiagnostics>();
let unlistenMessage: UnlistenFn | null = null;
let unlistenEndpoint: UnlistenFn | null = null;
let unlistenUnregistered: UnlistenFn | null = null;
let listenerPromise: Promise<void> | null = null;

const describeProviderTarget = (registration: KUnifiedPushProviderRegistration) =>
  `${registration.endpoint} via ${registration.distributor}`;

const getOrCreateDiagnostics = (calendarId: string): PushProviderSubscriptionDiagnostics => {
  const existing = providerDiagnosticsByCalendar.get(calendarId);
  if (existing) return existing;

  const diagnostics: PushProviderSubscriptionDiagnostics = {
    calendarId,
    providerId: KUNIFIED_PUSH_PROVIDER_ID,
    listening: false,
    listenerStartedAt: null,
    lastConnectedAt: null,
    lastMessageAt: null,
    receivedMessages: 0,
    lastError: null,
    lastErrorAt: null,
  };

  providerDiagnosticsByCalendar.set(calendarId, diagnostics);
  return diagnostics;
};

const markProviderError = (calendarId: string, error: string) => {
  const diagnostics = getOrCreateDiagnostics(calendarId);
  diagnostics.lastError = error;
  diagnostics.lastErrorAt = new Date();
};

const invalidateProviderSubscription = (token: string, reason: string) => {
  const calendarId = calendarIdsByProviderToken.get(token);
  if (!calendarId) return;

  const handler = providerInvalidationHandlers.get(calendarId);
  markProviderError(calendarId, reason);
  stopKUnifiedPushProviderListening(calendarId);
  handler?.(calendarId, reason);
};

const ensureProviderEventListeners = () => {
  if (unlistenMessage || listenerPromise) return;

  const setupPromise = Promise.all([
    listen<KUnifiedPushProviderMessageEvent>('unifiedpush://message', (event) => {
      const { token, message, messageBytes } = event.payload;
      const calendarId = calendarIdsByProviderToken.get(token);
      if (!calendarId) {
        log.warn(
          `KUnifiedPush message received for unknown token ${token} (${messageBytes} bytes)`,
        );
        return;
      }

      const handler = providerMessageHandlers.get(calendarId);
      if (!handler) {
        markProviderError(calendarId, 'KUnifiedPush message received but no handler is registered');
        log.warn(`KUnifiedPush message received for ${calendarId}, but no handler is registered`);
        return;
      }

      const diagnostics = getOrCreateDiagnostics(calendarId);
      diagnostics.lastConnectedAt ??= new Date();
      diagnostics.lastMessageAt = new Date();
      diagnostics.receivedMessages++;
      diagnostics.lastError = null;
      diagnostics.lastErrorAt = null;

      handler(calendarId, message || `KUnifiedPush message (${messageBytes} bytes)`);
    }),
    listen<KUnifiedPushProviderEndpointEvent>('unifiedpush://endpoint', (event) => {
      const { token, endpoint } = event.payload;
      const currentEndpoint = pushResourcesByProviderToken.get(token);
      if (!currentEndpoint || currentEndpoint === endpoint) return;

      invalidateProviderSubscription(token, 'KUnifiedPush endpoint changed');
    }),
    listen<KUnifiedPushProviderUnregisteredEvent>('unifiedpush://unregistered', (event) => {
      invalidateProviderSubscription(event.payload.token, 'KUnifiedPush unregistered');
    }),
  ])
    .then(([message, endpoint, unregistered]) => {
      if (listenerPromise !== setupPromise) {
        message();
        endpoint();
        unregistered();
        return;
      }

      unlistenMessage = message;
      unlistenEndpoint = endpoint;
      unlistenUnregistered = unregistered;
    })
    .catch((error) => {
      listenerPromise = null;
      log.warn('Failed to listen for KUnifiedPush messages:', error);
    });

  listenerPromise = setupPromise;
};

export const isKUnifiedPushProviderAvailable = async () => {
  try {
    return await invoke<boolean>('kunifiedpush_available');
  } catch {
    return false;
  }
};

export const createKUnifiedPushProviderSubscription = async (
  calendar: Calendar,
): Promise<PushEndpointSubscription | null> => {
  try {
    const token = generateUUID();
    const registration = await invoke<KUnifiedPushProviderRegistration>('kunifiedpush_register', {
      token,
      distributor: null,
      vapidPublicKey: calendar.pushVapidKey ?? null,
      description: `Chiri: ${calendar.displayName}`,
    });
    const keyPair = await generateWebPushKeyPair();
    log.info(
      `Created KUnifiedPush provider endpoint for ${calendar.displayName}: ${describeProviderTarget(registration)}`,
    );

    return {
      providerId: KUNIFIED_PUSH_PROVIDER_ID,
      providerToken: registration.token,
      providerDistributor: registration.distributor,
      pushResource: registration.endpoint,
      subscriptionPublicKey: keyPair.publicKey,
      authSecret: keyPair.authSecret,
      contentEncoding: 'aes128gcm',
    };
  } catch (error) {
    log.warn(`Failed to create KUnifiedPush subscription for ${calendar.displayName}:`, error);
    return null;
  }
};

export const restoreKUnifiedPushProviderSubscription = async (
  subscription: PushSubscription,
  calendar: Calendar,
) => {
  if (!subscription.providerToken) return false;

  try {
    const registration = await invoke<KUnifiedPushProviderRegistration>('kunifiedpush_register', {
      token: subscription.providerToken,
      distributor: subscription.providerDistributor ?? null,
      vapidPublicKey: calendar.pushVapidKey ?? null,
      description: `Chiri: ${calendar.displayName}`,
    });

    if (registration.endpoint !== subscription.pushResource) {
      log.warn(
        `KUnifiedPush endpoint changed for ${calendar.displayName}; push subscription needs renewal`,
      );
      return false;
    }

    log.info(
      `Restored KUnifiedPush provider endpoint for ${calendar.displayName}: ${describeProviderTarget(registration)}`,
    );
    return true;
  } catch (error) {
    log.warn(`Failed to restore KUnifiedPush subscription for ${calendar.displayName}:`, error);
    return false;
  }
};

export const startKUnifiedPushProviderListening = (
  subscription: PushSubscription,
  onMessage: PushMessageHandler,
  onInvalidated?: (calendarId: string, reason: string) => void,
) => {
  if (!subscription.providerToken) return false;

  calendarIdsByProviderToken.set(subscription.providerToken, subscription.calendarId);
  pushResourcesByProviderToken.set(subscription.providerToken, subscription.pushResource);
  providerMessageHandlers.set(subscription.calendarId, onMessage);
  if (onInvalidated) {
    providerInvalidationHandlers.set(subscription.calendarId, onInvalidated);
  } else {
    providerInvalidationHandlers.delete(subscription.calendarId);
  }
  const diagnostics = getOrCreateDiagnostics(subscription.calendarId);
  diagnostics.listening = true;
  diagnostics.listenerStartedAt = new Date();
  diagnostics.lastConnectedAt ??= new Date();
  diagnostics.lastError = null;
  diagnostics.lastErrorAt = null;
  ensureProviderEventListeners();
  return true;
};

export const stopKUnifiedPushProviderListening = (calendarId: string) => {
  providerMessageHandlers.delete(calendarId);
  providerInvalidationHandlers.delete(calendarId);
  const diagnostics = providerDiagnosticsByCalendar.get(calendarId);
  if (diagnostics) {
    diagnostics.listening = false;
    diagnostics.listenerStartedAt = null;
  }

  for (const [token, activeCalendarId] of calendarIdsByProviderToken.entries()) {
    if (activeCalendarId === calendarId) {
      calendarIdsByProviderToken.delete(token);
      pushResourcesByProviderToken.delete(token);
    }
  }
};

export const removeKUnifiedPushProviderSubscription = async (subscription: PushSubscription) => {
  stopKUnifiedPushProviderListening(subscription.calendarId);
  providerDiagnosticsByCalendar.delete(subscription.calendarId);

  if (!subscription.providerToken) return;

  try {
    await invoke('kunifiedpush_unregister', {
      token: subscription.providerToken,
      distributor: subscription.providerDistributor ?? null,
    });
  } catch (error) {
    log.warn('Failed to unregister KUnifiedPush subscription:', error);
  }
};

export const getKUnifiedPushProviderSubscriptionDiagnostics = (
  calendarId: string,
): PushProviderSubscriptionDiagnostics | null => {
  return providerDiagnosticsByCalendar.get(calendarId) ?? null;
};

export const stopAllKUnifiedPushProviderListeners = () => {
  calendarIdsByProviderToken.clear();
  pushResourcesByProviderToken.clear();
  providerMessageHandlers.clear();
  providerInvalidationHandlers.clear();
  providerDiagnosticsByCalendar.clear();
  unlistenMessage?.();
  unlistenEndpoint?.();
  unlistenUnregistered?.();
  unlistenMessage = null;
  unlistenEndpoint = null;
  unlistenUnregistered = null;
  listenerPromise = null;
};
