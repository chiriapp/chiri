import { createElement, useCallback } from 'react';
import { ColoredItemLabel } from '$components/ColoredItemLabel';
import { useConfirmDialog } from '$context/confirmDialogContext';
import { useDeleteAccount } from '$hooks/queries/useAccounts';
import { loggers } from '$lib/logger';
import { disablePushForCalendar } from '$lib/push';
import type { Account } from '$types/account';

const log = loggers.deleteHandlers;

export const useAccountDeletion = () => {
  const deleteAccountMutation = useDeleteAccount();
  const { confirm, close } = useConfirmDialog();

  const deleteAccount = useCallback(
    async (accountId: string, accounts: Account[]) => {
      const account = accounts.find((a) => a.id === accountId);

      const confirmed = await confirm({
        title: 'Remove account',
        subtitle: account
          ? createElement(ColoredItemLabel, {
              name: account.name,
              icon: account.icon,
              emoji: account.emoji,
              defaultIcon: 'user',
              useAccentColor: false,
            })
          : undefined,
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

      const deletion = deleteAccountMutation.mutateAsync(accountId);
      close();
      await deletion;
      return true;
    },
    [close, confirm, deleteAccountMutation],
  );

  return { deleteAccount };
};
