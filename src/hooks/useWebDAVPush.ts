/**
 * WebDAV Push Hook
 *
 * Manages WebDAV Push subscriptions and message handling.
 * Connects incoming push messages to calendar sync operations.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSettingsStore } from '$context/settingsContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import type { SyncTrigger } from '$hooks/queries/useSync';
import { loggers } from '$lib/logger';
import {
  enablePushForCalendar,
  findCalendarByTopic,
  initializePushManager,
  isPushProviderAvailable,
  restorePushListeners,
  stopAllPushSubscriptions,
} from '$lib/push';
import { createNtfyProviderConfig } from '$lib/push/ntfyProvider';
import type { Account, Calendar } from '$types';
import { NTFY_DIRECT_PROVIDER_ID, type PushProviderConfig } from '$types/push';

const log = loggers.sync;

const getPushSubscriptionTargets = (accounts: Account[]) =>
  accounts.flatMap((account) =>
    account.calendars
      .filter((calendar) => calendar.pushSupported)
      .map((calendar) => ({ accountId: account.id, calendar })),
  );

const getPushSubscriptionTargetKey = (accounts: Account[]) =>
  JSON.stringify(
    getPushSubscriptionTargets(accounts)
      .map(({ accountId, calendar }) => ({
        accountId,
        calendarId: calendar.id,
        displayName: calendar.displayName,
        topic: calendar.pushTopic ?? '',
        vapidKey: calendar.pushVapidKey ?? '',
      }))
      .sort((a, b) =>
        `${a.accountId}:${a.calendarId}`.localeCompare(`${b.accountId}:${b.calendarId}`),
      ),
  );

const subscribeToPushEnabledCalendars = async (
  accounts: Account[],
  providerConfig: PushProviderConfig,
  isCancelled: () => boolean,
) => {
  const providerAvailable = await isPushProviderAvailable(providerConfig);
  if (!providerAvailable) {
    log.warn('Push provider not available, skipping push subscriptions');
    return false;
  }

  for (const { accountId, calendar } of getPushSubscriptionTargets(accounts)) {
    if (isCancelled()) return false;

    try {
      const success = await enablePushForCalendar(accountId, calendar, providerConfig);
      if (success) {
        log.info(`Push enabled for calendar: ${calendar.displayName}`);
      }
    } catch (error) {
      log.error(`Failed to enable push for ${calendar.displayName}:`, error);
    }
  }

  return !isCancelled();
};

interface UseWebDAVPushProps {
  /** Called when a push message triggers sync for a calendar */
  onSyncCalendar: (calendarId: string, trigger?: SyncTrigger) => void;
  /** Last sync time - used to trigger push subscriptions after successful sync */
  lastSyncTime: Date | null;
}

/**
 * Hook to manage WebDAV Push
 *
 * Initializes push manager on mount, subscribes to push-enabled calendars,
 * and routes incoming push messages to sync operations.
 */
export const useWebDAVPush = ({ onSyncCalendar, lastSyncTime }: UseWebDAVPushProps) => {
  const { data: accounts = [] } = useAccounts();
  const { enablePush, pushProvider, ntfyServerUrl } = useSettingsStore();
  const pushProviderConfig = useMemo<PushProviderConfig>(
    () => ({
      providerId: pushProvider,
      ntfyConfig:
        pushProvider === NTFY_DIRECT_PROVIDER_ID
          ? createNtfyProviderConfig(ntfyServerUrl)
          : undefined,
    }),
    [pushProvider, ntfyServerUrl],
  );
  const initializedRef = useRef(false);
  const restoreCompletedRef = useRef(false);
  const lastPushSetupKeyRef = useRef<string | null>(null);
  const accountsRef = useRef(accounts);

  // Keep accounts ref in sync
  accountsRef.current = accounts;

  // Get all calendars across all accounts
  const allCalendars = useMemo(() => accounts.flatMap((a) => a.calendars), [accounts]);
  const pushSubscriptionTargetKey = useMemo(
    () => getPushSubscriptionTargetKey(accounts),
    [accounts],
  );

  // Push message handler - triggers sync for the affected calendar
  const handlePushMessage = useCallback(
    (calendarId: string, message: string) => {
      const preview = message.length > 80 ? `${message.slice(0, 80)}...` : message;
      log.info(
        `WebDAV Push message received for calendar ${calendarId} (bytes=${message.length}, preview=${preview})`,
      );

      // The message from WebDAV Push is typically minimal
      // The mere receipt of a message indicates changes on the server
      // Trigger a sync for this calendar
      onSyncCalendar(calendarId, {
        source: 'webdav-push',
        reason: `WebDAV Push message received (${message.length} bytes)`,
        where: 'useWebDAVPush.handlePushMessage',
      });
    },
    [onSyncCalendar],
  );

  // Initialize push manager once
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    initializePushManager(handlePushMessage);
    log.info('Push manager initialized');
  }, [handlePushMessage]);

  // Subscribe to push for push-enabled calendars after sync completes
  useEffect(() => {
    // Skip if push is disabled
    if (!enablePush) return;

    // Skip if no accounts
    if (accountsRef.current.length === 0) return;

    // Skip if no sync has completed yet
    if (!lastSyncTime) return;

    // Skip if we've already processed this sync
    const pushSetupKey = `${lastSyncTime.getTime()}|${pushProviderConfig.providerId}|${pushProviderConfig.ntfyConfig?.serverUrl ?? ''}|${pushSubscriptionTargetKey}`;
    if (lastPushSetupKeyRef.current === pushSetupKey) {
      return;
    }

    let cancelled = false;
    const setupPushSubscriptions = async () => {
      const completed = await subscribeToPushEnabledCalendars(
        accountsRef.current,
        pushProviderConfig,
        () => cancelled,
      );

      // Mark this sync time as processed
      if (completed) {
        lastPushSetupKeyRef.current = pushSetupKey;
      }
    };

    setupPushSubscriptions();
    return () => {
      cancelled = true;
    };
  }, [enablePush, lastSyncTime, pushProviderConfig, pushSubscriptionTargetKey]); // Trigger after successful sync or push-capable calendar changes

  // Restore push listeners on app startup (for existing subscriptions)
  useEffect(() => {
    if (!enablePush || accountsRef.current.length === 0 || restoreCompletedRef.current) return;

    const restore = async () => {
      const allCalendars = accountsRef.current.flatMap((a) => a.calendars);
      const restored = await restorePushListeners(allCalendars);
      if (restored > 0) {
        log.info(`Restored ${restored} push listeners`);
      }
      restoreCompletedRef.current = true;
    };

    restore();
  }, [enablePush]); // Only run when enablePush changes; accounts accessed via ref

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllPushSubscriptions();
    };
  }, []);

  // Return utility functions
  return {
    /** Find calendar by its push topic (for debugging) */
    findCalendarByTopic: useCallback(
      (topic: string): Calendar | undefined => findCalendarByTopic(allCalendars, topic),
      [allCalendars],
    ),
  };
};
