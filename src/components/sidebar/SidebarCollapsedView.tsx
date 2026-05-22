import Download from 'lucide-react/icons/download';
import Inbox from 'lucide-react/icons/inbox';
import Settings from 'lucide-react/icons/settings';
import Trash2 from 'lucide-react/icons/trash-2';
import { Tooltip } from '$components/Tooltip';
import { getIconByName } from '$constants/icons';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { Account, Filter, Tag } from '$types';

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
  onAllTasks: () => void;
  onRecentlyDeleted: () => void;
  onSelectCalendar: (accountId: string, calendarId: string) => void;
  onSelectTag: (tagId: string) => void;
  onSelectFilter: (filterId: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
    type: 'calendar' | 'tag' | 'filter',
    id: string,
    accountId?: string,
  ) => void;
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
  onAllTasks,
  onRecentlyDeleted,
  onSelectCalendar,
  onSelectTag,
  onSelectFilter,
  onContextMenu,
  onOpenSettings,
  onUpdateClick,
}: SidebarCollapsedViewProps) => {
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();

  return (
    <div
      className={`flex-1 flex flex-col items-center py-2 gap-1 overflow-y-auto motion-safe:transition-opacity motion-safe:duration-150 ${showCollapsedContent ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <Tooltip content="All Tasks" position="right">
        <button
          type="button"
          onClick={onAllTasks}
          className={`p-2 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
            activeView === 'tasks' && activeCalendarId === null && activeTagId === null
              ? 'bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100'
              : 'text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
          }`}
        >
          <Inbox className="w-5 h-5" />
        </button>
      </Tooltip>

      <Tooltip content="Recently Deleted" position="right">
        <button
          type="button"
          onClick={onRecentlyDeleted}
          className={`p-2 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
            activeView === 'recently-deleted'
              ? 'bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100'
              : 'text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
          }`}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </Tooltip>

      {!filtersSectionCollapsed && filters.length > 0 && (
        <div className="w-6 h-px bg-surface-200 dark:bg-surface-700 my-1" />
      )}

      {!filtersSectionCollapsed &&
        filters.map((filter) => {
          const isActive = activeFilterId === filter.id;
          const FilterIcon = getIconByName(filter.icon ?? 'list-todo');
          const filterColor = filter.color ? resolveAccent(filter.color) : resolvedAccentColor;
          return (
            <Tooltip key={filter.id} content={filter.name} position="right">
              <button
                type="button"
                data-context-menu
                onClick={() => onSelectFilter(filter.id)}
                onContextMenu={(e) => onContextMenu(e, 'filter', filter.id)}
                className={`p-2 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
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
                  <FilterIcon className="w-5 h-5" style={{ color: filterColor }} />
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
              <div className="w-6 h-px bg-surface-200 dark:bg-surface-700 my-1" />
              {account.calendars.map((calendar) => {
                const CalendarIcon = getIconByName(calendar.icon ?? 'calendar');
                const isActive = activeCalendarId === calendar.id;
                const calendarColor = calendar.color
                  ? resolveAccent(calendar.color)
                  : resolvedAccentColor;
                return (
                  <Tooltip key={calendar.id} content={calendar.displayName} position="right">
                    <button
                      type="button"
                      data-context-menu
                      onClick={() => onSelectCalendar(account.id, calendar.id)}
                      onContextMenu={(e) => onContextMenu(e, 'calendar', calendar.id, account.id)}
                      className={`p-2 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
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
                        <CalendarIcon className="w-5 h-5" style={{ color: calendarColor }} />
                      )}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          );
        })}

      {!tagsSectionCollapsed && tags.length > 0 && (
        <div className="w-6 h-px bg-surface-200 dark:bg-surface-700 my-1" />
      )}

      {!tagsSectionCollapsed &&
        tags.map((tag) => {
          const isActive = activeTagId === tag.id;
          const TagIcon = getIconByName(tag.icon ?? 'tag');
          const tagColor = tag.color ? resolveAccent(tag.color) : resolvedAccentColor;
          return (
            <Tooltip key={tag.id} content={tag.name} position="right">
              <button
                type="button"
                data-context-menu
                onClick={() => onSelectTag(tag.id)}
                onContextMenu={(e) => onContextMenu(e, 'tag', tag.id)}
                className={`p-2 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
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
                  <TagIcon className="w-5 h-5" style={{ color: tagColor }} />
                )}
              </button>
            </Tooltip>
          );
        })}

      <div className="mt-auto flex flex-col pt-2 border-t border-surface-200 dark:border-surface-700">
        {updateAvailable && (
          <Tooltip content="Update available!" position="right">
            <button
              type="button"
              onClick={() => onUpdateClick?.()}
              className="p-2 mb-1 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <Download className="w-5 h-5 text-primary-500" />
            </button>
          </Tooltip>
        )}
        <Tooltip content="Settings" position="right">
          <button
            type="button"
            onClick={() => onOpenSettings?.()}
            className="p-2 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <Settings className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
