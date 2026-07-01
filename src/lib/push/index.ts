/**
 * WebDAV Push Subscription Manager
 *
 * handles the lifecycle of push subscriptions:
 * - Registration of new subscriptions
 * - Refresh of expired or expiring subscriptions
 * - Removal of subscriptions
 * - Restoring provider listeners after app restart
 */

import type { Connection } from '$lib/caldav/connection';
import { getConnection, isConnected } from '$lib/caldav/connection';
import { registerPushSubscription, unregisterPushSubscription } from '$lib/caldav/push';
import { log } from '$lib/caldav/utils';
import { db } from '$lib/database';
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
import { queryClient, queryKeys } from '$lib/queryClient';
import type { Account, Calendar } from '$types';
import {
  KUNIFIED_PUSH_PROVIDER_ID,
  NTFY_DIRECT_PROVIDER_ID,
  type PushEndpointSubscription,
  type PushMessageHandler,
  type PushProviderConfig,
  type PushRegistration,
  type PushSubscription,
  type PushTrigger,
  type WebDAVPushAccountDiagnostics,
} from '$types/push';
import { generateUUID } from '$utils/misc';

const DEFAULT_PUSH_PROVIDER_CONFIG: PushProviderConfig = {
  providerId: NTFY_DIRECT_PROVIDER_ID,
};

/**
 * default subscription expiration request (3 days)
 */
const DEFAULT_EXPIRATION_HOURS = 72;

/**
 * renew subscriptions this many hours before they expire
 */
const RENEWAL_THRESHOLD_HOURS = 48;

/**
 * global message handler - set via initializePushManager
 */
let globalMessageHandler: PushMessageHandler | null = null;
const pushEnableInFlight = new Map<string, Promise<boolean>>();

const getPushSetupKey = (
  accountId: string,
  calendar: Calendar,
  providerConfig: PushProviderConfig,
) =>
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

const getFreshAllSubscriptions = async () => {
  const subscriptions = await db.getAllPushSubscriptions();
  queryClient.setQueryData(queryKeys.pushSubscriptions.all, subscriptions);
  return subscriptions;
};

/**
 * invalidate push subscription caches after mutations
 */
const invalidatePushCaches = (calendarId?: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.pushSubscriptions.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.pushDiagnostics.all });
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
 * generate Web Push subscription details for a calendar
 *
 * creates a provider subscription and returns the Web Push subscription
 * details needed for CalDAV push registration
 */
export const createWebPushSubscription = async (
  calendar: Calendar,
  providerConfig: PushProviderConfig = DEFAULT_PUSH_PROVIDER_CONFIG,
) => {
  try {
    if (providerConfig.providerId === KUNIFIED_PUSH_PROVIDER_ID) {
      return await createKUnifiedPushProviderSubscription(calendar);
    }

    return await createNtfyProviderSubscription(calendar, providerConfig.ntfyConfig);
  } catch (error) {
    log.error(`Failed to create Web Push subscription for ${calendar.displayName}:`, error);
    return null;
  }
};

export const isPushProviderAvailable = async (
  providerConfig: PushProviderConfig = DEFAULT_PUSH_PROVIDER_CONFIG,
) => {
  if (providerConfig.providerId === KUNIFIED_PUSH_PROVIDER_ID) {
    return await isKUnifiedPushProviderAvailable();
  }

  return await isNtfyProviderAvailable(providerConfig.ntfyConfig);
};

const subscriptionMatchesProvider = (
  subscription: PushSubscription,
  providerConfig: PushProviderConfig,
) => {
  if (subscription.providerId !== providerConfig.providerId) return false;

  if (providerConfig.providerId === KUNIFIED_PUSH_PROVIDER_ID) {
    return !!subscription.providerToken;
  }

  return providerConfig.ntfyConfig
    ? isNtfyProviderPushResource(subscription.pushResource, providerConfig.ntfyConfig)
    : true;
};

const isRenewablyValidSubscription = (
  subscription: PushSubscription,
  providerConfig: PushProviderConfig,
) =>
  subscription.expiresAt > new Date(Date.now() + RENEWAL_THRESHOLD_HOURS * 60 * 60 * 1000) &&
  subscriptionMatchesProvider(subscription, providerConfig);

const isActiveProviderSubscription = (
  subscription: PushSubscription,
  providerConfig: PushProviderConfig,
) =>
  subscription.expiresAt > new Date() && subscriptionMatchesProvider(subscription, providerConfig);

const isExpiringSoon = (subscription: PushSubscription) =>
  subscription.expiresAt <= new Date(Date.now() + RENEWAL_THRESHOLD_HOURS * 60 * 60 * 1000);

const newerDate = (a: Date | null, b: Date | null): Date | null => {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
};

const newestSubscriptionFirst = (a: PushSubscription, b: PushSubscription) =>
  b.expiresAt.getTime() - a.expiresAt.getTime() || b.createdAt.getTime() - a.createdAt.getTime();

const getProviderSubscriptionDiagnostics = (
  calendarId: string,
  providerConfig: PushProviderConfig,
) => {
  if (providerConfig.providerId === KUNIFIED_PUSH_PROVIDER_ID) {
    return getKUnifiedPushProviderSubscriptionDiagnostics(calendarId);
  }

  return getNtfyProviderSubscriptionDiagnostics(calendarId);
};

export const getWebDAVPushAccountDiagnostics = async (
  account: Account,
  providerConfig: PushProviderConfig = DEFAULT_PUSH_PROVIDER_CONFIG,
) => {
  const subscriptions = await getFreshAllSubscriptions();
  const supportedCalendars = account.calendars.filter((calendar) => calendar.pushSupported);
  const diagnostics: WebDAVPushAccountDiagnostics = {
    accountId: account.id,
    supportedCalendars: supportedCalendars.length,
    registeredCalendars: 0,
    listeningCalendars: 0,
    expiringSoonCalendars: 0,
    lastRenewedAt: null,
    lastMessageAt: null,
    lastError: null,
    lastErrorAt: null,
  };

  for (const calendar of supportedCalendars) {
    const activeSubscriptions = subscriptions.filter(
      (subscription) =>
        subscription.accountId === account.id &&
        subscription.calendarId === calendar.id &&
        isActiveProviderSubscription(subscription, providerConfig),
    );
    const providerDiagnostics = getProviderSubscriptionDiagnostics(calendar.id, providerConfig);

    if (activeSubscriptions.length > 0) {
      diagnostics.registeredCalendars++;
      diagnostics.lastRenewedAt = activeSubscriptions.reduce(
        (latest, subscription) => newerDate(latest, subscription.createdAt),
        diagnostics.lastRenewedAt,
      );

      if (activeSubscriptions.some(isExpiringSoon)) {
        diagnostics.expiringSoonCalendars++;
      }
    }

    if (providerDiagnostics?.listening) {
      diagnostics.listeningCalendars++;
    }

    diagnostics.lastMessageAt = newerDate(
      diagnostics.lastMessageAt,
      providerDiagnostics?.lastMessageAt ?? null,
    );

    if (
      providerDiagnostics?.lastError &&
      (!diagnostics.lastErrorAt ||
        (providerDiagnostics.lastErrorAt &&
          providerDiagnostics.lastErrorAt > diagnostics.lastErrorAt))
    ) {
      diagnostics.lastError = providerDiagnostics.lastError;
      diagnostics.lastErrorAt = providerDiagnostics.lastErrorAt;
    }
  }

  return diagnostics;
};

const unregisterStoredSubscription = async (accountId: string, subscription: PushSubscription) => {
  if (!isConnected(accountId)) return;

  try {
    const conn = getConnection(accountId);
    await unregisterPushSubscription(subscription.registrationUrl, conn.credentials);
  } catch (error) {
    log.warn('Failed to unregister push subscription from server:', error);
  }
};

const removeStoredSubscription = async (subscription: PushSubscription) => {
  await removeProviderSubscription(subscription);
  await db.deletePushSubscription(subscription.id);
  removeSubscriptionFromCaches(subscription);
};

const removeStoredSubscriptionRecord = async (subscription: PushSubscription) => {
  await db.deletePushSubscription(subscription.id);
  removeSubscriptionFromCaches(subscription);
};

const createProviderCleanupSubscription = (
  accountId: string,
  calendar: Calendar,
  endpoint: PushEndpointSubscription,
): PushSubscription => ({
  id: `pending:${calendar.id}:${endpoint.pushResource}`,
  calendarId: calendar.id,
  accountId,
  registrationUrl: '',
  pushResource: endpoint.pushResource,
  providerId: endpoint.providerId,
  providerToken: endpoint.providerToken,
  providerDistributor: endpoint.providerDistributor,
  expiresAt: new Date(0),
  createdAt: new Date(),
});

const cleanupProviderEndpoint = async (
  accountId: string,
  calendar: Calendar,
  endpoint: PushEndpointSubscription,
) => {
  await removeProviderSubscription(
    createProviderCleanupSubscription(accountId, calendar, endpoint),
  );
};

const removeDuplicateProviderSubscriptions = async (
  accountId: string,
  keptSubscription: PushSubscription,
  subscriptions: PushSubscription[],
  providerConfig: PushProviderConfig,
) => {
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
) => {
  if (providerConfig.providerId === KUNIFIED_PUSH_PROVIDER_ID) {
    return await restoreKUnifiedPushProviderSubscription(subscription, calendar);
  }

  return await restoreNtfyProviderSubscription(subscription, calendar);
};

const removeProviderSubscription = async (subscription: PushSubscription) => {
  if (subscription.providerId === KUNIFIED_PUSH_PROVIDER_ID) {
    await removeKUnifiedPushProviderSubscription(subscription);
    return;
  }

  removeNtfyProviderSubscription(subscription);
};

const createRegisteredPushSubscription = async (
  accountId: string,
  calendar: Calendar,
  conn: Connection,
  providerConfig: PushProviderConfig,
) => {
  const webPushSubscription = await createWebPushSubscription(calendar, providerConfig);
  if (!webPushSubscription) {
    log.warn(`Failed to create Web Push subscription for ${calendar.displayName}`);
    return null;
  }

  const triggers: PushTrigger[] = [{ type: 'content-update', depth: '1' }];
  const expiresAt = new Date(Date.now() + DEFAULT_EXPIRATION_HOURS * 60 * 60 * 1000);

  let registration: PushRegistration | null;
  try {
    registration = await registerPushSubscription(
      calendar.url,
      conn.credentials,
      webPushSubscription,
      triggers,
      expiresAt,
    );
  } catch (error) {
    log.error(`Failed to register push subscription for ${calendar.displayName}:`, error);
    await cleanupProviderEndpoint(accountId, calendar, webPushSubscription);
    return null;
  }

  if (!registration) {
    log.error(`Failed to register push subscription for ${calendar.displayName}`);
    await cleanupProviderEndpoint(accountId, calendar, webPushSubscription);
    return null;
  }

  const subscription: PushSubscription = {
    id: generateUUID(),
    calendarId: calendar.id,
    accountId,
    registrationUrl: registration.registrationUrl,
    pushResource: webPushSubscription.pushResource,
    providerId: webPushSubscription.providerId,
    providerToken: webPushSubscription.providerToken,
    providerDistributor: webPushSubscription.providerDistributor,
    expiresAt: registration.expires,
    createdAt: new Date(),
  };

  await db.upsertPushSubscription(subscription);
  invalidatePushCaches(calendar.id);

  log.info(
    `Push subscription created for ${calendar.displayName}, expires: ${registration.expires.toISOString()}`,
  );

  return subscription;
};

const cleanupSupersededSubscriptions = async (
  accountId: string,
  calendar: Calendar,
  supersededSubscriptions: PushSubscription[],
  replacement: PushSubscription,
) => {
  for (const subscription of supersededSubscriptions) {
    await unregisterStoredSubscription(accountId, subscription);

    if (
      subscription.providerId === KUNIFIED_PUSH_PROVIDER_ID &&
      subscription.providerToken &&
      subscription.providerToken !== replacement.providerToken
    ) {
      await removeProviderSubscription(subscription);
    }

    await removeStoredSubscriptionRecord(subscription);
  }

  if (supersededSubscriptions.length > 0) {
    invalidatePushCaches(calendar.id);
    log.info(
      `Removed ${supersededSubscriptions.length} superseded push subscription(s) for ${calendar.displayName}`,
    );
  }
};

const recreateCalendarPushSubscription = async (
  accountId: string,
  calendar: Calendar,
  supersededSubscriptions: PushSubscription[],
  providerConfig: PushProviderConfig,
  reason: string,
) => {
  if (!isConnected(accountId)) {
    log.warn(
      `Cannot recreate push subscription for ${calendar.displayName}: account ${accountId} is not connected`,
    );
    return null;
  }

  log.info(`Recreating push subscription for ${calendar.displayName}: ${reason}`);
  const conn = getConnection(accountId);

  for (const subscription of supersededSubscriptions) {
    await removeProviderSubscription(subscription);
  }

  const replacement = await createRegisteredPushSubscription(
    accountId,
    calendar,
    conn,
    providerConfig,
  );
  if (!replacement) {
    return null;
  }

  await cleanupSupersededSubscriptions(accountId, calendar, supersededSubscriptions, replacement);
  return replacement;
};

/**
 * subscribe a calendar to WebDAV Push
 */
export const subscribeCalendarToPush = async (
  accountId: string,
  calendar: Calendar,
  providerConfig: PushProviderConfig = DEFAULT_PUSH_PROVIDER_CONFIG,
) => {
  // check if calendar supports push
  if (!calendar.pushSupported || !calendar.pushTopic) {
    log.debug(`Calendar ${calendar.displayName} does not support push`);
    return null;
  }

  // check fresh storage so stale query data can't race a just-created subscription
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

  // get connection
  if (!isConnected(accountId)) {
    log.warn(`Account ${accountId} not connected, cannot subscribe to push`);
    return null;
  }
  const conn = getConnection(accountId);

  const mismatchedSubscriptions = existingSubscriptions.filter(
    (sub) => sub.expiresAt > new Date() && !subscriptionMatchesProvider(sub, providerConfig),
  );

  for (const subscription of mismatchedSubscriptions) {
    await removeProviderSubscription(subscription);
  }

  if (mismatchedSubscriptions.length > 0) {
    log.info(
      `Stopped ${mismatchedSubscriptions.length} active push provider subscription(s) for ${calendar.displayName} from a previous push provider`,
    );
  }

  const subscription = await createRegisteredPushSubscription(
    accountId,
    calendar,
    conn,
    providerConfig,
  );
  if (!subscription) {
    return null;
  }

  await cleanupSupersededSubscriptions(accountId, calendar, existingSubscriptions, subscription);
  return subscription;
};

/**
 * unsubscribe a calendar from WebDAV Push
 */
export const unsubscribeCalendarFromPush = async (accountId: string, calendarId: string) => {
  const subscriptions = await getFreshCalendarSubscriptions(calendarId);

  if (subscriptions.length === 0) {
    log.debug(`No push subscriptions to remove for calendar ${calendarId}`);
    return;
  }

  // get connection if available
  let conn: Connection | null = null;
  if (isConnected(accountId)) {
    conn = getConnection(accountId);
  }

  // unregister from server and delete locally
  for (const subscription of subscriptions) {
    if (conn) {
      try {
        await unregisterPushSubscription(subscription.registrationUrl, conn.credentials);
      } catch (error) {
        log.warn(`Failed to unregister push subscription from server:`, error);
        // continue anyway - we'll delete locally
      }
    }

    await db.deletePushSubscription(subscription.id);
    removeSubscriptionFromCaches(subscription);
  }

  // invalidate caches
  invalidatePushCaches(calendarId);

  log.info(`Removed ${subscriptions.length} push subscriptions for calendar ${calendarId}`);
};

export const startPushListeningForSubscription = (
  subscription: PushSubscription,
  providerConfig: PushProviderConfig = DEFAULT_PUSH_PROVIDER_CONFIG,
  calendar?: Calendar,
) => {
  if (!globalMessageHandler) {
    log.warn('Push message handler not set - call initializePushManager first');
    return false;
  }

  if (providerConfig.providerId === KUNIFIED_PUSH_PROVIDER_ID) {
    return startKUnifiedPushProviderListening(
      subscription,
      globalMessageHandler,
      calendar
        ? (_calendarId, reason) => {
            log.warn(`KUnifiedPush invalidated for ${calendar.displayName}: ${reason}`);
            void recreateCalendarPushSubscription(
              subscription.accountId,
              calendar,
              [subscription],
              providerConfig,
              reason,
            ).then((replacement) => {
              if (replacement) {
                startPushListeningForSubscription(replacement, providerConfig, calendar);
                return;
              }

              globalMessageHandler?.(
                calendar.id,
                `KUnifiedPush invalidated and recreation failed: ${reason}`,
              );
            });
          }
        : undefined,
    );
  }

  return startNtfyProviderListening(subscription, globalMessageHandler);
};

/**
 * stop listening for push messages on a calendar
 */
export const stopPushListening = (calendarId: string) => {
  stopNtfyProviderListening(calendarId);
  stopKUnifiedPushProviderListening(calendarId);
};

/**
 * initialize the push manager with a message handler
 *
 * the handler will be called when push messages are received,
 * typically to trigger a sync for the affected calendar
 */
export const initializePushManager = (onPushMessage: PushMessageHandler) => {
  globalMessageHandler = onPushMessage;
  log.info('Push manager initialized with message handler');
};

/**
 * subscribe and start listening for a calendar
 *
 * this is a convenience function that:
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

    const diagnostics = getProviderSubscriptionDiagnostics(calendar.id, providerConfig);
    if (diagnostics?.listening) {
      log.debug(`Push listener already active for ${calendar.displayName}`);
      return true;
    }

    const restored = await restoreProviderSubscription(validSubscription, calendar, providerConfig);
    if (restored) {
      const listening = startPushListeningForSubscription(
        validSubscription,
        providerConfig,
        calendar,
      );
      if (listening) {
        return true;
      }

      log.warn(
        `Push provider subscription restored but listener did not start for ${calendar.displayName}; recreating it`,
      );
    } else {
      log.warn(
        `Failed to restore push provider subscription for ${calendar.displayName}; recreating it`,
      );
    }

    const replacement = await recreateCalendarPushSubscription(
      accountId,
      calendar,
      [validSubscription],
      providerConfig,
      restored ? 'provider listener failed to start' : 'provider restore failed',
    );
    if (!replacement) {
      return false;
    }

    return startPushListeningForSubscription(replacement, providerConfig, calendar);
  }

  // subscribe to push
  const subscription = await subscribeCalendarToPush(accountId, calendar, providerConfig);
  if (!subscription) {
    return false;
  }

  // start listening
  const listening = startPushListeningForSubscription(subscription, providerConfig, calendar);
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
 * disable push for a calendar
 *
 * unsubscribes from the CalDAV server and stops listening
 */
export const disablePushForCalendar = async (accountId: string, calendarId: string) => {
  // stop listening first
  stopPushListening(calendarId);

  // remove provider subscription
  const subscriptions = await getFreshCalendarSubscriptions(calendarId);
  for (const subscription of subscriptions) {
    await removeProviderSubscription(subscription);
  }

  // unsubscribe from server
  await unsubscribeCalendarFromPush(accountId, calendarId);
};

export const disableAllPushSubscriptions = async () => {
  const subscriptions = await getFreshAllSubscriptions();

  for (const subscription of subscriptions) {
    await removeProviderSubscription(subscription);
    await unregisterStoredSubscription(subscription.accountId, subscription);
    await removeStoredSubscriptionRecord(subscription);
  }

  stopAllPushSubscriptions();
  invalidatePushCaches();

  if (subscriptions.length > 0) {
    log.info(`Disabled WebDAV Push and removed ${subscriptions.length} stored subscription(s)`);
  }
};

const restoreCalendarPushListener = async (
  calendar: Calendar,
  subscriptions: PushSubscription[],
  providerConfig: PushProviderConfig,
) => {
  const renewableSubscriptions = subscriptions
    .filter((subscription) => isRenewablyValidSubscription(subscription, providerConfig))
    .sort(newestSubscriptionFirst);
  const subscription =
    renewableSubscriptions[0] ?? [...subscriptions].sort(newestSubscriptionFirst)[0];

  if (!subscription) return false;

  const recreateSubscription = async (
    reason: string,
    supersededSubscriptions: PushSubscription[] = subscriptions,
  ) => {
    const replacement = await recreateCalendarPushSubscription(
      subscription.accountId,
      calendar,
      supersededSubscriptions,
      providerConfig,
      reason,
    );
    if (!replacement) {
      return false;
    }

    return startPushListeningForSubscription(replacement, providerConfig, calendar);
  };

  if (!renewableSubscriptions.length) {
    return await recreateSubscription(
      'stored subscription is expired, nearing expiration, or from a previous provider',
    );
  }

  const removed = await removeDuplicateProviderSubscriptions(
    subscription.accountId,
    subscription,
    subscriptions,
    providerConfig,
  );
  if (removed > 0) {
    log.info(`Removed ${removed} duplicate push subscription(s) for ${calendar.displayName}`);
  }

  try {
    const restoredProvider = await restoreProviderSubscription(
      subscription,
      calendar,
      providerConfig,
    );
    if (!restoredProvider) {
      log.warn(`Failed to restore push provider subscription for ${calendar.displayName}`);
      return await recreateSubscription('provider restore failed', [subscription]);
    }

    if (startPushListeningForSubscription(subscription, providerConfig, calendar)) {
      log.info(`Restored push listener for ${calendar.displayName}`);
      return true;
    }

    return await recreateSubscription('provider listener failed to start', [subscription]);
  } catch (error) {
    log.error(`Failed to restore push listener for ${calendar.displayName}:`, error);
    return await recreateSubscription('provider restore threw', [subscription]);
  }
};

/**
 * restore push listening for all active subscriptions
 *
 * should be called on app startup to reconnect provider listeners for
 * calendars that still have valid push subscriptions
 */
export const restorePushListeners = async (
  calendars: Calendar[],
  providerConfig: PushProviderConfig = DEFAULT_PUSH_PROVIDER_CONFIG,
) => {
  if (!globalMessageHandler) {
    log.warn('Cannot restore push listeners - message handler not set');
    return 0;
  }

  let restored = 0;
  const allSubscriptions = await getFreshAllSubscriptions();
  const subscriptionsByCalendar = new Map<string, PushSubscription[]>();

  for (const subscription of allSubscriptions) {
    const subscriptions = subscriptionsByCalendar.get(subscription.calendarId) ?? [];
    subscriptions.push(subscription);
    subscriptionsByCalendar.set(subscription.calendarId, subscriptions);
  }

  for (const [calendarId, subscriptions] of subscriptionsByCalendar) {
    // find the calendar
    const calendar = calendars.find((c) => c.id === calendarId);
    if (!calendar) {
      log.warn(`Calendar ${calendarId} not found for push subscription`);
      for (const subscription of subscriptions) {
        await unregisterStoredSubscription(subscription.accountId, subscription);
        await removeStoredSubscription(subscription);
      }
      continue;
    }

    if (await restoreCalendarPushListener(calendar, subscriptions, providerConfig)) {
      restored++;
    }
  }

  return restored;
};

export const stopAllPushSubscriptions = () => {
  stopAllNtfyProviderListeners();
  stopAllKUnifiedPushProviderListeners();
};
