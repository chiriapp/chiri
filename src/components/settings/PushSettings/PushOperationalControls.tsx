import { useQuery } from '@tanstack/react-query';
import Loader2 from 'lucide-react/icons/loader-2';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Zap from 'lucide-react/icons/zap';
import { useMemo, useState } from 'react';
import { useSettingsStore } from '$context/settingsContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { getAllPushSubscriptions, resubscribeAllPushCalendars } from '$lib/push';
import { getPushProviderConfigKey, getPushProviderLabel } from '$lib/push/providers';
import { queryKeys } from '$lib/queryClient';
import type { PushProviderConfig, PushSubscription } from '$types/push';

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
  getCalendarName: (subscription: PushSubscription) => string,
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

  return (
    <div className="divide-y divide-surface-200 dark:divide-surface-700">
      {subscriptions.map((subscription) => (
        <div key={subscription.id} className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="truncate text-sm text-surface-700 dark:text-surface-300">
              {getCalendarName(subscription)}
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              {getPushProviderLabel(subscription.providerId)} - expires{' '}
              {formatRelativeDate(subscription.expiresAt)}
            </p>
          </div>
          <Zap className="size-4 shrink-0 text-semantic-success" />
        </div>
      ))}
    </div>
  );
};

export const PushOperationalControls = ({
  providerAvailable,
  providerConfig,
  isResolvingProvider,
}: PushOperationalControlsProps) => {
  const { enforceVapid } = useSettingsStore();
  const { data: accounts = [] } = useAccounts();
  const [resubscribeMessage, setResubscribeMessage] = useState<string | null>(null);
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
  const getCalendarName = (subscription: PushSubscription) =>
    pushAccounts
      .flatMap((account) => account.calendars)
      .find((calendar) => calendar.id === subscription.calendarId)?.displayName ??
    subscription.calendarId;

  const handleResubscribeAll = async () => {
    setIsResubscribing(true);
    setResubscribeMessage(null);
    setResubscribeError(null);

    try {
      const result = await resubscribeAllPushCalendars(pushAccounts, providerConfig, enforceVapid);
      setResubscribeMessage(
        `Resubscribed ${result.succeeded}/${result.attempted} push calendar${
          result.attempted === 1 ? '' : 's'
        }.`,
      );
      await activeSubscriptions.refetch();
    } catch (error) {
      setResubscribeError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsResubscribing(false);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Resubscribe push calendars
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Recreate subscriptions for every push-capable calendar
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
        {(resubscribeMessage || resubscribeError) && (
          <div className="border-surface-200 border-t px-4 py-3 text-xs dark:border-surface-700">
            {resubscribeMessage && <p className="text-semantic-success">{resubscribeMessage}</p>}
            {resubscribeError && <p className="text-semantic-error">{resubscribeError}</p>}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="p-4">
          <p className="text-sm text-surface-700 dark:text-surface-300">Active subscriptions</p>
          <p className="text-surface-500 text-xs dark:text-surface-400">
            Current local WebDAV Push registrations
          </p>
        </div>
        <div className="border-surface-200 border-t dark:border-surface-700" />
        {renderSubscriptionContent(
          activeSubscriptions.isLoading,
          activeSubscriptions.data,
          getCalendarName,
        )}
      </div>
    </>
  );
};
