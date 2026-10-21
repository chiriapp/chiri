import Inbox from 'lucide-react/icons/inbox';
import Trash2 from 'lucide-react/icons/trash-2';
import { getIconByName } from '$constants/icons';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { Calendar } from '$types/calendar';
import type { Filter } from '$types/filter';
import type { Tag } from '$types/tag';

interface HeaderContextTitleProps {
  activeView: 'tasks' | 'recently-deleted' | 'filter';
  activeCalendarId: string | null;
  activeTagId: string | null;
  activeFilterId: string | null;
  calendars: Calendar[];
  tags: Tag[];
  filters: Filter[];
}

export const getHeaderContextTitle = ({
  activeView,
  activeCalendarId,
  activeTagId,
  activeFilterId,
  calendars,
  tags,
  filters,
}: HeaderContextTitleProps) => {
  if (activeView === 'recently-deleted') return 'Recently Deleted';
  if (activeView === 'filter') {
    return filters.find((item) => item.id === activeFilterId)?.name ?? 'Filtered Tasks';
  }
  if (activeCalendarId) {
    return calendars.find((item) => item.id === activeCalendarId)?.displayName ?? 'Calendar';
  }
  if (activeTagId) return tags.find((item) => item.id === activeTagId)?.name ?? 'Tag';
  return 'All Tasks';
};

export const HeaderContextTitle = ({
  activeView,
  activeCalendarId,
  activeTagId,
  activeFilterId,
  calendars,
  tags,
  filters,
}: HeaderContextTitleProps) => {
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const calendar = calendars.find((item) => item.id === activeCalendarId);
  const tag = tags.find((item) => item.id === activeTagId);
  const filter = filters.find((item) => item.id === activeFilterId);

  const title = getHeaderContextTitle({
    activeView,
    activeCalendarId,
    activeTagId,
    activeFilterId,
    calendars,
    tags,
    filters,
  });
  let icon = <Inbox className="h-4 w-4 shrink-0 text-surface-500 dark:text-surface-400" />;
  let emoji: string | undefined;
  let color: string | undefined;

  if (activeView === 'recently-deleted') {
    icon = <Trash2 className="h-4 w-4 shrink-0 text-surface-500 dark:text-surface-400" />;
  } else if (activeView === 'filter') {
    const FilterIcon = getIconByName(filter?.icon ?? 'list-todo');
    icon = <FilterIcon className="h-4 w-4 shrink-0" />;
    emoji = filter?.emoji;
    color = filter ? (filter.color ? resolveAccent(filter.color) : resolvedAccentColor) : undefined;
  } else if (activeCalendarId) {
    const CalendarIcon = getIconByName(calendar?.icon ?? 'calendar');
    icon = <CalendarIcon className="h-4 w-4 shrink-0" />;
    emoji = calendar?.emoji;
    color = calendar
      ? calendar.color
        ? resolveAccent(calendar.color)
        : resolvedAccentColor
      : undefined;
  } else if (activeTagId) {
    const TagIcon = getIconByName(tag?.icon ?? 'tag');
    icon = <TagIcon className="h-4 w-4 shrink-0" />;
    emoji = tag?.emoji;
    color = tag ? (tag.color ? resolveAccent(tag.color) : resolvedAccentColor) : undefined;
  }

  return (
    <h1 className="flex min-w-0 flex-1 items-center gap-2 font-semibold text-base text-surface-800 dark:text-surface-100">
      {emoji ? (
        <span className="shrink-0 text-xs leading-none" style={{ color }}>
          {emoji}
        </span>
      ) : (
        <span className={color ? 'text-current' : ''} style={color ? { color } : undefined}>
          {icon}
        </span>
      )}
      <span className="min-w-0 truncate">{title}</span>
    </h1>
  );
};
