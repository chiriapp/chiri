/**
 * WebDAV Push Hook
 *
 * manages WebDAV Push subscriptions and message handling
 * connects incoming push messages to calendar sync operations
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSettingsStore } from '$context/settingsContext';
import { usePushProviderConfigState } from '$hooks/push/usePushProviderAvailability';
import { useAccounts } from '$hooks/queries/useAccounts';
import type { SyncTrigger } from '$hooks/queries/useSync';
import { loggers } from '$lib/logger';
import {
  disableAllPushSubscriptions,
  enablePushForCalendar,
  initializePushManager,
  isPushProviderAvailable,
  restorePushListeners,
  stopAllPushSubscriptions,
} from '$lib/push';
import { getPushProviderConfigKey } from '$lib/push/providers';
import type { Account } from '$types';
import {
  KUNIFIED_PUSH_PROVIDER_ID,
  NTFY_DIRECT_PROVIDER_ID,
  type PushProviderConfig,
} from '$types/push';

const log = loggers.sync;
const PUSH_MAINTENANCE_INTERVAL_SECONDS = 12 * 60 * 60;

interface PushMaintenanceEvent {
  intervalSeconds: number;
  reason: string;
}

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
        log.debug(`Push enabled for calendar: ${calendar.displayName}`);
      }
    } catch (error) {
      log.error(`Failed to enable push for ${calendar.displayName}:`, error);
    }
  }

  return !isCancelled();
};

interface UseWebDAVPushProps {
  /** called when a push message triggers sync for a calendar */
  onSyncCalendar: (calendarId: string, trigger?: SyncTrigger) => void;
  /** last sync time - used to trigger push subscriptions after successful sync */
  lastSyncTime: Date | null;
}

/**
 * hook to manage WebDAV Push
 *
 * initializes push manager on mount, subscribes to push-enabled calendars,
 * and routes incoming push messages to sync operations
 */
export const useWebDAVPush = ({ onSyncCalendar, lastSyncTime }: UseWebDAVPushProps) => {
  const { data: accounts = [] } = useAccounts();
  const {
    enablePush,
    pushProvider,
    ntfyServerUrl,
    mozillaAutopushWebsocketUrl,
    mozillaAutopushEndpointUrl,
    setPushProvider,
  } = useSettingsStore();
  const { isResolvingKUnifiedPush, kunifiedPushAllowed, pushProviderConfig } =
    usePushProviderConfigState(
      pushProvider,
      ntfyServerUrl,
      mozillaAutopushWebsocketUrl,
      mozillaAutopushEndpointUrl,
    );
  const initializedRef = useRef(false);
  const restoreCompletedRef = useRef(false);
  const lastPushSetupKeyRef = useRef<string | null>(null);
  const previousEnablePushRef = useRef(enablePush);
  const accountsRef = useRef(accounts);

  // keep accounts ref in sync
  accountsRef.current = accounts;

  const pushSubscriptionTargetKey = useMemo(
    () => getPushSubscriptionTargetKey(accounts),
    [accounts],
  );
  const pushProviderConfigKey = useMemo(
    () => getPushProviderConfigKey(pushProviderConfig),
    [pushProviderConfig],
  );
  const previousPushProviderConfigKeyRef = useRef(pushProviderConfigKey);

  // push message handler - triggers sync for the affected calendar
  const handlePushMessage = useCallback(
    (calendarId: string, message: string) => {
      const preview = message.length > 80 ? `${message.slice(0, 80)}...` : message;
      log.info(
        `WebDAV Push message received for calendar ${calendarId} (bytes=${message.length}, preview=${preview})`,
      );

      // the message from WebDAV Push is typically minimal
      // the mere receipt of a message indicates changes on the server
      // trigger a sync for this calendar
      onSyncCalendar(calendarId, {
        source: 'webdav-push',
        reason: `WebDAV Push message received (${message.length} bytes)`,
        where: 'useWebDAVPush.handlePushMessage',
      });
    },
    [onSyncCalendar],
  );

  // initialize push manager once
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    initializePushManager(handlePushMessage);
    log.info('Push manager initialized');
  }, [handlePushMessage]);

  useEffect(() => {
    if (isResolvingKUnifiedPush) return;
    if (pushProvider !== KUNIFIED_PUSH_PROVIDER_ID || kunifiedPushAllowed) return;

    setPushProvider(NTFY_DIRECT_PROVIDER_ID);
    restoreCompletedRef.current = false;
    lastPushSetupKeyRef.current = null;
  }, [isResolvingKUnifiedPush, kunifiedPushAllowed, pushProvider, setPushProvider]);

  // subscribe to push for push-enabled calendars after sync completes
  useEffect(() => {
    if (isResolvingKUnifiedPush) return;

    // skip if push is disabled
    if (!enablePush) return;

    // skip if no accounts
    if (accountsRef.current.length === 0) return;

    // skip if no sync has completed yet
    if (!lastSyncTime) return;

    // skip if we've already processed this sync
    const pushSetupKey = `${lastSyncTime.getTime()}|${pushProviderConfigKey}|${pushSubscriptionTargetKey}`;
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

      // mark this sync time as processed
      if (completed) {
        lastPushSetupKeyRef.current = pushSetupKey;
      }
    };

    setupPushSubscriptions();
    return () => {
      cancelled = true;
    };
  }, [
    enablePush,
    isResolvingKUnifiedPush,
    lastSyncTime,
    pushProviderConfig,
    pushProviderConfigKey,
    pushSubscriptionTargetKey,
  ]); // trigger after successful sync or push-capable calendar changes

  useEffect(() => {
    if (previousPushProviderConfigKeyRef.current === pushProviderConfigKey) return;

    previousPushProviderConfigKeyRef.current = pushProviderConfigKey;
    restoreCompletedRef.current = false;
    lastPushSetupKeyRef.current = null;
  }, [pushProviderConfigKey]);

  useEffect(() => {
    const wasEnabled = previousEnablePushRef.current;
    previousEnablePushRef.current = enablePush;

    if (enablePush) {
      return;
    }

    restoreCompletedRef.current = false;
    lastPushSetupKeyRef.current = null;

    if (!wasEnabled) {
      return;
    }

    let cancelled = false;
    const disablePush = async () => {
      try {
        await disableAllPushSubscriptions();
        if (!cancelled) {
          log.info('WebDAV Push disabled');
        }
      } catch (error) {
        if (!cancelled) {
          log.warn('Failed to disable WebDAV Push subscriptions:', error);
        }
      }
    };

    disablePush();

    return () => {
      cancelled = true;
    };
  }, [enablePush]);

  useEffect(() => {
    let cancelled = false;
    let unlistenMaintenance: (() => void) | undefined;

    const setupMaintenanceListener = async () => {
      try {
        const unlisten = await listen<PushMaintenanceEvent>(
          'webdav-push://maintenance',
          async (event) => {
            if (cancelled || !enablePush || isResolvingKUnifiedPush) return;

            log.info('Running WebDAV Push maintenance', {
              intervalSeconds: event.payload.intervalSeconds,
              reason: event.payload.reason,
            });

            await subscribeToPushEnabledCalendars(
              accountsRef.current,
              pushProviderConfig,
              () => cancelled,
            );
          },
        );
        if (cancelled) {
          unlisten();
          return;
        }
        unlistenMaintenance = unlisten;
      } catch (error) {
        log.warn('Failed to listen for WebDAV Push maintenance events:', error);
      }
    };

    setupMaintenanceListener();

    return () => {
      cancelled = true;
      unlistenMaintenance?.();
    };
  }, [enablePush, isResolvingKUnifiedPush, pushProviderConfig]);

  useEffect(() => {
    const hasPushTargets = getPushSubscriptionTargets(accounts).length > 0;
    const enabled = enablePush && hasPushTargets && !isResolvingKUnifiedPush;

    invoke('start_webdav_push_maintenance', {
      enabled,
      intervalSeconds: PUSH_MAINTENANCE_INTERVAL_SECONDS,
    }).catch((error) => {
      log.warn('Failed to configure WebDAV Push maintenance:', error);
    });

    return () => {
      invoke('stop_webdav_push_maintenance').catch((error) => {
        log.warn('Failed to stop WebDAV Push maintenance:', error);
      });
    };
  }, [accounts, enablePush, isResolvingKUnifiedPush]);

  // restore push listeners on app startup (for existing subscriptions)
  useEffect(() => {
    if (
      isResolvingKUnifiedPush ||
      !enablePush ||
      accounts.length === 0 ||
      restoreCompletedRef.current
    ) {
      return;
    }

    const restore = async () => {
      const allCalendars = accounts.flatMap((a) => a.calendars);
      const restored = await restorePushListeners(allCalendars, pushProviderConfig);
      if (restored > 0) {
        log.info(`Restored ${restored} push listeners`);
      }
      restoreCompletedRef.current = true;
    };

    restore();
  }, [accounts, enablePush, isResolvingKUnifiedPush, pushProviderConfig]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllPushSubscriptions();
    };
  }, []);

  return undefined;
};
