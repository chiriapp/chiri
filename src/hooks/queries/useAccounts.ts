/**
 * TanStack Query hooks for accounts and calendars
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '$lib/queryClient';
import { dataStore } from '$lib/store';
import {
  createAccount,
  deleteAccount,
  getAccountById,
  getAllAccounts,
  updateAccount,
} from '$lib/store/accounts';
import { addCalendar, deleteCalendar } from '$lib/store/calendars';
import { reorderAccounts } from '$lib/store/reorder/accounts';
import { reorderCalendars } from '$lib/store/reorder/calendars';
import type { Account, Calendar } from '$types';

/**
 * Hook to get all accounts
 */
export const useAccounts = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return dataStore.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    });
  }, [queryClient]);

  return useQuery({
    queryKey: queryKeys.accounts.all,
    queryFn: () => getAllAccounts(),
    staleTime: Infinity,
  });
};

/**
 * Hook to get a single account by ID
 */
export const useAccount = (id: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    return dataStore.subscribe(() => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts.byId(id) });
      }
    });
  }, [queryClient, id]);

  return useQuery({
    queryKey: queryKeys.accounts.byId(id || ''),
    queryFn: () => (id ? getAccountById(id) : undefined),
    enabled: !!id,
    staleTime: Infinity,
  });
};

/**
 * Hook to create an account
 */
export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountInput: Partial<Account>) => {
      return Promise.resolve(createAccount(accountInput));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
};

/**
 * Hook to update an account
 */
export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Account> }) => {
      return Promise.resolve(updateAccount(id, updates));
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.byId(id) });
    },
  });
};

/**
 * Hook to delete an account
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      deleteAccount(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

/**
 * Hook to delete a calendar from an account
 */
export const useDeleteCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, calendarId }: { accountId: string; calendarId: string }) => {
      deleteCalendar(accountId, calendarId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

/**
 * Hook to reorder accounts via drag-and-drop
 */
export const useReorderAccounts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ activeId, overId }: { activeId: string; overId: string }) => {
      reorderAccounts(activeId, overId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
};

/**
 * Hook to reorder calendars within an account via drag-and-drop
 */
export const useReorderCalendars = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      activeId,
      overId,
    }: {
      accountId: string;
      activeId: string;
      overId: string;
    }) => {
      reorderCalendars(accountId, activeId, overId);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
};

/**
 * Hook to add a calendar to an account
 */
export const useAddCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      calendarData,
    }: {
      accountId: string;
      calendarData: Partial<Calendar>;
    }) => {
      addCalendar(accountId, calendarData);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
};
