import { useCallback } from 'react';
import { useModalState } from '$context/modalStateContext';
import { useAccountDeletion } from '$hooks/deletion/useAccountDeletion';
import { useAccounts } from '$hooks/queries/useAccounts';
import type { AppModals } from '$types/modals';

interface UseAccountCommandsOptions {
  modals: AppModals;
}

export const useAccountCommands = ({ modals }: UseAccountCommandsOptions) => {
  const { data: accounts = [] } = useAccounts();
  const { isAnyModalOpen } = useModalState();
  const { deleteAccount } = useAccountDeletion();

  const openAccount = useCallback(() => {
    if (isAnyModalOpen) return;
    modals.openAccount();
  }, [isAnyModalOpen, modals]);

  const editAccount = useCallback(
    (accountId: string, reauthorize = false) => {
      if (isAnyModalOpen && !reauthorize) return;
      const account = accounts.find((a) => a.id === accountId);
      if (!account?.caldav) return;
      modals.openAccount({
        accountId,
        reauthorize,
        layer: reauthorize ? 'above-modal' : 'default',
      });
    },
    [accounts, isAnyModalOpen, modals],
  );

  const removeAccount = useCallback(
    async (accountId: string) => {
      const account = accounts.find((a) => a.id === accountId);
      if (!account?.caldav) return;
      await deleteAccount(accountId, accounts);
    },
    [accounts, deleteAccount],
  );

  return {
    openAccount,
    editAccount,
    removeAccount,
  };
};
