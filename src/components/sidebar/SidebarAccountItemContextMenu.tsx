import { emit } from '@tauri-apps/api/event';
import Download from 'lucide-react/icons/download';
import Edit2 from 'lucide-react/icons/edit-2';
import Plus from 'lucide-react/icons/plus';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Share2 from 'lucide-react/icons/share-2';
import Trash2 from 'lucide-react/icons/trash-2';
import { MENU_EVENTS } from '$constants/menu';
import { toastManager } from '$lib/toastManager';
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
  onMobileConfigExport: (accountId: string) => void;
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
  onMobileConfigExport,
  onDeleteAccount,
}: SidebarAccountItemContextMenuProps) => {
  const account = accounts.find((a) => a.id === accountId);
  const isAccountSyncing = account?.calendars.some((c) => c.id === syncingCalendarId);

  const isLocal = !account?.caldav;

  return (
    <>
      {!isLocal && (
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
                      {
                        groupKey: `sync-error-calendar-${calendar.id}`,
                        action: {
                          label: 'Edit Account',
                          onClick: () => {
                            emit(MENU_EVENTS.EDIT_ACCOUNT, { accountId: account.id });
                          },
                        },
                      },
                    );
                  });
                }
              }
            }}
            disabled={isAccountSyncing}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
              isAccountSyncing
                ? 'cursor-not-allowed text-surface-400 dark:text-surface-500'
                : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700'
            }`}
          >
            <RefreshCw
              className={`h-4 w-4 ${isAccountSyncing ? 'motion-safe:animate-spin' : ''}`}
            />
            {isAccountSyncing ? 'Syncing...' : 'Sync'}
          </button>

          <div className="border-surface-200 border-t dark:border-surface-700" />
        </>
      )}

      <button
        type="button"
        onClick={() => {
          onCreateCalendar(accountId);
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-700 outline-hidden hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-300 dark:hover:bg-surface-700"
      >
        <Plus className="h-4 w-4" />
        New Calendar
      </button>

      <div className="border-surface-200 border-t dark:border-surface-700" />

      <button
        type="button"
        onClick={() => {
          if (account) {
            onEditAccount(account);
          }
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-700 outline-hidden hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-300 dark:hover:bg-surface-700"
      >
        <Edit2 className="h-4 w-4" />
        Edit Account
      </button>

      <div className="border-surface-200 border-t dark:border-surface-700" />

      {!isLocal && (
        <>
          <button
            type="button"
            onClick={() => {
              onMobileConfigExport(accountId);
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-700 outline-hidden hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-300 dark:hover:bg-surface-700"
          >
            <Download className="h-4 w-4" />
            Export to .mobileconfig
          </button>

          <div className="border-surface-200 border-t dark:border-surface-700" />
        </>
      )}

      <button
        type="button"
        onClick={() => {
          onExportAccount(accountId);
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-700 outline-hidden hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-300 dark:hover:bg-surface-700"
      >
        <Share2 className="h-4 w-4" />
        Export Calendars
      </button>

      <div className="border-surface-200 border-t dark:border-surface-700" />

      <button
        type="button"
        onClick={async () => {
          onClose();
          await onDeleteAccount(accountId);
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-semantic-error text-sm outline-hidden hover:bg-semantic-error/15 focus-visible:ring-2 focus-visible:ring-semantic-error focus-visible:ring-inset"
      >
        <Trash2 className="h-4 w-4" />
        Remove
      </button>
    </>
  );
};
