import { emit } from '@tauri-apps/api/event';
import Edit2 from 'lucide-react/icons/edit-2';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Share2 from 'lucide-react/icons/share-2';
import Trash2 from 'lucide-react/icons/trash-2';
import { MENU_EVENTS } from '$constants/menu';
import { toastManager } from '$hooks/ui/useToast';
import type { Account } from '$types';

interface SidebarCalendarContextMenuProps {
  calendarId: string;
  accountId?: string;
  accounts: Account[];
  syncingCalendarId: string | null;
  syncCalendar: (calendarId: string) => Promise<void>;
  onClose: () => void;
  onEditCalendar: (calendarId: string, accountId: string) => void;
  onExportCalendar: (calendarId: string) => void;
  onDeleteCalendar: (calendarId: string, accountId: string) => Promise<void>;
}

export const SidebarCalendarContextMenu = ({
  calendarId,
  accountId,
  accounts,
  syncingCalendarId,
  syncCalendar,
  onClose,
  onEditCalendar,
  onExportCalendar,
  onDeleteCalendar,
}: SidebarCalendarContextMenuProps) => {
  const isSyncing = syncingCalendarId === calendarId;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onClose();
          const account = accounts.find((a) => a.id === accountId);
          const calendar = account?.calendars.find((c) => c.id === calendarId);
          syncCalendar(calendarId).catch((error) => {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toastManager.error(
              `Calendar sync failed: ${calendar?.displayName || 'Unknown'}`,
              errorMessage,
              `sync-error-calendar-${calendarId}`,
              {
                label: 'Edit Account',
                onClick: () => {
                  emit(MENU_EVENTS.EDIT_ACCOUNT, { accountId: account?.id });
                },
              },
            );
          });
        }}
        disabled={isSyncing}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
          isSyncing
            ? 'text-surface-400 dark:text-surface-500 cursor-not-allowed'
            : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
        }`}
      >
        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing...' : 'Sync'}
      </button>

      <div className="border-t border-surface-200 dark:border-surface-700" />

      <button
        type="button"
        onClick={() => {
          if (accountId) {
            onEditCalendar(calendarId, accountId);
          }
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
      >
        <Edit2 className="w-4 h-4" />
        Edit Calendar
      </button>

      <div className="border-t border-surface-200 dark:border-surface-700" />

      <button
        type="button"
        onClick={() => {
          onExportCalendar(calendarId);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
      >
        <Share2 className="w-4 h-4" />
        Export Tasks
      </button>

      <div className="border-t border-surface-200 dark:border-surface-700" />

      <button
        type="button"
        onClick={async () => {
          onClose();
          if (accountId) {
            await onDeleteCalendar(calendarId, accountId);
          }
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-semantic-error hover:bg-semantic-error/15 outline-hidden focus-visible:ring-2 focus-visible:ring-semantic-error focus-visible:ring-inset"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </>
  );
};
