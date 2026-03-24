import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Import from 'lucide-react/icons/import';
import MoreVertical from 'lucide-react/icons/more-vertical';
import Plus from 'lucide-react/icons/plus';
import User from 'lucide-react/icons/user';
import { Tooltip } from '$components/Tooltip';
import { getIconByName } from '$data/icons';
import type { Account, Task } from '$types/index';
import { getContrastTextColor } from '$utils/color';
import { FALLBACK_ITEM_COLOR } from '$utils/constants';

interface SidebarAccountsListProps {
  accounts: Account[];
  tasks: Task[];
  expandedAccounts: Set<string>;
  activeCalendarId: string | null;
  contextMenu: { type: string; id: string; accountId?: string } | null;
  isAnyModalOpen: boolean;
  accountsSectionCollapsed: boolean;
  onToggleAccountsSection: () => void;
  onContextMenu: (
    e: React.MouseEvent,
    type: 'account' | 'calendar' | 'tag' | 'accounts-section',
    id: string,
    accountId?: string,
  ) => void;
  onToggleAccount: (accountId: string) => void;
  onSelectCalendar: (accountId: string, calendarId: string) => void;
  onCreateCalendar: (accountId: string) => void;
  onOpenImport?: () => void;
  onAddAccount: () => void;
}

const isActiveTask = (t: { status: string }) =>
  t.status !== 'completed' && t.status !== 'cancelled';

export const SidebarAccountsList = ({
  accounts,
  tasks,
  expandedAccounts,
  activeCalendarId,
  contextMenu,
  isAnyModalOpen,
  accountsSectionCollapsed,
  onToggleAccountsSection,
  onContextMenu,
  onToggleAccount,
  onSelectCalendar,
  onCreateCalendar,
  onOpenImport,
  onAddAccount,
}: SidebarAccountsListProps) => {
  const getTaskCount = (calendarId: string) =>
    tasks.filter((t) => t.calendarId === calendarId && isActiveTask(t)).length;

  return (
    <div>
      {/* biome-ignore lint/a11y/useSemanticElements: Section header toggle div contains icon+text layout that button element can't replicate */}
      <div
        onClick={onToggleAccountsSection}
        onKeyDown={(e) => e.key === 'Enter' && onToggleAccountsSection()}
        onContextMenu={(e) => onContextMenu(e, 'accounts-section', 'accounts')}
        role="button"
        tabIndex={0}
        className="flex items-center justify-between px-3.5 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
      >
        <div className="flex items-center gap-1.5">
          {accountsSectionCollapsed ? (
            <ChevronRight className="w-4 h-4 text-surface-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-surface-400" />
          )}
          <span className="text-sm font-semibold text-surface-500 dark:text-surface-400 tracking-wider">
            Accounts
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip content="Import tasks" position="top">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenImport?.();
              }}
              className={`p-1 rounded ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''} text-surface-500 dark:text-surface-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
            >
              <Import className="w-4 h-4" />
            </button>
          </Tooltip>

          <Tooltip content="Add account" position="top">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddAccount();
              }}
              className={`p-1 rounded ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''} text-surface-500 dark:text-surface-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {!accountsSectionCollapsed &&
        (accounts.length === 0 ? (
          <div className="px-4 py-3 text-sm text-surface-500 dark:text-surface-400">
            No accounts connected yet.
          </div>
        ) : (
          accounts.map((account) => (
            <div key={account.id} data-context-menu>
              {/* biome-ignore lint/a11y/useSemanticElements: Account toggle div contains icon+text layout that button element can't replicate */}
              <div
                onClick={() => onToggleAccount(account.id)}
                onKeyDown={(e) => e.key === 'Enter' && onToggleAccount(account.id)}
                onContextMenu={(e) => onContextMenu(e, 'account', account.id)}
                role="button"
                tabIndex={0}
                className={`relative w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                  contextMenu?.type === 'account' && contextMenu.id === account.id
                    ? 'bg-surface-200 dark:bg-surface-700'
                    : !isAnyModalOpen
                      ? 'hover:bg-surface-200 dark:hover:bg-surface-700'
                      : ''
                }`}
              >
                {expandedAccounts.has(account.id) ? (
                  <ChevronDown className="w-4 h-4 text-surface-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-surface-400 flex-shrink-0" />
                )}
                <User className="w-4 h-4 text-surface-500 dark:text-surface-400 flex-shrink-0" />
                <span className="flex-1 text-left truncate min-w-0 text-surface-600 dark:text-surface-400 group-hover:pr-2">
                  {account.name}
                </span>
                <div className="flex items-center gap-1 w-0 overflow-hidden group-hover:w-auto focus-within:w-auto transition-all">
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
                      className={`p-1.5 rounded bg-transparent ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-600 dark:hover:text-surface-300' : ''} text-surface-400 transition-colors flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Account menu" position="top">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onContextMenu(
                          e as React.MouseEvent<HTMLButtonElement>,
                          'account',
                          account.id,
                        );
                      }}
                      onContextMenu={(e) => {
                        e.stopPropagation();
                        onContextMenu(e, 'account', account.id);
                      }}
                      className="p-1.5 rounded bg-transparent hover:bg-surface-300 dark:hover:bg-surface-600 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {expandedAccounts.has(account.id) && (
                <div>
                  {account.calendars.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-surface-500 dark:text-surface-400">
                      No calendars yet.
                    </div>
                  ) : (
                    account.calendars.map((calendar) => {
                      const CalendarIcon = getIconByName(calendar.icon ?? 'calendar');
                      const isActive = activeCalendarId === calendar.id;
                      const calendarColor = calendar.color ?? FALLBACK_ITEM_COLOR;
                      const textColor = isActive ? getContrastTextColor(calendarColor) : undefined;
                      return (
                        <button
                          type="button"
                          key={calendar.id}
                          data-context-menu
                          onClick={() => onSelectCalendar(account.id, calendar.id)}
                          onContextMenu={(e) =>
                            onContextMenu(e, 'calendar', calendar.id, account.id)
                          }
                          className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                            isActive
                              ? ''
                              : `text-surface-600 dark:text-surface-400 ${
                                  contextMenu?.type === 'calendar' && contextMenu.id === calendar.id
                                    ? 'bg-surface-200 dark:bg-surface-700'
                                    : !isAnyModalOpen
                                      ? 'hover:bg-surface-200 dark:hover:bg-surface-700'
                                      : ''
                                }`
                          }`}
                          style={
                            isActive
                              ? { backgroundColor: calendarColor, color: textColor }
                              : undefined
                          }
                        >
                          {calendar.emoji ? (
                            <span
                              className="text-xs leading-none"
                              style={{ color: isActive ? textColor : calendarColor }}
                            >
                              {calendar.emoji}
                            </span>
                          ) : (
                            <CalendarIcon
                              className="w-4 h-4"
                              style={{ color: isActive ? textColor : calendarColor }}
                            />
                          )}
                          <span className="flex-1 text-left truncate">{calendar.displayName}</span>
                          <span className="text-xs">{getTaskCount(calendar.id)}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))
        ))}
    </div>
  );
};
