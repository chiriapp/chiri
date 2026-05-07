import { useSortable } from '@dnd-kit/sortable';
import ChevronDown from 'lucide-react/icons/chevron-down';
import MoreVertical from 'lucide-react/icons/more-vertical';
import Plus from 'lucide-react/icons/plus';
import { SidebarCalendarList } from '$components/sidebar/SidebarCalendarList';
import { Tooltip } from '$components/Tooltip';
import { getIconByName } from '$constants/icons';
import type { Account, CalendarSortConfig, Task } from '$types';

export interface SidebarAccountItemProps {
  account: Account;
  tasks: Task[];
  expandedAccounts: Set<string>;
  activeCalendarId: string | null;
  contextMenu: { type: string; id: string; accountId?: string } | null;
  isAnyModalOpen: boolean;
  isAnyAccountDragging?: boolean;
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
    ? ({ ...attributes, ...listeners } as React.HTMLAttributes<HTMLDivElement>)
    : undefined;

  return (
    <div
      ref={sortable ? setNodeRef : undefined}
      style={sortable ? { transform: transformStr } : undefined}
      data-context-menu
      className={isDragging ? 'opacity-50' : ''}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: Account toggle div contains icon+text layout that button element can't replicate */}
      <div
        onClick={() => onToggleAccount(account.id)}
        onKeyDown={(e) => e.key === 'Enter' && onToggleAccount(account.id)}
        onContextMenu={(e) => onContextMenu(e, 'account', account.id)}
        role="button"
        tabIndex={0}
        className={`relative w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors group cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
          contextMenu?.type === 'account' && contextMenu.id === account.id
            ? 'bg-surface-200 dark:bg-surface-700'
            : !isAnyModalOpen && !isAnyAccountDragging
              ? 'hover:bg-surface-200 dark:hover:bg-surface-700'
              : ''
        } ${isAnyAccountDragging && !isDragging ? 'pointer-events-none' : ''}`}
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
        <span className="flex-1 text-left truncate min-w-0 text-surface-600 dark:text-surface-400 group-hover:pr-2">
          {account.name}
        </span>
        <div
          className={`flex items-center gap-1 w-0 overflow-hidden focus-within:w-auto transition-all ${!isDragging && !isAnyAccountDragging ? 'group-hover:w-auto' : ''}`}
        >
          <Tooltip content="Add a new calendar" position="top">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCreateCalendar(account.id);
              }}
              onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu(e, 'account', account.id);
              }}
              className={`p-1.5 rounded-sm bg-transparent ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-600 dark:hover:text-surface-300' : ''} text-surface-400 transition-colors shrink-0 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Account menu" position="top">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onContextMenu(e as React.MouseEvent<HTMLButtonElement>, 'account', account.id);
              }}
              onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu(e, 'account', account.id);
              }}
              className="p-1.5 rounded-sm bg-transparent hover:bg-surface-300 dark:hover:bg-surface-600 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors shrink-0 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {!isDragging && (
        <div
          className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-in-out ${expandedAccounts.has(account.id) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
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
