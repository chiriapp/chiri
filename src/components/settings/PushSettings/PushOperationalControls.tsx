import { useQuery } from '@tanstack/react-query';
import CircleAlert from 'lucide-react/icons/circle-alert';
import Loader2 from 'lucide-react/icons/loader-2';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import X from 'lucide-react/icons/x';
import { useMemo, useState } from 'react';
import { WebDAVPushStatusIcon } from '$components/settings/WebDAVPushStatusIcon';
import { Tooltip } from '$components/Tooltip';
import { getIconByName } from '$constants/icons';
import { useSettingsStore } from '$context/settingsContext';
import { usePushProviderAvailability } from '$hooks/push/usePushProviderAvailability';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import {
  getAllPushSubscriptions,
  getWebDAVPushAccountDiagnostics,
  resubscribeAllPushCalendars,
} from '$lib/push';
import { getPushProviderConfigKey } from '$lib/push/providers';
import { getWebDAVPushStatus, webdavPushToneClass } from '$lib/push/status';
import { queryKeys } from '$lib/queryClient';
import type { Account } from '$types';
import type {
  PushProviderConfig,
  PushSubscription,
  WebDAVPushAccountDiagnostics,
} from '$types/push';

interface PushOperationalControlsProps {
  providerAvailable: boolean;
  providerConfig: PushProviderConfig;
  isResolvingProvider: boolean;
}

const formatRelativeDate = (date: Date) => {
  const diffMs = date.getTime() - Date.now();
  const diffHours = Math.round(Math.abs(diffMs) / (60 * 60 * 1000));
  const unit = diffHours >= 24 ? `${Math.round(diffHours / 24)}d` : `${diffHours}h`;
  return diffMs >= 0 ? `in ${unit}` : `${unit} ago`;
};

const renderSubscriptionContent = (
  isLoading: boolean,
  subscriptions: PushSubscription[] | undefined,
  pushAccounts: Account[],
  resolveAccent: (color: string) => string,
  resolvedAccentColor: string,
  providerAvailable: boolean | undefined,
  providerChecking: boolean,
  diagnosticsByAccount: Record<string, WebDAVPushAccountDiagnostics>,
) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-surface-500 dark:text-surface-400">
        <Loader2 className="size-4 animate-spin" />
        Loading subscriptions
      </div>
    );
  }

  if (!subscriptions?.length) {
    return (
      <p className="p-4 text-sm text-surface-500 dark:text-surface-400">
        No active push subscriptions.
      </p>
    );
  }

  const accountMap: Record<string, Account> = Object.fromEntries(
    pushAccounts.map((account) => [account.id, account]),
  );
  const calendarMap: Record<string, Account['calendars'][number]> = Object.fromEntries(
    pushAccounts.flatMap((account) => account.calendars.map((calendar) => [calendar.id, calendar])),
  );

  const groupedByAccount: Record<string, PushSubscription[]> = {};
  for (const subscription of subscriptions) {
    const group = groupedByAccount[subscription.accountId] ?? [];
    group.push(subscription);
    groupedByAccount[subscription.accountId] = group;
  }
  for (const group of Object.values(groupedByAccount)) {
    group.sort((a, b) => {
      const calendarA = calendarMap[a.calendarId];
      const calendarB = calendarMap[b.calendarId];
      const orderA = calendarA?.sortOrder ?? 0;
      const orderB = calendarB?.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return (calendarA?.displayName ?? a.calendarId).localeCompare(
        calendarB?.displayName ?? b.calendarId,
      );
    });
  }

  const groups: { name: string; subscriptions: PushSubscription[] }[] = [];
  for (const account of pushAccounts) {
    const accountSubscriptions = groupedByAccount[account.id];
    if (accountSubscriptions && accountSubscriptions.length > 0) {
      groups.push({ name: account.name, subscriptions: accountSubscriptions });
    }
  }

  const unknownSubscriptions = subscriptions.filter(
    (subscription) => !accountMap[subscription.accountId],
  );
  if (unknownSubscriptions.length > 0) {
    groups.push({ name: 'Unknown account', subscriptions: unknownSubscriptions });
  }

  return (
    <div className="border-surface-200 border-t dark:border-surface-700">
      {groups.map((group) => {
        const accountId = group.subscriptions[0].accountId;
        const account = accountMap[accountId];
        const AccountIcon = getIconByName(account?.icon ?? 'user');
        const headerContent = account?.emoji ? (
          <span className="shrink-0 text-center text-xs leading-none">{account.emoji}</span>
        ) : (
          <AccountIcon className="size-4 shrink-0 text-surface-500 dark:text-surface-400" />
        );
        const status = account
          ? getWebDAVPushStatus(
              account,
              providerAvailable,
              providerChecking,
              diagnosticsByAccount[accountId],
            )
          : null;
        const toneClass = status ? webdavPushToneClass[status.tone] : undefined;
        return (
          <div
            key={accountMap[accountId] ? accountId : 'unknown'}
            className="border-surface-200 border-b dark:border-surface-700"
          >
            <div className="flex items-center justify-between gap-2 bg-surface-50 px-4 py-2 font-medium text-surface-600 text-xs dark:bg-surface-900/40 dark:text-surface-400">
              <div className="flex min-w-0 items-center gap-2">
                {headerContent}
                <span className="truncate">{group.name}</span>
              </div>
              {status && (
                <Tooltip content={status.label} position="bottom" allowInModal>
                  <span className={`inline-flex items-center ${toneClass}`}>
                    <WebDAVPushStatusIcon icon={status.icon} />
                  </span>
                </Tooltip>
              )}
            </div>
            <div className="divide-y divide-surface-200 dark:divide-surface-700">
              {group.subscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {(() => {
                      const calendar = calendarMap[subscription.calendarId];
                      const CalendarIcon = getIconByName(calendar?.icon ?? 'calendar');
                      const calendarColor = calendar?.color
                        ? resolveAccent(calendar.color)
                        : resolvedAccentColor;
                      return calendar?.emoji ? (
                        <span
                          className="shrink-0 text-xs leading-none"
                          style={{ color: calendarColor }}
                        >
                          {calendar.emoji}
                        </span>
                      ) : (
                        <CalendarIcon
                          className="size-4 shrink-0"
                          style={{ color: calendarColor }}
                        />
                      );
                    })()}
                    <div className="min-w-0">
                      <p className="truncate text-sm text-surface-700 dark:text-surface-300">
                        {calendarMap[subscription.calendarId]?.displayName ??
                          subscription.calendarId}
                      </p>
                      <p className="text-surface-500 text-xs dark:text-surface-400">
                        Expires {formatRelativeDate(subscription.expiresAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const PushOperationalControls = ({
  providerAvailable,
  providerConfig,
  isResolvingProvider,
}: PushOperationalControlsProps) => {
  const {
    enforceVapid,
    enablePush,
    pushProvider,
    ntfyServerUrl,
    mozillaAutopushWebsocketUrl,
    mozillaAutopushEndpointUrl,
  } = useSettingsStore();
  const { data: accounts = [] } = useAccounts();
  const {
    availability: providerAvailability,
    isResolvingKUnifiedPush,
    pushProviderConfig,
  } = usePushProviderAvailability({
    enabled: enablePush,
    pushProvider,
    ntfyServerUrl,
    mozillaAutopushWebsocketUrl,
    mozillaAutopushEndpointUrl,
  });
  const providerChecking =
    isResolvingKUnifiedPush ||
    (providerAvailability.isFetching && providerAvailability.data === undefined);
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const [resubscribeError, setResubscribeError] = useState<string | null>(null);
  const [isResubscribing, setIsResubscribing] = useState(false);
  const providerKey = getPushProviderConfigKey(providerConfig);
  const pushAccounts = useMemo(() => accounts.filter((account) => account.caldav), [accounts]);
  const pushAccountIds = useMemo(
    () => new Set(pushAccounts.map((account) => account.id)),
    [pushAccounts],
  );
  const pushAccountKey = pushAccounts
    .map((account) => `${account.id}:${account.calendars.map((calendar) => calendar.id).join(',')}`)
    .join('|');
  const supportedPushCalendars = useMemo(
    () =>
      pushAccounts.flatMap((account) =>
        account.calendars
          .filter((calendar) => calendar.pushSupported)
          .map((calendar) => ({ account, calendar })),
      ),
    [pushAccounts],
  );
  const activeSubscriptions = useQuery({
    queryKey: [...queryKeys.pushSubscriptions.all, providerKey, pushAccountKey],
    queryFn: async () => {
      const subscriptions = await getAllPushSubscriptions();
      return subscriptions.filter(
        (subscription) =>
          pushAccountIds.has(subscription.accountId) && subscription.expiresAt > new Date(),
      );
    },
    refetchInterval: 10_000,
  });
  const pushDiagnostics = useQuery({
    queryKey: [...queryKeys.pushDiagnostics.all, providerKey, pushAccountKey],
    queryFn: async () =>
      Promise.all(
        pushAccounts.map((account) => getWebDAVPushAccountDiagnostics(account, pushProviderConfig)),
      ),
    enabled: enablePush && !isResolvingKUnifiedPush,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
  const diagnosticsByAccount = useMemo(() => {
    const map: Record<string, WebDAVPushAccountDiagnostics> = {};
    for (const diagnostics of pushDiagnostics.data ?? []) {
      map[diagnostics.accountId] = diagnostics;
    }
    return map;
  }, [pushDiagnostics.data]);
  const handleResubscribeAll = async () => {
    setIsResubscribing(true);
    setResubscribeError(null);

    try {
      await resubscribeAllPushCalendars(pushAccounts, providerConfig, enforceVapid);
      await activeSubscriptions.refetch();
    } catch (error) {
      setResubscribeError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsResubscribing(false);
    }
  };

  const handleDismissResubscribeError = () => {
    setResubscribeError(null);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
      <div className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm text-surface-700 dark:text-surface-300">Active subscriptions</p>
          <p className="text-surface-500 text-xs dark:text-surface-400">
            Current local WebDAV Push registrations
          </p>
        </div>
        <button
          type="button"
          onClick={handleResubscribeAll}
          disabled={
            isResubscribing ||
            !providerAvailable ||
            supportedPushCalendars.length === 0 ||
            isResolvingProvider
          }
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-surface-700 dark:text-surface-200 dark:hover:bg-surface-600"
        >
          {isResubscribing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Resubscribe all
        </button>
      </div>
      {resubscribeError && (
        <div className="mx-4 mb-4 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs dark:border-surface-700 dark:bg-surface-900/60">
          <div className="flex items-center gap-2">
            <CircleAlert className="mt-px size-4 shrink-0 text-semantic-error" />
            <p className="flex-1 text-semantic-error">{resubscribeError}</p>
            <button
              type="button"
              onClick={handleDismissResubscribeError}
              aria-label="Dismiss resubscribe error"
              className="-mr-1 rounded-sm p-1 text-surface-600 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-600"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
      <div className="border-surface-200 border-t dark:border-surface-700" />
      {renderSubscriptionContent(
        activeSubscriptions.isLoading,
        activeSubscriptions.data,
        pushAccounts,
        resolveAccent,
        resolvedAccentColor,
        providerAvailability.data,
        providerChecking,
        diagnosticsByAccount,
      )}
    </div>
  );
};
