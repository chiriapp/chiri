import ArrowUpDown from 'lucide-react/icons/arrow-up-down';
import CalendarDays from 'lucide-react/icons/calendar-days';
import Plus from 'lucide-react/icons/plus';
import { type MouseEvent, useRef, useState } from 'react';
import { SidebarExpandedCalendarList } from '$components/sidebar/expanded/SidebarExpandedCalendarList';
import { SidebarExpandedLocalSortMenu } from '$components/sidebar/expanded/SidebarExpandedLocalSortMenu';
import { SidebarExpandedSectionHeader } from '$components/sidebar/expanded/SidebarExpandedSectionHeader';
import { Tooltip } from '$components/Tooltip';
import { useCalendarSortConfig } from '$hooks/queries/useUIState';
import type { Account } from '$types/account';
import type { Task } from '$types/task/model';

interface SidebarLocalListProps {
  accounts: Account[];
  tasks: Task[];
  activeCalendarId: string | null;
  contextMenu: { type: string; id: string; accountId?: string } | null;
  isAnyModalOpen: boolean;
  showTaskCounts: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onContextMenu: (
    e: MouseEvent,
    type: 'account' | 'calendar' | 'tag' | 'accounts-section',
    id: string,
    accountId?: string,
  ) => void;
  onSelectCalendar: (accountId: string, calendarId: string) => void;
  onAddCalendar: () => void;
}

export const SidebarExpandedLocalList = ({
  accounts,
  tasks,
  activeCalendarId,
  contextMenu,
  isAnyModalOpen,
  showTaskCounts,
  collapsed,
  onToggle,
  onContextMenu,
  onSelectCalendar,
  onAddCalendar,
}: SidebarLocalListProps) => {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const calendarSortConfig = useCalendarSortConfig();

  const closeSortMenu = () => setShowSortMenu(false);

  if (accounts.length === 0) return null;

  return (
    <div className="relative">
      <SidebarExpandedSectionHeader
        label="Local"
        icon={CalendarDays}
        collapsed={collapsed}
        onToggle={onToggle}
        actions={
          <>
            <Tooltip content="List order" position="top">
              <button
                ref={sortButtonRef}
                type="button"
                onClick={() => {
                  setShowSortMenu((v) => !v);
                }}
                className={`flex h-9 w-8 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
                  showSortMenu
                    ? 'bg-surface-300 text-surface-700 dark:bg-surface-600 dark:text-surface-200'
                    : `text-surface-500 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-300 hover:text-surface-700 dark:hover:bg-surface-600 dark:hover:text-surface-300' : ''}`
                }`}
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </Tooltip>

            <Tooltip content="Add local calendar" position="top">
              <button
                type="button"
                onClick={() => {
                  onAddCalendar();
                }}
                className={`flex h-9 w-8 shrink-0 items-center justify-center rounded-lg ${!isAnyModalOpen ? 'hover:bg-surface-300 hover:text-surface-700 dark:hover:bg-surface-600 dark:hover:text-surface-300' : ''} text-surface-500 outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-400`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </Tooltip>
          </>
        }
      />

      {showSortMenu && (
        <SidebarExpandedLocalSortMenu
          anchorRef={sortButtonRef}
          calendarSortConfig={calendarSortConfig}
          onClose={closeSortMenu}
        />
      )}

      <div
        className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-in-out ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'} pt-1`}
      >
        <div className="overflow-hidden" aria-hidden={collapsed} inert={collapsed}>
          {accounts.map((account) => (
            <SidebarExpandedCalendarList
              key={account.id}
              account={account}
              tasks={tasks}
              activeCalendarId={activeCalendarId}
              contextMenu={contextMenu}
              isAnyModalOpen={isAnyModalOpen}
              isAnyAccountDragging={false}
              showTaskCounts={showTaskCounts}
              calendarSortConfig={calendarSortConfig}
              onContextMenu={onContextMenu}
              onSelectCalendar={onSelectCalendar}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
