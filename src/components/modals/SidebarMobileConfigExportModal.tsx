import { MobileConfigExportModal } from '$components/modals/MobileConfigExportModal';
import type { Account } from '$types';

interface SidebarMobileConfigExportModalProps {
  accountId: string | null;
  accounts: Account[];
  onConfirm: (includePassword: boolean) => void;
  onClose: () => void;
}

export const SidebarMobileConfigExportModal = ({
  accountId,
  accounts,
  onConfirm,
  onClose,
}: SidebarMobileConfigExportModalProps) => {
  if (!accountId) return null;

  const account = accounts.find((candidate) => candidate.id === accountId);
  if (!account) return null;

  return <MobileConfigExportModal account={account} onConfirm={onConfirm} onClose={onClose} />;
};
