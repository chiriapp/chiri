import ArrowUpDown from 'lucide-react/icons/arrow-up-down';
import ChevronDown from 'lucide-react/icons/chevron-down';
import Import from 'lucide-react/icons/import';
import Plus from 'lucide-react/icons/plus';
import { useRef, useState } from 'react';
import { SidebarCalendarList } from '$components/sidebar/SidebarCalendarList';
import { SidebarLocalSortMenu } from '$components/sidebar/SidebarLocalSortMenu';
import { Tooltip } from '$components/Tooltip';
import { useCalendarSortConfig } from '$hooks/queries/useUIState';
import type { Account, Task } from '$types';

interface SidebarLocalListProps {
  accounts: Account[];
  tasks: Task[];
  activeCalendarId: string | null;
  contextMenu: { type: string; id: string; accountId?: string } | null;
  isAnyModalOpen: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onContextMenu: (
    e: React.MouseEvent,
    type: 'account' | 'calendar' | 'tag' | 'accounts-section',
    id: string,
    accountId?: string,
  ) => void;
  onSelectCalendar: (accountId: string, calendarId: string) => void;
  onOpenImport?: () => void;
  onAddCalendar: () => void;
}

export const SidebarLocalList = ({
  accounts,
  tasks,
  activeCalendarId,
  contextMenu,
  isAnyModalOpen,
  collapsed,
  onToggle,
  onContextMenu,
  onSelectCalendar,
  onOpenImport,
  onAddCalendar,
}: SidebarLocalListProps) => {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const calendarSortConfig = useCalendarSortConfig();

  const closeSortMenu = () => setShowSortMenu(false);

  if (accounts.length === 0) return null;

  return (
    <div className="relative">
      {/* biome-ignore lint/a11y/useSemanticElements: Section header toggle div contains icon+text layout that button element can't replicate */}
      <div
        onClick={onToggle}
        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        className="flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
      >
        <div className="flex items-center gap-1.5">
          <ChevronDown
            className={`w-4 h-4 text-surface-400 motion-safe:transition-transform motion-safe:duration-200 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
          />
          <span className="text-sm font-semibold text-surface-500 dark:text-surface-400">
            Local
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
              ref={sortButtonRef}
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

          <Tooltip content="Add local calendar" position="top">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddCalendar();
              }}
              className={`p-1 rounded-sm ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''} text-surface-500 dark:text-surface-400 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {showSortMenu && (
        <SidebarLocalSortMenu
          anchorRef={sortButtonRef}
          calendarSortConfig={calendarSortConfig}
          onClose={closeSortMenu}
        />
      )}

      <div
        className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-in-out ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'} pt-1`}
      >
        <div className="overflow-hidden">
          {accounts.map((account) => (
            <SidebarCalendarList
              key={account.id}
              account={account}
              tasks={tasks}
              activeCalendarId={activeCalendarId}
              contextMenu={contextMenu}
              isAnyModalOpen={isAnyModalOpen}
              isAnyAccountDragging={false}
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
