import { useSortable } from '@dnd-kit/sortable';
import ChevronDown from 'lucide-react/icons/chevron-down';
import MoreVertical from 'lucide-react/icons/more-vertical';
import Plus from 'lucide-react/icons/plus';
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
  calendarSortConfig: CalendarSortConfig;
  sortable?: boolean;
  onToggleAccount: (accountId: string) => void;
  onSelectCalendar: (accountId: string, calendarId: string) => void;
  onCreateCalendar: (accountId: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
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
    ? ({ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>)
    : undefined;
  const isAccountContextMenuOpen = contextMenu?.type === 'account' && contextMenu.id === account.id;
  const isAccountMenuButtonContextMenuOpen =
    isAccountContextMenuOpen && contextMenu.source === 'account-menu-trigger';
  const isAccountMenuButtonActive =
    isAccountMenuButtonContextMenuOpen || isAccountMenuTriggerActive;
  const canRevealActions = !isDragging && !isAnyAccountDragging;
  const actionVisibilityClass =
    canRevealActions && isAccountMenuButtonActive
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
          className={`flex h-8 min-w-0 flex-1 items-center gap-2 px-3 rounded-lg text-sm transition-colors cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
            !isAnyModalOpen && !isAnyAccountDragging
              ? 'hover:bg-surface-200 dark:hover:bg-surface-700'
              : ''
          }`}
          {...dragHandleProps}
        >
          <ChevronDown
            className={`w-4 h-4 text-surface-400 shrink-0 motion-safe:transition-transform motion-safe:duration-200 ${expandedAccounts.has(account.id) ? 'rotate-0' : '-rotate-90'}`}
          />
          {account.emoji ? (
            <span className="w-4 text-xs leading-none text-center shrink-0">{account.emoji}</span>
          ) : (
            <AccountIcon className="w-4 h-4 text-surface-500 dark:text-surface-400 shrink-0" />
          )}
          <span className="flex-1 text-left truncate min-w-0 pr-2 text-surface-600 dark:text-surface-400">
            {account.name}
          </span>
        </button>

        <div
          className={`flex h-8 w-15 shrink-0 items-center justify-end gap-1 overflow-hidden transition-opacity ${actionVisibilityClass}`}
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
              className={`flex h-8 w-7 shrink-0 items-center justify-center rounded-lg bg-transparent ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-600 dark:hover:text-surface-300' : ''} text-surface-400 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
            >
              <Plus className="w-4 h-4" />
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
              className={`flex h-8 w-7 shrink-0 items-center justify-center rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${accountMenuButtonStateClass}`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {!isDragging && (
        <div
          className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-in-out ${expandedAccounts.has(account.id) ? 'grid-rows-[1fr] pt-1' : 'grid-rows-[0fr]'}`}
        >
          <div className="overflow-hidden min-h-0">
            <SidebarCalendarList
              account={account}
              tasks={tasks}
              activeCalendarId={activeCalendarId}
              contextMenu={contextMenu}
              isAnyModalOpen={isAnyModalOpen}
              isAnyAccountDragging={isAnyAccountDragging ?? false}
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
