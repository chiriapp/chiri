import { useCallback } from 'react';
import { useConfirmDialog } from '$context/confirmDialogContext';
import { useDeleteAccount } from '$hooks/queries/useAccounts';
import { loggers } from '$lib/logger';
import { disablePushForCalendar } from '$lib/push';
import type { Account } from '$types';

const log = loggers.deleteHandlers;

export const useAccountDeletion = () => {
  const deleteAccountMutation = useDeleteAccount();
  const { confirm, close } = useConfirmDialog();

  const deleteAccount = useCallback(
    async (accountId: string, accounts: Account[]) => {
      const account = accounts.find((a) => a.id === accountId);

      const confirmed = await confirm({
        title: 'Remove account',
        subtitle: account?.name,
        message:
          'Are you sure? All tasks from this account will be removed from the app. They will remain on the server.',
        confirmLabel: 'Remove',
        cancelLabel: 'Cancel',
        destructive: true,
      });
      if (!confirmed) return false;

      if (account) {
        for (const calendar of account.calendars) {
          try {
            await disablePushForCalendar(accountId, calendar.id);
          } catch (error) {
            log.warn('Failed to disable push before deleting account calendar:', error);
          }
        }
      }

      deleteAccountMutation.mutate(accountId);
      close();
      return true;
    },
    [close, confirm, deleteAccountMutation],
  );

  return { deleteAccount };
};
