import { emit } from '@tauri-apps/api/event';
import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Edit2 from 'lucide-react/icons/edit-2';
import Plus from 'lucide-react/icons/plus';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Share2 from 'lucide-react/icons/share-2';
import Trash2 from 'lucide-react/icons/trash-2';
import { toastManager } from '$hooks/useToast';
import type { Account } from '$types/index';
import { MENU_EVENTS } from '$utils/menu';

interface ContextMenuState {
  type: 'account' | 'calendar' | 'tag' | 'accounts-section';
  id: string;
  accountId?: string;
  x: number;
  y: number;
}

interface SidebarContextMenuProps {
  contextMenu: ContextMenuState;
  accounts: Account[];
  syncingCalendarId: string | null;
  syncCalendar: (calendarId: string) => Promise<void>;
  onClose: () => void;
  onEditAccount: (account: Account) => void;
  onEditCalendar: (calendarId: string, accountId: string) => void;
  onEditTag: (tagId: string) => void;
  onCreateCalendar: (accountId: string) => void;
  onExportCalendar: (calendarId: string) => void;
  onExportAccount: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => Promise<void>;
  onDeleteCalendar: (calendarId: string, accountId: string) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const SidebarContextMenu = ({
  contextMenu,
  accounts,
  syncingCalendarId,
  syncCalendar,
  onClose,
  onEditAccount,
  onEditCalendar,
  onEditTag,
  onCreateCalendar,
  onExportCalendar,
  onExportAccount,
  onDeleteAccount,
  onDeleteCalendar,
  onDeleteTag,
  onExpandAll,
  onCollapseAll,
}: SidebarContextMenuProps) => {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Context menu container uses stopPropagation to prevent backdrop close
    // biome-ignore lint/a11y/useKeyWithClickEvents: Context menu container uses stopPropagation to prevent backdrop close
    <div
      data-context-menu-content
      className="fixed bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 z-50 animate-scale-in min-w-[6rem]"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      {contextMenu.type === 'account' && (
        <>
          {(() => {
            const account = accounts.find((a) => a.id === contextMenu.id);
            const isAccountSyncing = account?.calendars.some((c) => c.id === syncingCalendarId);
            return (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (account) {
                    for (const calendar of account.calendars) {
                      syncCalendar(calendar.id).catch((error) => {
                        const errorMessage =
                          error instanceof Error ? error.message : 'Unknown error';
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
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isAccountSyncing
                    ? 'text-surface-400 dark:text-surface-500 cursor-not-allowed'
                    : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isAccountSyncing ? 'animate-spin' : ''}`} />
                {isAccountSyncing ? 'Syncing...' : 'Sync'}
              </button>
            );
          })()}

          <div className="border-t border-surface-200 dark:border-surface-700" />

          <button
            type="button"
            onClick={() => {
              onCreateCalendar(contextMenu.id);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            <Plus className="w-4 h-4" />
            New Calendar
          </button>

          <div className="border-t border-surface-200 dark:border-surface-700" />

          <button
            type="button"
            onClick={() => {
              const account = accounts.find((a) => a.id === contextMenu.id);
              if (account) {
                onEditAccount(account);
              }
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            <Edit2 className="w-4 h-4" />
            Edit Account
          </button>

          <div className="border-t border-surface-200 dark:border-surface-700" />

          <button
            type="button"
            onClick={() => {
              onExportAccount(contextMenu.id);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            <Share2 className="w-4 h-4" />
            Export Calendars
          </button>

          <div className="border-t border-surface-200 dark:border-surface-700" />

          <button
            type="button"
            onClick={async () => {
              onClose();
              await onDeleteAccount(contextMenu.id);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        </>
      )}

      {contextMenu.type === 'calendar' && (
        <>
          <button
            type="button"
            onClick={() => {
              onClose();
              const account = accounts.find((a) => a.id === contextMenu.accountId);
              const calendar = account?.calendars.find((c) => c.id === contextMenu.id);
              syncCalendar(contextMenu.id).catch((error) => {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                toastManager.error(
                  `Calendar sync failed: ${calendar?.displayName || 'Unknown'}`,
                  errorMessage,
                  `sync-error-calendar-${contextMenu.id}`,
                  {
                    label: 'Edit Account',
                    onClick: () => {
                      emit(MENU_EVENTS.EDIT_ACCOUNT, { accountId: account?.id });
                    },
                  },
                );
              });
            }}
            disabled={syncingCalendarId === contextMenu.id}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
              syncingCalendarId === contextMenu.id
                ? 'text-surface-400 dark:text-surface-500 cursor-not-allowed'
                : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 ${syncingCalendarId === contextMenu.id ? 'animate-spin' : ''}`}
            />
            {syncingCalendarId === contextMenu.id ? 'Syncing...' : 'Sync'}
          </button>

          <div className="border-t border-surface-200 dark:border-surface-700" />

          <button
            type="button"
            onClick={() => {
              if (contextMenu.accountId) {
                onEditCalendar(contextMenu.id, contextMenu.accountId);
              }
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            <Edit2 className="w-4 h-4" />
            Edit Calendar
          </button>

          <div className="border-t border-surface-200 dark:border-surface-700" />

          <button
            type="button"
            onClick={() => {
              onExportCalendar(contextMenu.id);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            <Share2 className="w-4 h-4" />
            Export Tasks
          </button>

          <div className="border-t border-surface-200 dark:border-surface-700" />

          <button
            type="button"
            onClick={async () => {
              onClose();
              if (contextMenu.accountId) {
                await onDeleteCalendar(contextMenu.id, contextMenu.accountId);
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </>
      )}

      {contextMenu.type === 'accounts-section' && (
        <>
          <button
            type="button"
            onClick={() => {
              onExpandAll();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-t-md"
          >
            <ChevronDown className="w-4 h-4" />
            Expand All
          </button>

          <div className="border-t border-surface-200 dark:border-surface-700" />

          <button
            type="button"
            onClick={() => {
              onCollapseAll();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            <ChevronRight className="w-4 h-4" />
            Collapse All
          </button>
        </>
      )}

      {contextMenu.type === 'tag' && (
        <>
          <button
            type="button"
            onClick={() => {
              onEditTag(contextMenu.id);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            <Edit2 className="w-4 h-4" />
            Edit Tag
          </button>

          <div className="border-t border-surface-200 dark:border-surface-700" />

          <button
            type="button"
            onClick={async () => {
              onClose();
              await onDeleteTag(contextMenu.id);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </>
      )}
    </div>
  );
};
