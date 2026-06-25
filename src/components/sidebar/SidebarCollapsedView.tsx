import Download from 'lucide-react/icons/download';
import Import from 'lucide-react/icons/import';
import Inbox from 'lucide-react/icons/inbox';
import Settings from 'lucide-react/icons/settings';
import Trash2 from 'lucide-react/icons/trash-2';
import type { MouseEvent } from 'react';
import { SidebarCollapsedItemTooltip } from '$components/sidebar/SidebarCollapsedItemTooltip';
import { Tooltip } from '$components/Tooltip';
import { getIconByName } from '$constants/icons';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { Account, Tag } from '$types';
import type { Filter } from '$types/filter';

interface SidebarCollapsedViewProps {
  accounts: Account[];
  tags: Tag[];
  filters: Filter[];
  activeCalendarId: string | null;
  activeTagId: string | null;
  activeFilterId: string | null;
  activeView: 'tasks' | 'recently-deleted' | 'filter';
  contextMenu: { type: string; id: string } | null;
  showCollapsedContent: boolean;
  localSectionCollapsed: boolean;
  accountsSectionCollapsed: boolean;
  filtersSectionCollapsed: boolean;
  tagsSectionCollapsed: boolean;
  updateAvailable?: boolean;
  importShortcut?: string;
  settingsShortcut?: string;
  onAllTasks: () => void;
  onRecentlyDeleted: () => void;
  onSelectCalendar: (accountId: string, calendarId: string) => void;
  onSelectTag: (tagId: string) => void;
  onSelectFilter: (filterId: string) => void;
  onContextMenu: (
    e: MouseEvent,
    type: 'calendar' | 'tag' | 'filter',
    id: string,
    accountId?: string,
  ) => void;
  onOpenImport?: () => void;
  onOpenSettings?: () => void;
  onUpdateClick?: () => void;
}

export const SidebarCollapsedView = ({
  accounts,
  tags,
  filters,
  activeCalendarId,
  activeTagId,
  activeFilterId,
  activeView,
  contextMenu,
  showCollapsedContent,
  localSectionCollapsed,
  accountsSectionCollapsed,
  filtersSectionCollapsed,
  tagsSectionCollapsed,
  updateAvailable,
  importShortcut,
  settingsShortcut,
  onAllTasks,
  onRecentlyDeleted,
  onSelectCalendar,
  onSelectTag,
  onSelectFilter,
  onContextMenu,
  onOpenImport,
  onOpenSettings,
  onUpdateClick,
}: SidebarCollapsedViewProps) => {
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const importTooltip = (
    <span className="flex items-center gap-3 whitespace-nowrap">
      <span>Import tasks...</span>
      {importShortcut && (
        <span className="font-normal text-white/70 text-xs">{importShortcut}</span>
      )}
    </span>
  );
  const settingsTooltip = (
    <span className="flex items-center gap-3 whitespace-nowrap">
      <span>Settings</span>
      {settingsShortcut && (
        <span className="font-normal text-white/70 text-xs">{settingsShortcut}</span>
      )}
    </span>
  );

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col items-center motion-safe:transition-opacity motion-safe:duration-150 ${showCollapsedContent ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto overscroll-contain py-2">
        <Tooltip content="All Tasks" position="right">
          <button
            type="button"
            onClick={onAllTasks}
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
              activeView === 'tasks' && activeCalendarId === null && activeTagId === null
                ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
                : 'text-surface-500 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-700'
            }`}
          >
            <Inbox className="h-5 w-5" />
          </button>
        </Tooltip>

        <Tooltip content="Recently Deleted" position="right">
          <button
            type="button"
            onClick={onRecentlyDeleted}
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
              activeView === 'recently-deleted'
                ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
                : 'text-surface-500 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-700'
            }`}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </Tooltip>

        {!filtersSectionCollapsed && filters.length > 0 && (
          <div className="my-1 h-px w-8 shrink-0 bg-surface-200 dark:bg-surface-700" />
        )}

        {!filtersSectionCollapsed &&
          filters.map((filter) => {
            const isActive = activeFilterId === filter.id;
            const FilterIcon = getIconByName(filter.icon ?? 'list-todo');
            const filterColor = filter.color ? resolveAccent(filter.color) : resolvedAccentColor;
            return (
              <Tooltip
                key={filter.id}
                content={<SidebarCollapsedItemTooltip name={filter.name} type="Filter" />}
                position="right"
              >
                <button
                  type="button"
                  data-context-menu
                  aria-label={`${filter.name} filter`}
                  onClick={() => onSelectFilter(filter.id)}
                  onContextMenu={(e) => onContextMenu(e, 'filter', filter.id)}
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    isActive
                      ? 'bg-surface-200 dark:bg-surface-700'
                      : contextMenu?.type === 'filter' && contextMenu.id === filter.id
                        ? 'bg-surface-200 dark:bg-surface-700'
                        : 'hover:bg-surface-200 dark:hover:bg-surface-700'
                  }`}
                >
                  {filter.emoji ? (
                    <span className="text-base leading-none" style={{ color: filterColor }}>
                      {filter.emoji}
                    </span>
                  ) : (
                    <FilterIcon className="h-5 w-5" style={{ color: filterColor }} />
                  )}
                </button>
              </Tooltip>
            );
          })}

        {accounts
          .filter((a) => !a.caldav && !localSectionCollapsed)
          .concat(accounts.filter((a) => a.caldav && !accountsSectionCollapsed))
          .map((account) => {
            if (account.calendars.length === 0) return null;
            return (
              <div key={account.id} className="flex flex-col items-center gap-1">
                <div className="my-1 h-px w-8 shrink-0 bg-surface-200 dark:bg-surface-700" />
                {account.calendars.map((calendar) => {
                  const CalendarIcon = getIconByName(calendar.icon ?? 'calendar');
                  const isActive = activeCalendarId === calendar.id;
                  const calendarColor = calendar.color
                    ? resolveAccent(calendar.color)
                    : resolvedAccentColor;
                  return (
                    <Tooltip
                      key={calendar.id}
                      content={
                        <SidebarCollapsedItemTooltip name={calendar.displayName} type="Calendar" />
                      }
                      position="right"
                    >
                      <button
                        type="button"
                        data-context-menu
                        aria-label={`${calendar.displayName} calendar`}
                        onClick={() => onSelectCalendar(account.id, calendar.id)}
                        onContextMenu={(e) => onContextMenu(e, 'calendar', calendar.id, account.id)}
                        className={`flex size-10 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                          isActive
                            ? 'bg-surface-200 dark:bg-surface-700'
                            : contextMenu?.type === 'calendar' && contextMenu.id === calendar.id
                              ? 'bg-surface-200 dark:bg-surface-700'
                              : 'hover:bg-surface-200 dark:hover:bg-surface-700'
                        }`}
                      >
                        {calendar.emoji ? (
                          <span className="text-base leading-none" style={{ color: calendarColor }}>
                            {calendar.emoji}
                          </span>
                        ) : (
                          <CalendarIcon className="h-5 w-5" style={{ color: calendarColor }} />
                        )}
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            );
          })}

        {!tagsSectionCollapsed && tags.length > 0 && (
          <div className="my-1 h-px w-8 shrink-0 bg-surface-200 dark:bg-surface-700" />
        )}

        {!tagsSectionCollapsed &&
          tags.map((tag) => {
            const isActive = activeTagId === tag.id;
            const TagIcon = getIconByName(tag.icon ?? 'tag');
            const tagColor = tag.color ? resolveAccent(tag.color) : resolvedAccentColor;
            return (
              <Tooltip
                key={tag.id}
                content={<SidebarCollapsedItemTooltip name={tag.name} type="Tag" />}
                position="right"
              >
                <button
                  type="button"
                  data-context-menu
                  aria-label={`${tag.name} tag`}
                  onClick={() => onSelectTag(tag.id)}
                  onContextMenu={(e) => onContextMenu(e, 'tag', tag.id)}
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    isActive
                      ? 'bg-surface-200 dark:bg-surface-700'
                      : contextMenu?.type === 'tag' && contextMenu.id === tag.id
                        ? 'bg-surface-200 dark:bg-surface-700'
                        : 'hover:bg-surface-200 dark:hover:bg-surface-700'
                  }`}
                >
                  {tag.emoji ? (
                    <span className="text-base leading-none" style={{ color: tagColor }}>
                      {tag.emoji}
                    </span>
                  ) : (
                    <TagIcon className="h-5 w-5" style={{ color: tagColor }} />
                  )}
                </button>
              </Tooltip>
            );
          })}
      </div>

      <div className="relative flex w-full shrink-0 flex-col items-center gap-1 bg-surface-100 px-1 py-2 dark:bg-surface-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-surface-100 to-transparent dark:from-surface-900"
        />
        <div aria-hidden="true" className="h-px w-8 shrink-0 bg-surface-200 dark:bg-surface-700" />
        {updateAvailable && (
          <Tooltip content="Update available!" position="right">
            <button
              type="button"
              onClick={() => onUpdateClick?.()}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-surface-500 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
            >
              <Download className="h-5 w-5 text-primary-500" />
            </button>
          </Tooltip>
        )}
        <Tooltip content={importTooltip} position="right">
          <button
            type="button"
            onClick={() => onOpenImport?.()}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-surface-500 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
          >
            <Import className="h-5 w-5" />
          </button>
        </Tooltip>
        <Tooltip content={settingsTooltip} position="right">
          <button
            type="button"
            onClick={() => onOpenSettings?.()}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-surface-500 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
          >
            <Settings className="h-5 w-5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
