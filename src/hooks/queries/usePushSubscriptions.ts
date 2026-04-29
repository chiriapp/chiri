/**
 * TanStack Query hooks for WebDAV Push subscriptions
 *
 * These hooks cache subscription data to avoid repeated database queries
 * throughout the push manager lifecycle.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '$lib/database';
import { queryKeys } from '$lib/queryClient';

/**
 * Renew subscriptions this many hours before they expire
 */
const RENEWAL_THRESHOLD_HOURS = 48;

/**
 * Hook to get all push subscriptions
 *
 * Used by restorePushListeners to efficiently fetch all subscriptions on startup.
 */
export const usePushSubscriptions = () => {
  return useQuery({
    queryKey: queryKeys.pushSubscriptions.all,
    queryFn: () => db.getAllPushSubscriptions(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to get push subscriptions for a specific calendar
 *
 * Used by subscribeCalendarToPush and enablePushForCalendar to check
 * if a valid subscription already exists before creating a new one.
 */
export const useCalendarPushSubscriptions = (calendarId: string | null) => {
  return useQuery({
    queryKey: calendarId ? queryKeys.pushSubscriptions.byCalendar(calendarId) : ['push-null'],
    queryFn: () => (calendarId ? db.getPushSubscriptionsByCalendar(calendarId) : []),
    enabled: !!calendarId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to get expiring push subscriptions
 *
 * Used for renewal logic and monitoring.
 */
export const useExpiringPushSubscriptions = (withinHours: number = RENEWAL_THRESHOLD_HOURS) => {
  return useQuery({
    queryKey: queryKeys.pushSubscriptions.expiring(withinHours),
    queryFn: () => db.getExpiringSubscriptions(withinHours),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Helper to invalidate push subscription queries
 *
 * Call this after any mutation that changes subscription data.
 */
export const useInvalidatePushSubscriptions = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pushSubscriptions.all });
    },
    invalidateCalendar: (calendarId: string) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pushSubscriptions.byCalendar(calendarId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.pushSubscriptions.all });
    },
  };
};
