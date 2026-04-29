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
  createNtfySubscription,
  getWebPushSubscription,
  isListening,
  type PushMessageHandler,
  removeNtfySubscription,
  restoreNtfySubscription,
  startListening,
  stopListening,
} from '$lib/push/ntfyProvider';
import { queryClient, queryKeys } from '$lib/queryClient';
import type { Calendar } from '$types';
import type { PushStatus, PushSubscription, PushTrigger, WebPushSubscription } from '$types/push';
import { generateUUID } from '$utils/misc';

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

/**
 * Helper to get cached subscriptions for a calendar, falling back to DB
 */
const getCalendarSubscriptions = async (calendarId: string) => {
  // Try to get from cache first
  const cached = queryClient.getQueryData<PushSubscription[]>(
    queryKeys.pushSubscriptions.byCalendar(calendarId),
  );
  if (cached) {
    return cached;
  }

  // Fetch from DB and cache it
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

/**
 * Generate Web Push subscription details for a calendar
 *
 * Creates an ntfy subscription and returns the Web Push subscription
 * details needed for CalDAV push registration.
 */
export const createWebPushSubscription = async (
  calendar: Calendar,
): Promise<WebPushSubscription | null> => {
  try {
    // Create ntfy subscription (generates key pair and topic)
    await createNtfySubscription(calendar);

    // Get the Web Push subscription details
    const webPushDetails = getWebPushSubscription(calendar.id);
    if (!webPushDetails) {
      log.error(`Failed to get Web Push details for calendar ${calendar.displayName}`);
      return null;
    }

    return webPushDetails;
  } catch (error) {
    log.error(`Failed to create Web Push subscription for ${calendar.displayName}:`, error);
    return null;
  }
};

/**
 * Subscribe a calendar to WebDAV Push
 */
export const subscribeCalendarToPush = async (
  accountId: string,
  calendar: Calendar,
): Promise<PushSubscription | null> => {
  // Check if calendar supports push
  if (!calendar.pushSupported || !calendar.pushTopic) {
    log.debug(`Calendar ${calendar.displayName} does not support push`);
    return null;
  }

  // Check if we already have a valid subscription (use cached data)
  const existingSubscriptions = await getCalendarSubscriptions(calendar.id);
  const validSubscription = existingSubscriptions.find(
    (sub) => sub.expiresAt > new Date(Date.now() + RENEWAL_THRESHOLD_HOURS * 60 * 60 * 1000),
  );

  if (validSubscription) {
    log.debug(`Calendar ${calendar.displayName} already has a valid push subscription`);
    return validSubscription;
  }

  // Get connection
  if (!isConnected(accountId)) {
    log.warn(`Account ${accountId} not connected, cannot subscribe to push`);
    return null;
  }
  const conn = getConnection(accountId);

  // Create Web Push subscription (requires UnifiedPush integration)
  const webPushSubscription = await createWebPushSubscription(calendar);
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
    expiresAt: registration.expires,
    createdAt: new Date(),
  };

  await db.upsertPushSubscription(subscription);

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
  const subscriptions = await getCalendarSubscriptions(calendarId);

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

/**
 * Start listening for push messages on a calendar's subscription
 *
 * This connects to the ntfy SSE endpoint to receive real-time push messages.
 */
export const startPushListening = (calendarId: string) => {
  if (!globalMessageHandler) {
    log.warn('Push message handler not set - call initializePushManager first');
    return false;
  }

  return startListening(calendarId, globalMessageHandler);
};

/**
 * Stop listening for push messages on a calendar
 */
export const stopPushListening = (calendarId: string) => {
  stopListening(calendarId);
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
 * 1. Creates the ntfy subscription
 * 2. Registers with the CalDAV server
 * 3. Starts listening for messages
 */
export const enablePushForCalendar = async (accountId: string, calendar: Calendar) => {
  // Skip if already listening
  if (isListening(calendar.id)) {
    const subscriptions = await getCalendarSubscriptions(calendar.id);
    const validSubscription = subscriptions.find(
      (sub) => sub.expiresAt > new Date(Date.now() + RENEWAL_THRESHOLD_HOURS * 60 * 60 * 1000),
    );

    if (validSubscription) {
      log.debug(`Already listening for calendar ${calendar.displayName}`);
      return true;
    }

    log.info(
      `Calendar ${calendar.displayName} is listening without valid subscription; re-registering`,
    );
    stopPushListening(calendar.id);
    removeNtfySubscription(calendar.id);
  }

  // Subscribe to push
  const subscription = await subscribeCalendarToPush(accountId, calendar);
  if (!subscription) {
    return false;
  }

  // Start listening
  const listening = startPushListening(calendar.id);
  if (!listening) {
    log.warn(`Push subscribed but not listening for ${calendar.displayName}`);
  }

  return true;
};

/**
 * Disable push for a calendar
 *
 * Unsubscribes from the CalDAV server and stops listening.
 */
export const disablePushForCalendar = async (accountId: string, calendarId: string) => {
  // Stop listening first
  stopPushListening(calendarId);

  // Remove ntfy subscription
  removeNtfySubscription(calendarId);

  // Unsubscribe from server
  await unsubscribeCalendarFromPush(accountId, calendarId);
};

/**
 * Restore push listening for all active subscriptions
 *
 * Should be called on app startup to reconnect to ntfy for
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

    // Skip if already listening
    if (isListening(calendar.id)) {
      log.debug(`Already listening for calendar ${calendar.displayName}`);
      continue;
    }

    // Restore the ntfy subscription using the existing push resource URL
    // (not createNtfySubscription which would generate a new topic)
    try {
      const ntfySub = await restoreNtfySubscription(
        calendar.id,
        subscription.pushResource,
        calendar.displayName,
      );
      if (!ntfySub) {
        log.warn(`Failed to restore ntfy subscription for ${calendar.displayName}`);
        continue;
      }

      if (startPushListening(calendar.id)) {
        restored++;
        log.info(`Restored push listener for ${calendar.displayName}`);
      }
    } catch (error) {
      log.error(`Failed to restore push listener for ${calendar.displayName}:`, error);
    }
  }

  return restored;
};
