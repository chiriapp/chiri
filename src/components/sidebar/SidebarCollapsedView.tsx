import Download from 'lucide-react/icons/download';
import Inbox from 'lucide-react/icons/inbox';
import Settings from 'lucide-react/icons/settings';
import { Tooltip } from '$components/Tooltip';
import { getIconByName } from '$data/icons';
import type { Account, Tag } from '$types/index';
import { getContrastTextColor } from '$utils/color';
import { FALLBACK_ITEM_COLOR } from '$utils/constants';

interface SidebarCollapsedViewProps {
  accounts: Account[];
  tags: Tag[];
  activeCalendarId: string | null;
  activeTagId: string | null;
  contextMenu: { type: string; id: string } | null;
  showCollapsedContent: boolean;
  updateAvailable?: boolean;
  onAllTasks: () => void;
  onSelectCalendar: (accountId: string, calendarId: string) => void;
  onSelectTag: (tagId: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
    type: 'calendar' | 'tag',
    id: string,
    accountId?: string,
  ) => void;
  onOpenSettings?: () => void;
  onUpdateClick?: () => void;
}

export const SidebarCollapsedView = ({
  accounts,
  tags,
  activeCalendarId,
  activeTagId,
  contextMenu,
  showCollapsedContent,
  updateAvailable,
  onAllTasks,
  onSelectCalendar,
  onSelectTag,
  onContextMenu,
  onOpenSettings,
  onUpdateClick,
}: SidebarCollapsedViewProps) => {
  return (
    <div
      className={`flex-1 flex flex-col items-center py-2 gap-1 overflow-y-auto transition-opacity duration-150 ${showCollapsedContent ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* All Tasks */}
      <Tooltip content="All Tasks" position="right">
        <button
          type="button"
          onClick={onAllTasks}
          className={`p-2 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
            activeCalendarId === null && activeTagId === null
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
              : 'text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
          }`}
        >
          <Inbox className="w-5 h-5" />
        </button>
      </Tooltip>

      {/* Separator */}
      <div className="w-6 h-px bg-surface-200 dark:bg-surface-700 my-1" />

      {/* Calendars */}
      {accounts.flatMap((account) =>
        account.calendars.map((calendar) => {
          const CalendarIcon = getIconByName(calendar.icon ?? 'calendar');
          const isActive = activeCalendarId === calendar.id;
          const calendarColor = calendar.color ?? FALLBACK_ITEM_COLOR;
          return (
            <Tooltip key={calendar.id} content={calendar.displayName} position="right">
              <button
                type="button"
                data-context-menu
                onClick={() => onSelectCalendar(account.id, calendar.id)}
                onContextMenu={(e) => onContextMenu(e, 'calendar', calendar.id, account.id)}
                className={`p-2 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30'
                    : contextMenu?.type === 'calendar' && contextMenu.id === calendar.id
                      ? 'bg-surface-200 dark:bg-surface-700'
                      : 'hover:bg-surface-200 dark:hover:bg-surface-700'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: calendarColor,
                        color: getContrastTextColor(calendarColor),
                      }
                    : undefined
                }
              >
                {calendar.emoji ? (
                  <span
                    className="text-base leading-none"
                    style={{
                      color: isActive ? getContrastTextColor(calendarColor) : calendarColor,
                    }}
                  >
                    {calendar.emoji}
                  </span>
                ) : (
                  <CalendarIcon
                    className="w-5 h-5"
                    style={{
                      color: isActive ? getContrastTextColor(calendarColor) : calendarColor,
                    }}
                  />
                )}
              </button>
            </Tooltip>
          );
        }),
      )}

      {/* Tags section separator */}
      {tags.length > 0 && <div className="w-6 h-px bg-surface-200 dark:bg-surface-700 my-1" />}

      {/* Tags */}
      {tags.map((tag) => {
        const isActive = activeTagId === tag.id;
        const TagIcon = getIconByName(tag.icon ?? 'tag');
        return (
          <Tooltip key={tag.id} content={tag.name} position="right">
            <button
              type="button"
              data-context-menu
              onClick={() => onSelectTag(tag.id)}
              onContextMenu={(e) => onContextMenu(e, 'tag', tag.id)}
              className={`p-2 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : contextMenu?.type === 'tag' && contextMenu.id === tag.id
                    ? 'bg-surface-200 dark:bg-surface-700'
                    : 'hover:bg-surface-200 dark:hover:bg-surface-700'
              }`}
              style={
                isActive
                  ? { backgroundColor: tag.color, color: getContrastTextColor(tag.color) }
                  : undefined
              }
            >
              {tag.emoji ? (
                <span
                  className="text-base leading-none"
                  style={{
                    color: isActive ? getContrastTextColor(tag.color) : tag.color,
                  }}
                >
                  {tag.emoji}
                </span>
              ) : (
                <TagIcon
                  className="w-5 h-5"
                  style={{ color: isActive ? getContrastTextColor(tag.color) : tag.color }}
                />
              )}
            </button>
          </Tooltip>
        );
      })}

      {/* Settings at bottom */}
      <div className="mt-auto flex flex-col pt-2 border-t border-surface-200 dark:border-surface-700">
        {updateAvailable && (
          <Tooltip content="Update available!" position="right">
            <button
              type="button"
              onClick={() => onUpdateClick?.()}
              className="p-2 mb-1 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <Download className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </button>
          </Tooltip>
        )}
        <Tooltip content="Settings" position="right">
          <button
            type="button"
            onClick={() => onOpenSettings?.()}
            className="p-2 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <Settings className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
