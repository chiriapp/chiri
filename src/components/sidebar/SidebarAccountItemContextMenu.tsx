import { emit } from '@tauri-apps/api/event';
import Edit2 from 'lucide-react/icons/edit-2';
import Plus from 'lucide-react/icons/plus';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Share2 from 'lucide-react/icons/share-2';
import Trash2 from 'lucide-react/icons/trash-2';
import { MENU_EVENTS } from '$constants/menu';
import { toastManager } from '$hooks/ui/useToast';
import type { Account } from '$types';

interface SidebarAccountItemContextMenuProps {
  accountId: string;
  accounts: Account[];
  syncingCalendarId: string | null;
  syncCalendar: (calendarId: string) => Promise<void>;
  onClose: () => void;
  onEditAccount: (account: Account) => void;
  onCreateCalendar: (accountId: string) => void;
  onExportAccount: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => Promise<void>;
}

export const SidebarAccountItemContextMenu = ({
  accountId,
  accounts,
  syncingCalendarId,
  syncCalendar,
  onClose,
  onEditAccount,
  onCreateCalendar,
  onExportAccount,
  onDeleteAccount,
}: SidebarAccountItemContextMenuProps) => {
  const account = accounts.find((a) => a.id === accountId);
  const isAccountSyncing = account?.calendars.some((c) => c.id === syncingCalendarId);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onClose();
          if (account) {
            for (const calendar of account.calendars) {
              syncCalendar(calendar.id).catch((error) => {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                toastManager.error(
                  `Calendar sync failed: ${calendar.displayName || 'Unknown'}`,
                  errorMessage,
                  `sync-error-calendar-${calendar.id}`,
                  {
                    label: 'Edit Account',
                    onClick: () => {
                      emit(MENU_EVENTS.EDIT_ACCOUNT, { accountId: account.id });
                    },
                  },
                );
              });
            }
          }
        }}
        disabled={isAccountSyncing}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
          isAccountSyncing
            ? 'text-surface-400 dark:text-surface-500 cursor-not-allowed'
            : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
        }`}
      >
        <RefreshCw className={`w-4 h-4 ${isAccountSyncing ? 'animate-spin' : ''}`} />
        {isAccountSyncing ? 'Syncing...' : 'Sync'}
      </button>

      <div className="border-t border-surface-200 dark:border-surface-700" />

      <button
        type="button"
        onClick={() => {
          onCreateCalendar(accountId);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
      >
        <Plus className="w-4 h-4" />
        New Calendar
      </button>

      <div className="border-t border-surface-200 dark:border-surface-700" />

      <button
        type="button"
        onClick={() => {
          if (account) {
            onEditAccount(account);
          }
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
      >
        <Edit2 className="w-4 h-4" />
        Edit Account
      </button>

      <div className="border-t border-surface-200 dark:border-surface-700" />

      <button
        type="button"
        onClick={() => {
          onExportAccount(accountId);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
      >
        <Share2 className="w-4 h-4" />
        Export Calendars
      </button>

      <div className="border-t border-surface-200 dark:border-surface-700" />

      <button
        type="button"
        onClick={async () => {
          onClose();
          await onDeleteAccount(accountId);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-semantic-error hover:bg-semantic-error/15 outline-hidden focus-visible:ring-2 focus-visible:ring-semantic-error focus-visible:ring-inset"
      >
        <Trash2 className="w-4 h-4" />
        Remove
      </button>
    </>
  );
};
