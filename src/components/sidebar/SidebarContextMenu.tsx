import type { MouseEventHandler } from 'react';
import { FloatingLayerFrame } from '$components/FloatingLayerFrame';
import { SidebarAccountItemContextMenu } from '$components/sidebar/SidebarAccountItemContextMenu';
import { SidebarAccountsContextMenu } from '$components/sidebar/SidebarAccountsContextMenu';
import { SidebarCalendarContextMenu } from '$components/sidebar/SidebarCalendarContextMenu';
import { SidebarFilterItemContextMenu } from '$components/sidebar/SidebarFilterItemContextMenu';
import { SidebarTagItemContextMenu } from '$components/sidebar/SidebarTagItemContextMenu';
import type { Account } from '$types';

interface ContextMenuState {
  type: 'account' | 'calendar' | 'tag' | 'filter' | 'accounts-section';
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
  onPointerClose?: MouseEventHandler<HTMLDivElement>;
  onEditAccount: (account: Account) => void;
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

export const SidebarContextMenu = ({
  contextMenu,
  accounts,
  syncingCalendarId,
  syncCalendar,
  onClose,
  onPointerClose,
  onEditAccount,
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
}: SidebarContextMenuProps) => {
  return (
    <FloatingLayerFrame
      anchor={{ type: 'point', x: contextMenu.x, y: contextMenu.y }}
      onClose={onClose}
      onPointerClose={onPointerClose}
      pointerCloseCursorBehavior={onPointerClose ? 'none' : undefined}
      layerType="context-menu"
      layerClassName="z-50 min-w-24"
      fallbackWidth={96}
      dataAttribute="data-context-menu-content"
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
          onMobileConfigExport={onMobileConfigExport}
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

      {contextMenu.type === 'filter' && (
        <SidebarFilterItemContextMenu
          filterId={contextMenu.id}
          onClose={onClose}
          onEditFilter={onEditFilter}
          onDeleteFilter={onDeleteFilter}
        />
      )}
    </FloatingLayerFrame>
  );
};
