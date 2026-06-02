/**
 * WebDAV Push Subscription Manager
 *
 * Handles the lifecycle of push subscriptions:
 * - Registration of new subscriptions
 * - Renewal of expiring subscriptions
 * - Removal of subscriptions
 * - Matching incoming push messages to calendars
 */

import type { Connection } from '$lib/caldav/connection';
import { getConnection, isConnected } from '$lib/caldav/connection';
import { registerPushSubscription, unregisterPushSubscription } from '$lib/caldav/push';
import { log } from '$lib/caldav/utils';
import { db } from '$lib/database';
import {
  createLinuxUnifiedPushProviderSubscription,
  isLinuxUnifiedPushProviderAvailable,
  removeLinuxUnifiedPushProviderSubscription,
  restoreLinuxUnifiedPushProviderSubscription,
  startLinuxUnifiedPushProviderListening,
  stopAllLinuxUnifiedPushProviderListeners,
  stopLinuxUnifiedPushProviderListening,
} from '$lib/push/linuxUnifiedPushProvider';
import {
  createNtfyProviderSubscription,
  isNtfyProviderAvailable,
  isNtfyProviderPushResource,
  removeNtfyProviderSubscription,
  restoreNtfyProviderSubscription,
  startNtfyProviderListening,
  stopAllNtfyProviderListeners,
  stopNtfyProviderListening,
} from '$lib/push/ntfyProvider';
import { queryClient, queryKeys } from '$lib/queryClient';
import type { Calendar } from '$types';
import {
  LINUX_UNIFIED_PUSH_PROVIDER_ID,
  NTFY_DIRECT_PROVIDER_ID,
  type PushEndpointSubscription,
  type PushMessageHandler,
  type PushProviderConfig,
  type PushStatus,
  type PushSubscription,
  type PushTrigger,
} from '$types/push';
import { generateUUID } from '$utils/misc';

const DEFAULT_PUSH_PROVIDER_CONFIG: PushProviderConfig = {
  providerId: NTFY_DIRECT_PROVIDER_ID,
};

/**
 * Default subscription expiration request (3 days)
 */
const DEFAULT_EXPIRATION_HOURS = 72;

/**
 * Renew subscriptions this many hours before they expire
 */
const RENEWAL_THRESHOLD_HOURS = 48;

/**
 * Global message handler - set via initializePushManager
 */
let globalMessageHandler: PushMessageHandler | null = null;
const pushEnableInFlight = new Map<string, Promise<boolean>>();
const pushManagerStartedAt = new Date();
const runtimeVerifiedSubscriptionIds = new Set<string>();

const getPushSetupKey = (
  accountId: string,
  calendar: Calendar,
  providerConfig: PushProviderConfig,
): string =>
  [
    accountId,
    calendar.id,
    providerConfig.providerId,
    providerConfig.ntfyConfig?.serverUrl ?? '',
  ].join('|');

const getFreshCalendarSubscriptions = async (calendarId: string) => {
  const subscriptions = await db.getPushSubscriptionsByCalendar(calendarId);
  queryClient.setQueryData(queryKeys.pushSubscriptions.byCalendar(calendarId), subscriptions);
  return subscriptions;
};

/**
 * Helper to get all cached subscriptions, falling back to DB
 */
const getAllSubscriptions = async () => {
  // Try to get from cache first
  const cached = queryClient.getQueryData<PushSubscription[]>(queryKeys.pushSubscriptions.all);
  if (cached) {
    return cached;
  }

  // Fetch from DB and cache it
  const subscriptions = await db.getAllPushSubscriptions();
  queryClient.setQueryData(queryKeys.pushSubscriptions.all, subscriptions);
  return subscriptions;
};

/**
 * Invalidate push subscription caches after mutations
 */
const invalidatePushCaches = (calendarId?: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.pushSubscriptions.all });
  if (calendarId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.pushSubscriptions.byCalendar(calendarId) });
  }
};

const removeSubscriptionFromCaches = (subscription: PushSubscription) => {
  const removeById = (subscriptions: PushSubscription[] | undefined) =>
    subscriptions?.filter((item) => item.id !== subscription.id);

  queryClient.setQueryData<PushSubscription[]>(queryKeys.pushSubscriptions.all, removeById);
  queryClient.setQueryData<PushSubscription[]>(
    queryKeys.pushSubscriptions.byCalendar(subscription.calendarId),
    removeById,
  );
};

/**
 * Generate Web Push subscription details for a calendar
 *
 * Creates a provider subscription and returns the Web Push subscription
 * details needed for CalDAV push registration.
 */
export const createWebPushSubscription = async (
  calendar: Calendar,
  providerConfig: PushProviderConfig = DEFAULT_PUSH_PROVIDER_CONFIG,
): Promise<PushEndpointSubscription | null> => {
  try {
    if (providerConfig.providerId === LINUX_UNIFIED_PUSH_PROVIDER_ID) {
      return await createLinuxUnifiedPushProviderSubscription(calendar);
    }

    return await createNtfyProviderSubscription(calendar, providerConfig.ntfyConfig);
  } catch (error) {
    log.error(`Failed to create Web Push subscription for ${calendar.displayName}:`, error);
    return null;
  }
};

export const isPushProviderAvailable = async (
  providerConfig: PushProviderConfig = DEFAULT_PUSH_PROVIDER_CONFIG,
): Promise<boolean> => {
  if (providerConfig.providerId === LINUX_UNIFIED_PUSH_PROVIDER_ID) {
    return await isLinuxUnifiedPushProviderAvailable();
  }

  return await isNtfyProviderAvailable(providerConfig.ntfyConfig);
};

const subscriptionMatchesProvider = (
  subscription: PushSubscription,
  providerConfig: PushProviderConfig,
): boolean => {
  if (subscription.providerId !== providerConfig.providerId) return false;

  if (providerConfig.providerId === LINUX_UNIFIED_PUSH_PROVIDER_ID) {
    return !!subscription.providerToken;
  }

  return providerConfig.ntfyConfig
    ? isNtfyProviderPushResource(subscription.pushResource, providerConfig.ntfyConfig)
    : true;
};

const isRenewablyValidSubscription = (
  subscription: PushSubscription,
  providerConfig: PushProviderConfig,
): boolean =>
  subscription.expiresAt > new Date(Date.now() + RENEWAL_THRESHOLD_HOURS * 60 * 60 * 1000) &&
  subscriptionMatchesProvider(subscription, providerConfig);

const isActiveProviderSubscription = (
  subscription: PushSubscription,
  providerConfig: PushProviderConfig,
): boolean =>
  subscription.expiresAt > new Date() && subscriptionMatchesProvider(subscription, providerConfig);

const isRuntimeVerifiedSubscription = (subscription: PushSubscription): boolean =>
  runtimeVerifiedSubscriptionIds.has(subscription.id) ||
  subscription.createdAt >= pushManagerStartedAt;

const unregisterStoredSubscription = async (
  accountId: string,
  subscription: PushSubscription,
): Promise<void> => {
  if (!isConnected(accountId)) return;

  try {
    const conn = getConnection(accountId);
    await unregisterPushSubscription(subscription.registrationUrl, conn.credentials);
  } catch (error) {
    log.warn('Failed to unregister push subscription from server:', error);
  }
};

const removeStoredSubscription = async (subscription: PushSubscription): Promise<void> => {
  await removeProviderSubscription(subscription);
  await db.deletePushSubscription(subscription.id);
  runtimeVerifiedSubscriptionIds.delete(subscription.id);
  removeSubscriptionFromCaches(subscription);
};

const removeDuplicateProviderSubscriptions = async (
  accountId: string,
  keptSubscription: PushSubscription,
  subscriptions: PushSubscription[],
  providerConfig: PushProviderConfig,
): Promise<number> => {
  const duplicates = subscriptions.filter(
    (subscription) =>
      subscription.id !== keptSubscription.id &&
      isActiveProviderSubscription(subscription, providerConfig),
  );

  for (const subscription of duplicates) {
    await unregisterStoredSubscription(accountId, subscription);
    await removeStoredSubscription(subscription);
  }

  if (duplicates.length > 0) {
    invalidatePushCaches(keptSubscription.calendarId);
  }

  return duplicates.length;
};

const restoreProviderSubscription = async (
  subscription: PushSubscription,
  calendar: Calendar,
  providerConfig: PushProviderConfig,
): Promise<boolean> => {
  if (providerConfig.providerId === LINUX_UNIFIED_PUSH_PROVIDER_ID) {
    return await restoreLinuxUnifiedPushProviderSubscription(subscription, calendar);
  }

  return await restoreNtfyProviderSubscription(subscription, calendar);
};

const removeProviderSubscription = async (subscription: PushSubscription): Promise<void> => {
  if (subscription.providerId === LINUX_UNIFIED_PUSH_PROVIDER_ID) {
    await removeLinuxUnifiedPushProviderSubscription(subscription);
    return;
  }

  removeNtfyProviderSubscription(subscription);
};

/**
 * Subscribe a calendar to WebDAV Push
 */
export const subscribeCalendarToPush = async (
  accountId: string,
  calendar: Calendar,
  providerConfig: PushProviderConfig = DEFAULT_PUSH_PROVIDER_CONFIG,
): Promise<PushSubscription | null> => {
  // Check if calendar supports push
  if (!calendar.pushSupported || !calendar.pushTopic) {
    log.debug(`Calendar ${calendar.displayName} does not support push`);
    return null;
  }

  // Check fresh storage so stale query data can't race a just-created subscription.
  const existingSubscriptions = await getFreshCalendarSubscriptions(calendar.id);
  const validSubscription = existingSubscriptions.find((sub) =>
    isRenewablyValidSubscription(sub, providerConfig),
  );

  if (validSubscription) {
    const removed = await removeDuplicateProviderSubscriptions(
      accountId,
      validSubscription,
      existingSubscriptions,
      providerConfig,
    );
    if (removed > 0) {
      log.info(`Removed ${removed} duplicate push subscription(s) for ${calendar.displayName}`);
    }
    log.debug(`Calendar ${calendar.displayName} already has a valid push subscription`);
    return validSubscription;
  }

  // Get connection
  if (!isConnected(accountId)) {
    log.warn(`Account ${accountId} not connected, cannot subscribe to push`);
    return null;
  }
  const conn = getConnection(accountId);

  const mismatchedSubscriptions = existingSubscriptions.filter(
    (sub) => sub.expiresAt > new Date() && !subscriptionMatchesProvider(sub, providerConfig),
  );

  for (const subscription of mismatchedSubscriptions) {
    await unregisterStoredSubscription(accountId, subscription);
    await removeStoredSubscription(subscription);
  }

  if (mismatchedSubscriptions.length > 0) {
    invalidatePushCaches(calendar.id);
    log.info(
      `Removed ${mismatchedSubscriptions.length} push subscription(s) for ${calendar.displayName} from a previous push provider`,
    );
  }

  // Create Web Push subscription (requires UnifiedPush integration)
  const webPushSubscription = await createWebPushSubscription(calendar, providerConfig);
  if (!webPushSubscription) {
    log.warn(`Failed to create Web Push subscription for ${calendar.displayName}`);
    return null;
  }

  // Define triggers (content updates with depth 1)
  const triggers: PushTrigger[] = [{ type: 'content-update', depth: '1' }];

  // Request expiration time
  const expiresAt = new Date(Date.now() + DEFAULT_EXPIRATION_HOURS * 60 * 60 * 1000);

  // Register with server
  const registration = await registerPushSubscription(
    calendar.url,
    conn.credentials,
    webPushSubscription,
    triggers,
    expiresAt,
  );

  if (!registration) {
    log.error(`Failed to register push subscription for ${calendar.displayName}`);
    return null;
  }

  // Store subscription locally
  const subscription: PushSubscription = {
    id: generateUUID(),
    calendarId: calendar.id,
    accountId,
    registrationUrl: registration.registrationUrl,
    pushResource: webPushSubscription.pushResource,
    providerId: webPushSubscription.providerId,
    providerToken: webPushSubscription.providerToken,
    expiresAt: registration.expires,
    createdAt: new Date(),
  };

  await db.upsertPushSubscription(subscription);
  runtimeVerifiedSubscriptionIds.add(subscription.id);

  // Invalidate caches so queries refetch
  invalidatePushCaches(calendar.id);

  log.info(
    `Push subscription created for ${calendar.displayName}, expires: ${registration.expires.toISOString()}`,
  );

  return subscription;
};

/**
 * Unsubscribe a calendar from WebDAV Push
 */
export const unsubscribeCalendarFromPush = async (accountId: string, calendarId: string) => {
  const subscriptions = await getFreshCalendarSubscriptions(calendarId);

  if (subscriptions.length === 0) {
    log.debug(`No push subscriptions to remove for calendar ${calendarId}`);
    return;
  }

  // Get connection if available
  let conn: Connection | null = null;
  if (isConnected(accountId)) {
    conn = getConnection(accountId);
  }

  // Unregister from server and delete locally
  for (const subscription of subscriptions) {
    if (conn) {
      try {
        await unregisterPushSubscription(subscription.registrationUrl, conn.credentials);
      } catch (error) {
        log.warn(`Failed to unregister push subscription from server:`, error);
        // Continue anyway - we'll delete locally
      }
    }

    await db.deletePushSubscription(subscription.id);
    runtimeVerifiedSubscriptionIds.delete(subscription.id);
    removeSubscriptionFromCaches(subscription);
  }

  // Invalidate caches
  invalidatePushCaches(calendarId);

  log.info(`Removed ${subscriptions.length} push subscriptions for calendar ${calendarId}`);
};

/**
 * Renew expiring push subscriptions
 *
 * Should be called periodically (e.g., daily) to ensure subscriptions stay active.
 */
export const renewExpiringSubscriptions = async () => {
  const expiring = await db.getExpiringSubscriptions(RENEWAL_THRESHOLD_HOURS);

  if (expiring.length === 0) {
    return 0;
  }

  log.info(`Found ${expiring.length} expiring push subscriptions to renew`);
  const renewed = 0;

  for (const subscription of expiring) {
    try {
      // Remove old subscription
      await db.deletePushSubscription(subscription.id);

      // Re-subscribe (this will create a new subscription)
      // We need to get the calendar to re-subscribe
      // For now, just log that we would renew
      log.warn(
        `Would renew subscription for calendar ${subscription.calendarId} - not yet implemented`,
      );

      // TODO: Get calendar from store and call subscribeCalendarToPush
      // const calendar = getCalendarById(subscription.calendarId);
      // if (calendar) {
      //   await subscribeCalendarToPush(subscription.accountId, calendar);
      //   renewed++;
      // }
    } catch (error) {
      log.error(`Failed to renew subscription ${subscription.id}:`, error);
    }
  }

  return renewed;
};

/**
 * Find calendar by push topic
 *
 * Used to match incoming push messages to the correct calendar.
 */
export const findCalendarByTopic = (calendars: Calendar[], topic: string) => {
  return calendars.find((cal) => cal.pushTopic === topic);
};

/**
 * Clean up expired subscriptions
 */
export const cleanupExpiredSubscriptions = async () => {
  const deleted = await db.deleteExpiredSubscriptions();
  if (deleted > 0) {
    log.info(`Cleaned up ${deleted} expired push subscriptions`);
    // Invalidate all caches since we don't know which calendars were affected
    invalidatePushCaches();
  }
  return deleted;
};

/**
 * Get push status summary for all calendars
 */

export const getPushStatus = async (calendars: Calendar[]): Promise<PushStatus> => {
  const allSubscriptions = await getAllSubscriptions();
  const expiringSubscriptions = await db.getExpiringSubscriptions(RENEWAL_THRESHOLD_HOURS);

  return {
    totalCalendars: calendars.length,
    pushSupportedCalendars: calendars.filter((c) => c.pushSupported).length,
    activeSubscriptions: allSubscriptions.length,
    expiringSubscriptions: expiringSubscriptions.length,
  };
};

export const startPushListeningForSubscription = (
  subscription: PushSubscription,
  providerConfig: PushProviderConfig = DEFAULT_PUSH_PROVIDER_CONFIG,
) => {
  if (!globalMessageHandler) {
    log.warn('Push message handler not set - call initializePushManager first');
    return false;
  }

  if (providerConfig.providerId === LINUX_UNIFIED_PUSH_PROVIDER_ID) {
    return startLinuxUnifiedPushProviderListening(subscription, globalMessageHandler);
  }

  return startNtfyProviderListening(subscription, globalMessageHandler);
};

/**
 * Stop listening for push messages on a calendar
 */
export const stopPushListening = (calendarId: string) => {
  stopNtfyProviderListening(calendarId);
  stopLinuxUnifiedPushProviderListening(calendarId);
};

/**
 * Initialize the push manager with a message handler
 *
 * The handler will be called when push messages are received,
 * typically to trigger a sync for the affected calendar.
 */
export const initializePushManager = (onPushMessage: PushMessageHandler) => {
  globalMessageHandler = onPushMessage;
  log.info('Push manager initialized with message handler');
};

/**
 * Subscribe and start listening for a calendar
 *
 * This is a convenience function that:
 * 1. Creates the provider subscription
 * 2. Registers with the CalDAV server
 * 3. Starts listening for messages
 */
const enablePushForCalendarInner = async (
  accountId: string,
  calendar: Calendar,
  providerConfig: PushProviderConfig = DEFAULT_PUSH_PROVIDER_CONFIG,
) => {
  const subscriptions = await getFreshCalendarSubscriptions(calendar.id);
  const validSubscription = subscriptions.find((sub) =>
    isRenewablyValidSubscription(sub, providerConfig),
  );

  if (validSubscription) {
    const removed = await removeDuplicateProviderSubscriptions(
      accountId,
      validSubscription,
      subscriptions,
      providerConfig,
    );
    if (removed > 0) {
      log.info(`Removed ${removed} duplicate push subscription(s) for ${calendar.displayName}`);
    }

    if (!isRuntimeVerifiedSubscription(validSubscription)) {
      log.info(`Refreshing stored push subscription for ${calendar.displayName} after app restart`);
      await unregisterStoredSubscription(accountId, validSubscription);
      await removeStoredSubscription(validSubscription);
      invalidatePushCaches(calendar.id);
    } else {
      const restored = await restoreProviderSubscription(
        validSubscription,
        calendar,
        providerConfig,
      );
      if (restored) {
        return startPushListeningForSubscription(validSubscription, providerConfig);
      }

      log.warn(
        `Failed to restore push provider subscription for ${calendar.displayName}; recreating it`,
      );

      if (isConnected(accountId)) {
        try {
          const conn = getConnection(accountId);
          await unregisterPushSubscription(validSubscription.registrationUrl, conn.credentials);
        } catch (error) {
          log.warn('Failed to unregister stale push subscription from server:', error);
        }
      }

      await removeStoredSubscription(validSubscription);
      invalidatePushCaches(calendar.id);
    }
  }

  // Subscribe to push
  const subscription = await subscribeCalendarToPush(accountId, calendar, providerConfig);
  if (!subscription) {
    return false;
  }

  // Start listening
  const listening = startPushListeningForSubscription(subscription, providerConfig);
  if (!listening) {
    log.warn(`Push subscribed but not listening for ${calendar.displayName}`);
  }

  return true;
};

export const enablePushForCalendar = async (
  accountId: string,
  calendar: Calendar,
  providerConfig: PushProviderConfig = DEFAULT_PUSH_PROVIDER_CONFIG,
) => {
  const setupKey = getPushSetupKey(accountId, calendar, providerConfig);
  const inFlight = pushEnableInFlight.get(setupKey);
  if (inFlight) {
    log.debug(`Push setup already in flight for ${calendar.displayName}`);
    return inFlight;
  }

  const setup = enablePushForCalendarInner(accountId, calendar, providerConfig);
  pushEnableInFlight.set(setupKey, setup);

  try {
    return await setup;
  } finally {
    if (pushEnableInFlight.get(setupKey) === setup) {
      pushEnableInFlight.delete(setupKey);
    }
  }
};

/**
 * Disable push for a calendar
 *
 * Unsubscribes from the CalDAV server and stops listening.
 */
export const disablePushForCalendar = async (accountId: string, calendarId: string) => {
  // Stop listening first
  stopPushListening(calendarId);

  // Remove provider subscription
  const subscriptions = await getFreshCalendarSubscriptions(calendarId);
  for (const subscription of subscriptions) {
    await removeProviderSubscription(subscription);
  }

  // Unsubscribe from server
  await unsubscribeCalendarFromPush(accountId, calendarId);
};

/**
 * Restore push listening for all active subscriptions
 *
 * Should be called on app startup to reconnect provider listeners for
 * calendars that still have valid push subscriptions.
 */
export const restorePushListeners = async (calendars: Calendar[]) => {
  if (!globalMessageHandler) {
    log.warn('Cannot restore push listeners - message handler not set');
    return 0;
  }

  let restored = 0;
  const allSubscriptions = await getAllSubscriptions();

  for (const subscription of allSubscriptions) {
    // Find the calendar
    const calendar = calendars.find((c) => c.id === subscription.calendarId);
    if (!calendar) {
      log.warn(`Calendar ${subscription.calendarId} not found for push subscription`);
      continue;
    }

    // Check if subscription is still valid
    if (subscription.expiresAt <= new Date()) {
      log.debug(`Push subscription for ${calendar.displayName} has expired`);
      continue;
    }

    // Restore the provider subscription using the existing push resource URL.
    try {
      const restoredProvider = await restoreProviderSubscription(subscription, calendar, {
        providerId: subscription.providerId,
      });
      if (!restoredProvider) {
        log.warn(`Failed to restore push provider subscription for ${calendar.displayName}`);
        continue;
      }

      if (
        startPushListeningForSubscription(subscription, { providerId: subscription.providerId })
      ) {
        restored++;
        log.info(`Restored push listener for ${calendar.displayName}`);
      }
    } catch (error) {
      log.error(`Failed to restore push listener for ${calendar.displayName}:`, error);
    }
  }

  return restored;
};

export const stopAllPushSubscriptions = (): void => {
  stopAllNtfyProviderListeners();
  stopAllLinuxUnifiedPushProviderListeners();
};
