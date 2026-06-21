/**
 * TanStack Query hooks for accounts and calendars
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '$lib/queryClient';
import { dataStore } from '$lib/store';
import { createAccount, deleteAccount, getAllAccounts, updateAccount } from '$lib/store/accounts';
import { addCalendar } from '$lib/store/calendars';
import { moveItem } from '$lib/store/reorder';
import { reorderAccounts } from '$lib/store/reorder/accounts';
import { reorderCalendars } from '$lib/store/reorder/calendars';
import type { Account, Calendar } from '$types';

/**
 * hook to get all accounts
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
 * hook to create an account
 */
export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountInput: Partial<Account>) => {
      return createAccount(accountInput);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
};

/**
 * hook to update an account
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
 * hook to delete an account
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
 * hook to reorder accounts via drag-and-drop
 */
export const useReorderAccounts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: ({ activeId, overId }: { activeId: string; overId: string }) => {
      queryClient.setQueryData<Account[]>(queryKeys.accounts.all, (accounts) => {
        if (!accounts) return accounts;
        return moveItem(accounts, activeId, overId) ?? accounts;
      });
    },
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
 * hook to reorder calendars within an account via drag-and-drop
 */
export const useReorderCalendars = () => {
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: ({
      accountId,
      activeId,
      overId,
    }: {
      accountId: string;
      activeId: string;
      overId: string;
    }) => {
      queryClient.setQueryData<Account[]>(queryKeys.accounts.all, (accounts) => {
        if (!accounts) return accounts;

        return accounts.map((account) => {
          if (account.id !== accountId) return account;
          const calendars = moveItem(account.calendars, activeId, overId);
          return calendars ? { ...account, calendars } : account;
        });
      });
    },
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
 * hook to add a calendar to an account
 */
export const useAddCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      calendarData,
    }: {
      accountId: string;
      calendarData: Partial<Calendar>;
    }) => {
      await addCalendar(accountId, calendarData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
};
