import type { MouseEventHandler } from 'react';
import { SidebarContextMenu } from '$components/sidebar/SidebarContextMenu';
import type { SyncTrigger } from '$hooks/queries/useSync';
import type { Account } from '$types/account';

export type SidebarContextMenuState = {
  type: 'account' | 'calendar' | 'tag' | 'filter' | 'accounts-section';
  id: string;
  accountId?: string;
  source?: 'account-menu-trigger';
  x: number;
  y: number;
} | null;

export interface SidebarContextMenuOverlayProps {
  contextMenu: SidebarContextMenuState;
  accounts: Account[];
  syncingCalendarId: string | null;
  testingAccountIds: Readonly<Record<string, true>>;
  onCloseContextMenu: () => void;
  onPointerCloseContextMenu: MouseEventHandler<HTMLDivElement>;
  syncCalendar: (calendarId: string, trigger?: SyncTrigger) => Promise<void>;
  onEditAccount: (account: Account) => void;
  onTestConnection: (account: Account) => void;
  onEditCalendar: (calendarId: string, accountId: string) => void;
  onEditTag: (tagId: string) => void;
  onCreateCalendar: (accountId: string) => void;
  onExportCalendar: (calendarId: string) => void;
  onExportAccount: (accountId: string) => void;
  onMobileConfigExport: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => Promise<void>;
  onDeleteCalendar: (calendarId: string, accountId: string) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
  onEditFilter: (filterId: string) => void;
  onDeleteFilter: (filterId: string) => Promise<void>;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const SidebarContextMenuOverlay = ({
  contextMenu,
  accounts,
  syncingCalendarId,
  testingAccountIds,
  onCloseContextMenu,
  onPointerCloseContextMenu,
  syncCalendar,
  onEditAccount,
  onTestConnection,
  onEditCalendar,
  onEditTag,
  onCreateCalendar,
  onExportCalendar,
  onExportAccount,
  onMobileConfigExport,
  onDeleteAccount,
  onDeleteCalendar,
  onDeleteTag,
  onEditFilter,
  onDeleteFilter,
  onExpandAll,
  onCollapseAll,
}: SidebarContextMenuOverlayProps) => {
  if (!contextMenu) return null;

  return (
    <SidebarContextMenu
      contextMenu={contextMenu}
      accounts={accounts}
      syncingCalendarId={syncingCalendarId}
      testingAccountIds={testingAccountIds}
      syncCalendar={syncCalendar}
      onClose={onCloseContextMenu}
      onPointerClose={onPointerCloseContextMenu}
      onEditAccount={onEditAccount}
      onTestConnection={onTestConnection}
      onEditCalendar={onEditCalendar}
      onEditTag={onEditTag}
      onCreateCalendar={onCreateCalendar}
      onExportCalendar={onExportCalendar}
      onExportAccount={onExportAccount}
      onMobileConfigExport={onMobileConfigExport}
      onDeleteAccount={onDeleteAccount}
      onDeleteCalendar={onDeleteCalendar}
      onDeleteTag={onDeleteTag}
      onEditFilter={onEditFilter}
      onDeleteFilter={onDeleteFilter}
      onExpandAll={onExpandAll}
      onCollapseAll={onCollapseAll}
    />
  );
};
