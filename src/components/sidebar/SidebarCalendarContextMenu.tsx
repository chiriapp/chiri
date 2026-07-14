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
  const account = accounts.find((a) => a.id === accountId);
  const isLocal = !account?.caldav;
  const isSyncing = syncingCalendarId === calendarId;

  return (
    <>
      {!isLocal && (
        <>
          <button
            type="button"
            onClick={() => {
              onClose();
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
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
              isSyncing
                ? 'cursor-not-allowed text-surface-400 dark:text-surface-500'
                : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'motion-safe:animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>

          <div className="border-surface-200 border-t dark:border-surface-700" />
        </>
      )}

      <button
        type="button"
        onClick={() => {
          if (accountId) {
            onEditCalendar(calendarId, accountId);
          }
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-700 outline-hidden hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-300 dark:hover:bg-surface-700"
      >
        <Edit2 className="h-4 w-4" />
        Edit Calendar
      </button>

      <div className="border-surface-200 border-t dark:border-surface-700" />

      <button
        type="button"
        onClick={() => {
          onExportCalendar(calendarId);
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-700 outline-hidden hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-300 dark:hover:bg-surface-700"
      >
        <Share2 className="h-4 w-4" />
        Export Tasks
      </button>

      <div className="border-surface-200 border-t dark:border-surface-700" />

      <button
        type="button"
        onClick={async () => {
          onClose();
          if (accountId) {
            await onDeleteCalendar(calendarId, accountId);
          }
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-semantic-error text-sm outline-hidden hover:bg-semantic-error/15 focus-visible:ring-2 focus-visible:ring-semantic-error focus-visible:ring-inset"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </>
  );
};
