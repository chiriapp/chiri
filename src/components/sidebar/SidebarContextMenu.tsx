import { createPortal } from 'react-dom';
import { SidebarAccountItemContextMenu } from '$components/sidebar/SidebarAccountItemContextMenu';
import { SidebarAccountsContextMenu } from '$components/sidebar/SidebarAccountsContextMenu';
import { SidebarCalendarContextMenu } from '$components/sidebar/SidebarCalendarContextMenu';
import { SidebarTagItemContextMenu } from '$components/sidebar/SidebarTagItemContextMenu';
import type { Account } from '$types';

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
  return createPortal(
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Context menu backdrop for closing on outside click */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Context menu backdrop for closing on outside click */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* biome-ignore lint/a11y/noStaticElementInteractions: Context menu container uses stopPropagation to prevent backdrop close */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Context menu container uses stopPropagation to prevent backdrop close */}
      <div
        data-context-menu-content
        className="fixed bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 z-50 animate-scale-in min-w-24"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {contextMenu.type === 'account' && (
          <SidebarAccountItemContextMenu
            accountId={contextMenu.id}
            accounts={accounts}
            syncingCalendarId={syncingCalendarId}
            syncCalendar={syncCalendar}
            onClose={onClose}
            onEditAccount={onEditAccount}
            onCreateCalendar={onCreateCalendar}
            onExportAccount={onExportAccount}
            onDeleteAccount={onDeleteAccount}
          />
        )}

        {contextMenu.type === 'calendar' && (
          <SidebarCalendarContextMenu
            calendarId={contextMenu.id}
            accountId={contextMenu.accountId}
            accounts={accounts}
            syncingCalendarId={syncingCalendarId}
            syncCalendar={syncCalendar}
            onClose={onClose}
            onEditCalendar={onEditCalendar}
            onExportCalendar={onExportCalendar}
            onDeleteCalendar={onDeleteCalendar}
          />
        )}

        {contextMenu.type === 'accounts-section' && (
          <SidebarAccountsContextMenu
            onClose={onClose}
            onExpandAll={onExpandAll}
            onCollapseAll={onCollapseAll}
          />
        )}

        {contextMenu.type === 'tag' && (
          <SidebarTagItemContextMenu
            tagId={contextMenu.id}
            onClose={onClose}
            onEditTag={onEditTag}
            onDeleteTag={onDeleteTag}
          />
        )}
      </div>
    </>,
    document.body,
  );
};
