import { useSortable } from '@dnd-kit/sortable';
import type { HTMLAttributes, MouseEvent } from 'react';
import { getIconByName } from '$constants/icons';
import type { Calendar } from '$types';

interface SidebarCalendarItemProps {
  calendar: Calendar;
  isActive: boolean;
  isContextMenuOpen: boolean;
  isAnyModalOpen: boolean;
  isAnyAccountDragging?: boolean;
  isAnyCalendarDragging?: boolean;
  taskCount: number;
  calendarColor: string;
  sortable?: boolean;
  onSelect: () => void;
  onContextMenu: (e: MouseEvent) => void;
}

export const SidebarCalendarItem = ({
  calendar,
  isActive,
  isContextMenuOpen,
  isAnyModalOpen,
  isAnyAccountDragging,
  isAnyCalendarDragging,
  taskCount,
  calendarColor,
  sortable = false,
  onSelect,
  onContextMenu,
}: SidebarCalendarItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: calendar.id,
    disabled: !sortable,
  });
  const CalendarIcon = getIconByName(calendar.icon ?? 'calendar');
  const transformStr = sortable && transform ? `translate3d(0, ${transform.y}px, 0)` : undefined;
  const dragHandleProps = sortable
    ? ({ ...attributes, ...listeners } as HTMLAttributes<HTMLButtonElement>)
    : undefined;

  const item = (
    <button
      type="button"
      data-context-menu
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
        isActive
          ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
          : `text-surface-600 dark:text-surface-400 ${
              isContextMenuOpen
                ? 'bg-surface-200 dark:bg-surface-700'
                : !isAnyModalOpen && !isAnyAccountDragging && !isAnyCalendarDragging
                  ? 'hover:bg-surface-200 dark:hover:bg-surface-700'
                  : ''
            }`
      } ${isDragging ? 'opacity-50' : ''} ${isAnyAccountDragging || (isAnyCalendarDragging && !isDragging) ? 'pointer-events-none' : ''}`}
      {...dragHandleProps}
    >
      {calendar.emoji ? (
        <span className="shrink-0 text-xs leading-none" style={{ color: calendarColor }}>
          {calendar.emoji}
        </span>
      ) : (
        <CalendarIcon className="h-4 w-4 shrink-0" style={{ color: calendarColor }} />
      )}
      <span className="flex-1 truncate text-left">{calendar.displayName}</span>
      <span className="text-xs">{taskCount}</span>
    </button>
  );

  if (!sortable) return item;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: transformStr }}
      className="cursor-grab active:cursor-grabbing"
    >
      {item}
    </div>
  );
};
