/**
 * WebDAV Push Hook
 *
 * Manages WebDAV Push subscriptions and message handling.
 * Connects incoming push messages to calendar sync operations.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { loggers } from '$lib/logger';
import {
  enablePushForCalendar,
  findCalendarByTopic,
  initializePushManager,
  isPushProviderAvailable,
  type PushProviderConfig,
  restorePushListeners,
  stopAllPushSubscriptions,
} from '$lib/push';
import { createNtfyProviderConfig } from '$lib/push/ntfyProvider';
import type { Calendar } from '$types';
import { NTFY_DIRECT_PROVIDER_ID } from '$types/push';

const log = loggers.sync;

interface UseWebDAVPushProps {
  /** Called when a push message triggers sync for a calendar */
  onSyncCalendar: (calendarId: string) => void;
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
  const allCalendars = accounts.flatMap((a) => a.calendars);

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
      onSyncCalendar(calendarId);
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
    const pushSetupKey = `${lastSyncTime.getTime()}|${pushProviderConfig.providerId}|${pushProviderConfig.ntfyConfig?.serverUrl ?? ''}`;
    if (lastPushSetupKeyRef.current === pushSetupKey) {
      return;
    }

    const subscribeToPushEnabledCalendars = async () => {
      // Check provider availability first
      const providerAvailable = await isPushProviderAvailable(pushProviderConfig);
      if (!providerAvailable) {
        log.warn('Push provider not available, skipping push subscriptions');
        return;
      }

      for (const account of accountsRef.current) {
        for (const calendar of account.calendars) {
          // Skip if not push-enabled
          if (!calendar.pushSupported) {
            continue;
          }

          try {
            const success = await enablePushForCalendar(account.id, calendar, pushProviderConfig);
            if (success) {
              log.info(`Push enabled for calendar: ${calendar.displayName}`);
            }
          } catch (error) {
            log.error(`Failed to enable push for ${calendar.displayName}:`, error);
          }
        }
      }

      // Mark this sync time as processed
      lastPushSetupKeyRef.current = pushSetupKey;
    };

    subscribeToPushEnabledCalendars();
  }, [enablePush, lastSyncTime, pushProviderConfig]); // Trigger after each successful sync

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
