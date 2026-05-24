import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { log } from '$lib/caldav/utils';
import { generateWebPushKeyPair } from '$lib/push/webPushKeys';
import type { Calendar } from '$types';
import {
  LINUX_UNIFIED_PUSH_PROVIDER_ID,
  type PushEndpointSubscription,
  type PushMessageHandler,
  type PushSubscription,
} from '$types/push';
import { generateUUID } from '$utils/misc';

interface LinuxUnifiedPushProviderRegistration {
  endpoint: string;
  token: string;
  distributor: string;
}

interface LinuxUnifiedPushProviderMessageEvent {
  token: string;
  message: string;
}

const calendarIdsByProviderToken = new Map<string, string>();
const providerMessageHandlers = new Map<string, PushMessageHandler>();
let unlistenMessage: UnlistenFn | null = null;
let listenerPromise: Promise<void> | null = null;

const ensureMessageListener = () => {
  if (unlistenMessage || listenerPromise) return;

  listenerPromise = listen<LinuxUnifiedPushProviderMessageEvent>(
    'unifiedpush://message',
    (event) => {
      const calendarId = calendarIdsByProviderToken.get(event.payload.token);
      if (!calendarId) return;

      const handler = providerMessageHandlers.get(calendarId);
      if (!handler) return;

      handler(calendarId, event.payload.message);
    },
  )
    .then((unlisten) => {
      unlistenMessage = unlisten;
    })
    .catch((error) => {
      listenerPromise = null;
      log.warn('Failed to listen for Linux UnifiedPush messages:', error);
    });
};

export const isLinuxUnifiedPushProviderAvailable = async (): Promise<boolean> => {
  try {
    return await invoke<boolean>('linux_unifiedpush_available');
  } catch {
    return false;
  }
};

export const createLinuxUnifiedPushProviderSubscription = async (
  calendar: Calendar,
): Promise<PushEndpointSubscription | null> => {
  try {
    const token = generateUUID();
    const registration = await invoke<LinuxUnifiedPushProviderRegistration>(
      'linux_unifiedpush_register',
      {
        token,
        vapidPublicKey: calendar.pushVapidKey ?? null,
        description: `Chiri: ${calendar.displayName}`,
      },
    );
    const keyPair = await generateWebPushKeyPair();

    return {
      providerId: LINUX_UNIFIED_PUSH_PROVIDER_ID,
      providerToken: registration.token,
      pushResource: registration.endpoint,
      subscriptionPublicKey: keyPair.publicKey,
      authSecret: keyPair.authSecret,
      contentEncoding: 'aes128gcm',
    };
  } catch (error) {
    log.warn(`Failed to create Linux UnifiedPush subscription for ${calendar.displayName}:`, error);
    return null;
  }
};

export const restoreLinuxUnifiedPushProviderSubscription = async (
  subscription: PushSubscription,
  calendar: Calendar,
): Promise<boolean> => {
  if (!subscription.providerToken) return false;

  try {
    const registration = await invoke<LinuxUnifiedPushProviderRegistration>(
      'linux_unifiedpush_register',
      {
        token: subscription.providerToken,
        vapidPublicKey: calendar.pushVapidKey ?? null,
        description: `Chiri: ${calendar.displayName}`,
      },
    );

    if (registration.endpoint !== subscription.pushResource) {
      log.warn(
        `Linux UnifiedPush endpoint changed for ${calendar.displayName}; push subscription needs renewal`,
      );
      return false;
    }

    return true;
  } catch (error) {
    log.warn(
      `Failed to restore Linux UnifiedPush subscription for ${calendar.displayName}:`,
      error,
    );
    return false;
  }
};

export const startLinuxUnifiedPushProviderListening = (
  subscription: PushSubscription,
  onMessage: PushMessageHandler,
): boolean => {
  if (!subscription.providerToken) return false;

  calendarIdsByProviderToken.set(subscription.providerToken, subscription.calendarId);
  providerMessageHandlers.set(subscription.calendarId, onMessage);
  ensureMessageListener();
  return true;
};

export const stopLinuxUnifiedPushProviderListening = (calendarId: string): void => {
  providerMessageHandlers.delete(calendarId);

  for (const [token, activeCalendarId] of calendarIdsByProviderToken.entries()) {
    if (activeCalendarId === calendarId) {
      calendarIdsByProviderToken.delete(token);
    }
  }
};

export const removeLinuxUnifiedPushProviderSubscription = async (
  subscription: PushSubscription,
): Promise<void> => {
  stopLinuxUnifiedPushProviderListening(subscription.calendarId);

  if (!subscription.providerToken) return;

  try {
    await invoke('linux_unifiedpush_unregister', { token: subscription.providerToken });
  } catch (error) {
    log.warn('Failed to unregister Linux UnifiedPush subscription:', error);
  }
};

export const stopAllLinuxUnifiedPushProviderListeners = (): void => {
  calendarIdsByProviderToken.clear();
  providerMessageHandlers.clear();
  unlistenMessage?.();
  unlistenMessage = null;
  listenerPromise = null;
};
