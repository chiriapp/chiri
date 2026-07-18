import { useSortable } from '@dnd-kit/sortable';
import ChevronDown from 'lucide-react/icons/chevron-down';
import MoreVertical from 'lucide-react/icons/more-vertical';
import Plus from 'lucide-react/icons/plus';
import type { HTMLAttributes, MouseEvent } from 'react';
import { SidebarAccountItemDisconnectedIndicator } from '$components/sidebar/SidebarAccountItemDisconnectedIndicator';
import { SidebarCalendarList } from '$components/sidebar/SidebarCalendarList';
import { Tooltip } from '$components/Tooltip';
import { getIconByName } from '$constants/icons';
import type { Account, Task } from '$types';
import type { CalendarSortConfig } from '$types/sort';

interface SidebarAccountItemProps {
  account: Account;
  tasks: Task[];
  expandedAccounts: Set<string>;
  activeCalendarId: string | null;
  contextMenu: {
    type: string;
    id: string;
    accountId?: string;
    source?: 'account-menu-trigger';
  } | null;
  isAnyModalOpen: boolean;
  isAnyAccountDragging?: boolean;
  isAccountMenuTriggerActive?: boolean;
  showTaskCounts: boolean;
  calendarSortConfig: CalendarSortConfig;
  sortable?: boolean;
  onToggleAccount: (accountId: string) => void;
  onSelectCalendar: (accountId: string, calendarId: string) => void;
  onCreateCalendar: (accountId: string) => void;
  onContextMenu: (
    e: MouseEvent,
    type: 'account' | 'calendar' | 'tag' | 'accounts-section',
    id: string,
    accountId?: string,
  ) => void;
}

export const SidebarAccountItem = ({
  account,
  tasks,
  expandedAccounts,
  activeCalendarId,
  contextMenu,
  isAnyModalOpen,
  isAnyAccountDragging,
  isAccountMenuTriggerActive = false,
  showTaskCounts,
  calendarSortConfig,
  sortable = false,
  onToggleAccount,
  onSelectCalendar,
  onCreateCalendar,
  onContextMenu,
}: SidebarAccountItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: account.id,
    disabled: !sortable,
  });
  const AccountIcon = getIconByName(account.icon ?? 'user');
  const transformStr = sortable && transform ? `translate3d(0, ${transform.y}px, 0)` : undefined;
  const dragHandleProps = sortable
    ? ({ ...attributes, ...listeners } as HTMLAttributes<HTMLButtonElement>)
    : undefined;
  const isAccountContextMenuOpen = contextMenu?.type === 'account' && contextMenu.id === account.id;
  const isAccountMenuButtonContextMenuOpen =
    isAccountContextMenuOpen && contextMenu.source === 'account-menu-trigger';
  const isAccountMenuButtonActive =
    isAccountMenuButtonContextMenuOpen || isAccountMenuTriggerActive;
  const isAccountActionsActive = isAccountContextMenuOpen || isAccountMenuTriggerActive;
  const isExpanded = expandedAccounts.has(account.id);
  const canRevealActions = !isDragging && !isAnyAccountDragging;
  const actionVisibilityClass =
    canRevealActions && isAccountActionsActive
      ? 'opacity-100 pointer-events-auto'
      : `opacity-0 pointer-events-none ${
          canRevealActions
            ? 'group-hover/account-row:opacity-100 group-hover/account-row:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto'
            : ''
        }`;
  const accountMenuButtonStateClass = isAccountMenuButtonActive
    ? 'bg-surface-300 dark:bg-surface-600 text-surface-600 dark:text-surface-300'
    : 'bg-transparent text-surface-400 hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-600 dark:hover:text-surface-300';

  return (
    <div
      ref={sortable ? setNodeRef : undefined}
      style={sortable ? { transform: transformStr } : undefined}
      data-context-menu
      className={isDragging ? 'opacity-50' : ''}
    >
      <div
        className={`group/account-row relative flex items-center gap-1 ${isAnyAccountDragging && !isDragging ? 'pointer-events-none' : ''}`}
      >
        <button
          type="button"
          onClick={() => onToggleAccount(account.id)}
          onContextMenu={(e) => onContextMenu(e, 'account', account.id)}
          className={`flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
            isAccountContextMenuOpen && !isAccountMenuButtonContextMenuOpen
              ? 'bg-surface-200 dark:bg-surface-700'
              : !isAnyModalOpen && !isAnyAccountDragging
                ? 'hover:bg-surface-200 dark:hover:bg-surface-700'
                : ''
          }`}
          {...dragHandleProps}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-surface-400 motion-safe:transition-transform motion-safe:duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
          />
          {account.emoji ? (
            <span className="w-4 shrink-0 text-center text-xs leading-none">{account.emoji}</span>
          ) : (
            <AccountIcon className="h-4 w-4 shrink-0 text-surface-500 dark:text-surface-400" />
          )}
          <div className="flex min-w-0 flex-1 items-center overflow-hidden">
            <span className="truncate pr-2 text-left text-sm text-surface-600 dark:text-surface-400">
              {account.name}
            </span>
            <SidebarAccountItemDisconnectedIndicator
              accountId={account.id}
              isCalDAV={!!account.caldav}
            />
          </div>
        </button>

        <div
          className={`flex h-9 w-17 shrink-0 items-center justify-end gap-1 overflow-hidden transition-opacity ${actionVisibilityClass}`}
        >
          <Tooltip content="Add a new calendar" position="top">
            <button
              type="button"
              onClick={() => {
                onCreateCalendar(account.id);
              }}
              onContextMenu={(e) => {
                onContextMenu(e, 'account', account.id);
              }}
              className={`flex h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-transparent ${!isAnyModalOpen ? 'hover:bg-surface-300 hover:text-surface-600 dark:hover:bg-surface-600 dark:hover:text-surface-300' : ''} text-surface-400 outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content="Account menu" position="top">
            <button
              type="button"
              data-account-menu-trigger={account.id}
              aria-expanded={isAccountMenuButtonContextMenuOpen}
              aria-haspopup="menu"
              onClick={(e) => {
                onContextMenu(e, 'account', account.id);
              }}
              onContextMenu={(e) => {
                onContextMenu(e, 'account', account.id);
              }}
              className={`flex h-9 w-8 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${accountMenuButtonStateClass}`}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {!isDragging && (
        <div
          className={`grid pt-1 motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="min-h-0 overflow-hidden" aria-hidden={!isExpanded} inert={!isExpanded}>
            <SidebarCalendarList
              account={account}
              tasks={tasks}
              activeCalendarId={activeCalendarId}
              contextMenu={contextMenu}
              isAnyModalOpen={isAnyModalOpen}
              isAnyAccountDragging={isAnyAccountDragging ?? false}
              showTaskCounts={showTaskCounts}
              calendarSortConfig={calendarSortConfig}
              onContextMenu={(e, type, id, accountId) => onContextMenu(e, type, id, accountId)}
              onSelectCalendar={onSelectCalendar}
            />
          </div>
        </div>
      )}
    </div>
  );
};
