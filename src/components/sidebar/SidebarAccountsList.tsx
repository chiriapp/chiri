import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortDesc from 'lucide-react/icons/arrow-down-wide-narrow';
import ArrowUpDown from 'lucide-react/icons/arrow-up-down';
import SortAsc from 'lucide-react/icons/arrow-up-narrow-wide';
import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Import from 'lucide-react/icons/import';
import MoreVertical from 'lucide-react/icons/more-vertical';
import Plus from 'lucide-react/icons/plus';
import User from 'lucide-react/icons/user';
import { useEffect, useState } from 'react';
import { Tooltip } from '$components/Tooltip';
import { ACCOUNT_SORT_OPTIONS, CALENDAR_SORT_OPTIONS, FALLBACK_ITEM_COLOR } from '$constants';
import { getIconByName } from '$constants/icons';
import { useReorderAccounts, useReorderCalendars } from '$hooks/queries/useAccounts';
import {
  useAccountSortConfig,
  useCalendarSortConfig,
  useSetAccountSortConfig,
  useSetCalendarSortConfig,
} from '$hooks/queries/useUIState';
import type { Account, AccountSortConfig, Calendar, CalendarSortConfig, Task } from '$types';
import { getContrastTextColor } from '$utils/color';

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

interface CalendarItemContentProps {
  calendar: Calendar;
  isActive: boolean;
  isContextMenuOpen: boolean;
  isAnyModalOpen: boolean;
  isAnyAccountDragging?: boolean;
  isAnyCalendarDragging?: boolean;
  taskCount: number;
  textColor: string | undefined;
  calendarColor: string;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const CalendarItemContent = ({
  calendar,
  isActive,
  isContextMenuOpen,
  isAnyModalOpen,
  isAnyAccountDragging,
  isAnyCalendarDragging,
  taskCount,
  textColor,
  calendarColor,
  isDragging,
  dragHandleProps,
  onSelect,
  onContextMenu,
}: CalendarItemContentProps) => {
  const CalendarIcon = getIconByName(calendar.icon ?? 'calendar');

  return (
    <button
      type="button"
      data-context-menu
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
        isActive
          ? ''
          : `text-surface-600 dark:text-surface-400 ${
              isContextMenuOpen
                ? 'bg-surface-200 dark:bg-surface-700'
                : !isAnyModalOpen && !isAnyAccountDragging && !isAnyCalendarDragging
                  ? 'hover:bg-surface-200 dark:hover:bg-surface-700'
                  : ''
            }`
      } ${isDragging ? 'opacity-50' : ''} ${isAnyAccountDragging || (isAnyCalendarDragging && !isDragging) ? 'pointer-events-none' : ''}`}
      style={isActive ? { backgroundColor: calendarColor, color: textColor } : undefined}
      {...dragHandleProps}
    >
      {calendar.emoji ? (
        <span
          className="text-xs leading-none shrink-0"
          style={{ color: isActive ? textColor : calendarColor }}
        >
          {calendar.emoji}
        </span>
      ) : (
        <CalendarIcon
          className="w-4 h-4 shrink-0"
          style={{ color: isActive ? textColor : calendarColor }}
        />
      )}
      <span className="flex-1 text-left truncate">{calendar.displayName}</span>
      <span className="text-xs">{taskCount}</span>
    </button>
  );
};

interface SortableCalendarItemProps
  extends Omit<CalendarItemContentProps, 'isDragging' | 'dragHandleProps'> {}

const SortableCalendarItem = (props: SortableCalendarItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: props.calendar.id,
  });

  const transformStr = transform
    ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: transformStr }}
      className="cursor-grab active:cursor-grabbing"
    >
      <CalendarItemContent
        {...props}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLDivElement>}
      />
    </div>
  );
};

interface AccountCalendarListProps {
  account: Account;
  tasks: Task[];
  activeCalendarId: string | null;
  contextMenu: { type: string; id: string; accountId?: string } | null;
  isAnyModalOpen: boolean;
  isAnyAccountDragging: boolean;
  calendarSortConfig: CalendarSortConfig;
  onContextMenu: (e: React.MouseEvent, type: 'calendar', id: string, accountId: string) => void;
  onSelectCalendar: (accountId: string, calendarId: string) => void;
}

const AccountCalendarList = ({
  account,
  tasks,
  activeCalendarId,
  contextMenu,
  isAnyModalOpen,
  isAnyAccountDragging,
  calendarSortConfig,
  onContextMenu,
  onSelectCalendar,
}: AccountCalendarListProps) => {
  const reorderMutation = useReorderCalendars();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [isAnyCalendarDragging, setIsAnyCalendarDragging] = useState(false);

  const getTaskCount = (calendarId: string) =>
    tasks.filter((t) => t.calendarId === calendarId && isActiveTask(t)).length;

  const sortedCalendars = (() => {
    const cals = [...account.calendars];
    if (calendarSortConfig.mode === 'title') {
      cals.sort((a, b) => {
        const cmp = a.displayName.localeCompare(b.displayName);
        return calendarSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      cals.sort((a, b) => {
        const cmp = a.sortOrder - b.sortOrder;
        return calendarSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    }
    return cals;
  })();

  if (sortedCalendars.length === 0) {
    return (
      <div className="px-4 py-2 text-sm text-surface-500 dark:text-surface-400">
        No calendars yet.
      </div>
    );
  }

  const sharedItemProps = (calendar: Calendar) => {
    const isActive = activeCalendarId === calendar.id;
    const calendarColor = calendar.color ?? FALLBACK_ITEM_COLOR;
    return {
      calendar,
      isActive,
      isContextMenuOpen: contextMenu?.type === 'calendar' && contextMenu.id === calendar.id,
      isAnyModalOpen,
      isAnyAccountDragging,
      isAnyCalendarDragging,
      taskCount: getTaskCount(calendar.id),
      calendarColor,
      textColor: isActive ? getContrastTextColor(calendarColor) : undefined,
      onSelect: () => onSelectCalendar(account.id, calendar.id),
      onContextMenu: (e: React.MouseEvent) => onContextMenu(e, 'calendar', calendar.id, account.id),
    };
  };

  if (calendarSortConfig.mode === 'manual') {
    const handleDragEnd = (event: DragEndEvent) => {
      setIsAnyCalendarDragging(false);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      reorderMutation.mutate({
        accountId: account.id,
        activeId: active.id as string,
        overId: over.id as string,
      });
    };

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => setIsAnyCalendarDragging(true)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedCalendars.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedCalendars.map((calendar) => (
            <SortableCalendarItem key={calendar.id} {...sharedItemProps(calendar)} />
          ))}
        </SortableContext>
      </DndContext>
    );
  }

  return (
    <>
      {sortedCalendars.map((calendar) => (
        <CalendarItemContent key={calendar.id} {...sharedItemProps(calendar)} />
      ))}
    </>
  );
};

interface AccountRowContentProps {
  account: Account;
  tasks: Task[];
  expandedAccounts: Set<string>;
  activeCalendarId: string | null;
  contextMenu: { type: string; id: string; accountId?: string } | null;
  isAnyModalOpen: boolean;
  isAnyAccountDragging?: boolean;
  calendarSortConfig: CalendarSortConfig;
  isDragging?: boolean;
  onToggleAccount: (accountId: string) => void;
  onSelectCalendar: (accountId: string, calendarId: string) => void;
  onCreateCalendar: (accountId: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
    type: 'account' | 'calendar' | 'tag' | 'accounts-section',
    id: string,
    accountId?: string,
  ) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

const AccountRowContent = ({
  account,
  tasks,
  expandedAccounts,
  activeCalendarId,
  contextMenu,
  isAnyModalOpen,
  isAnyAccountDragging,
  calendarSortConfig,
  isDragging,
  onToggleAccount,
  onSelectCalendar,
  onCreateCalendar,
  onContextMenu,
  dragHandleProps,
}: AccountRowContentProps) => (
  <div data-context-menu className={isDragging ? 'opacity-50' : ''}>
    {/* biome-ignore lint/a11y/useSemanticElements: Account toggle div contains icon+text layout that button element can't replicate */}
    <div
      onClick={() => onToggleAccount(account.id)}
      onKeyDown={(e) => e.key === 'Enter' && onToggleAccount(account.id)}
      onContextMenu={(e) => onContextMenu(e, 'account', account.id)}
      role="button"
      tabIndex={0}
      className={`relative w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors group cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
        contextMenu?.type === 'account' && contextMenu.id === account.id
          ? 'bg-surface-200 dark:bg-surface-700'
          : !isAnyModalOpen && !isAnyAccountDragging
            ? 'hover:bg-surface-200 dark:hover:bg-surface-700'
            : ''
      } ${isAnyAccountDragging && !isDragging ? 'pointer-events-none' : ''}`}
      {...dragHandleProps}
    >
      {expandedAccounts.has(account.id) ? (
        <ChevronDown className="w-4 h-4 text-surface-400 shrink-0" />
      ) : (
        <ChevronRight className="w-4 h-4 text-surface-400 shrink-0" />
      )}
      <User className="w-4 h-4 text-surface-500 dark:text-surface-400 shrink-0" />
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

    {!isDragging && expandedAccounts.has(account.id) && (
      <AccountCalendarList
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
    )}
  </div>
);

interface SortableAccountItemProps
  extends Omit<AccountRowContentProps, 'isDragging' | 'dragHandleProps'> {}

const SortableAccountItem = (props: SortableAccountItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: props.account.id,
  });

  // Only translate vertically — never scale or shift horizontally. Scaling a tall account
  // row causes visual distortion; horizontal movement causes scrollbar overflow.
  const transformStr = transform ? `translate3d(0, ${transform.y}px, 0)` : undefined;

  return (
    <div ref={setNodeRef} style={{ transform: transformStr }}>
      <AccountRowContent
        {...props}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLDivElement>}
      />
    </div>
  );
};

interface SortDirectionButtonProps {
  direction: 'asc' | 'desc';
  disabled: boolean;
  onToggle: () => void;
}

const SortDirectionButton = ({ direction, disabled, onToggle }: SortDirectionButtonProps) => (
  <Tooltip
    content={disabled ? 'Not available for manual sorting' : ''}
    position="bottom"
    allowInModal
    className="whitespace-nowrap"
    triggerClassName="w-full"
  >
    <button
      type="button"
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      className={`w-full flex rounded-b-md items-center gap-2 px-3 py-1.5 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
        disabled
          ? 'text-surface-400 dark:text-surface-600 cursor-not-allowed'
          : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
      }`}
    >
      {direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
      <span>{direction === 'asc' ? 'Ascending' : 'Descending'}</span>
    </button>
  </Tooltip>
);

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
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isDraggingAccount, setIsDraggingAccount] = useState(false);

  const accountSortConfig = useAccountSortConfig();
  const calendarSortConfig = useCalendarSortConfig();
  const setAccountSortConfigMutation = useSetAccountSortConfig();
  const setCalendarSortConfigMutation = useSetCalendarSortConfig();
  const reorderAccountsMutation = useReorderAccounts();
  const accountSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSortMenu) setShowSortMenu(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSortMenu]);

  const handleAccountSortModeChange = (mode: AccountSortConfig['mode']) => {
    setAccountSortConfigMutation.mutate({ ...accountSortConfig, mode });
  };
  const toggleAccountSortDirection = () => {
    setAccountSortConfigMutation.mutate({
      ...accountSortConfig,
      direction: accountSortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const handleCalendarSortModeChange = (mode: CalendarSortConfig['mode']) => {
    setCalendarSortConfigMutation.mutate({ ...calendarSortConfig, mode });
  };
  const toggleCalendarSortDirection = () => {
    setCalendarSortConfigMutation.mutate({
      ...calendarSortConfig,
      direction: calendarSortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const sortedAccounts = (() => {
    const sorted = [...accounts];
    if (accountSortConfig.mode === 'title') {
      sorted.sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return accountSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      sorted.sort((a, b) => {
        const cmp = a.sortOrder - b.sortOrder;
        return accountSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    }
    return sorted;
  })();

  const handleAccountDragEnd = (event: DragEndEvent) => {
    setIsDraggingAccount(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderAccountsMutation.mutate({ activeId: active.id as string, overId: over.id as string });
  };

  const sharedAccountProps = (account: Account) => ({
    account,
    tasks,
    expandedAccounts,
    activeCalendarId,
    contextMenu,
    isAnyModalOpen,
    isAnyAccountDragging: isDraggingAccount,
    calendarSortConfig,
    onToggleAccount,
    onSelectCalendar,
    onCreateCalendar,
    onContextMenu,
  });

  return (
    <div>
      <div className="relative">
        {/* biome-ignore lint/a11y/useSemanticElements: Section header toggle div contains icon+text layout that button element can't replicate */}
        <div
          onClick={onToggleAccountsSection}
          onKeyDown={(e) => e.key === 'Enter' && onToggleAccountsSection()}
          onContextMenu={(e) => onContextMenu(e, 'accounts-section', 'accounts')}
          role="button"
          tabIndex={0}
          className="flex items-center justify-between px-3.5 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
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
                className={`p-1 rounded-sm ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''} text-surface-500 dark:text-surface-400 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
              >
                <Import className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip content="List order" position="top">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSortMenu((v) => !v);
                }}
                className={`p-1 rounded transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                  showSortMenu
                    ? 'bg-surface-300 dark:bg-surface-600 text-surface-700 dark:text-surface-200'
                    : `text-surface-500 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''}`
                }`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip content="Add account" position="top">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddAccount();
                }}
                className={`p-1 rounded-sm ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''} text-surface-500 dark:text-surface-400 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {showSortMenu && (
          <>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Sort menu backdrop for closing on outside click */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: Sort menu backdrop for closing on outside click */}
            <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
            <div
              data-context-menu-content
              className="absolute right-0 top-full mt-1 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 z-50 min-w-[200px] animate-scale-in"
            >
              <div className="py-2">
                <div className="px-3 pb-1 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Accounts
                </div>
                {ACCOUNT_SORT_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => handleAccountSortModeChange(option.value)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                      accountSortConfig.mode === option.value
                        ? 'text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
                        : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                    }`}
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
                <SortDirectionButton
                  direction={accountSortConfig.direction}
                  disabled={accountSortConfig.mode === 'manual'}
                  onToggle={toggleAccountSortDirection}
                />
              </div>

              <div className="py-2 border-t border-surface-200 dark:border-surface-700">
                <div className="px-3 pb-1 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Calendars
                </div>
                {CALENDAR_SORT_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => handleCalendarSortModeChange(option.value)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                      calendarSortConfig.mode === option.value
                        ? 'text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
                        : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                    }`}
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
                <SortDirectionButton
                  direction={calendarSortConfig.direction}
                  disabled={calendarSortConfig.mode === 'manual'}
                  onToggle={toggleCalendarSortDirection}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {!accountsSectionCollapsed &&
        (accounts.length === 0 ? (
          <div className="px-4 py-1 text-sm text-surface-500 dark:text-surface-400">
            No accounts added yet.
          </div>
        ) : accountSortConfig.mode === 'manual' ? (
          <DndContext
            sensors={accountSensors}
            collisionDetection={closestCenter}
            onDragStart={() => setIsDraggingAccount(true)}
            onDragEnd={handleAccountDragEnd}
          >
            <SortableContext
              items={sortedAccounts.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedAccounts.map((account) => (
                <SortableAccountItem key={account.id} {...sharedAccountProps(account)} />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          sortedAccounts.map((account) => (
            <AccountRowContent key={account.id} {...sharedAccountProps(account)} />
          ))
        ))}
    </div>
  );
};
