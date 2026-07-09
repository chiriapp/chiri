import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { type MouseEvent, useCallback, useRef, useState } from 'react';
import { SidebarCalendarItem } from '$components/sidebar/SidebarCalendarItem';
import { useReorderCalendars } from '$hooks/queries/useAccounts';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { Account, Calendar, Task } from '$types';
import type { CalendarSortConfig } from '$types/sort';

interface SidebarCalendarListProps {
  account: Account;
  tasks: Task[];
  activeCalendarId: string | null;
  contextMenu: { type: string; id: string; accountId?: string } | null;
  isAnyModalOpen: boolean;
  isAnyAccountDragging: boolean;
  showTaskCounts: boolean;
  calendarSortConfig: CalendarSortConfig;
  onContextMenu: (e: MouseEvent, type: 'calendar', id: string, accountId: string) => void;
  onSelectCalendar: (accountId: string, calendarId: string) => void;
}

const isActiveTask = (task: Task) =>
  !task.deletedAt && task.status !== 'completed' && task.status !== 'cancelled';

export const SidebarCalendarList = ({
  account,
  tasks,
  activeCalendarId,
  contextMenu,
  isAnyModalOpen,
  isAnyAccountDragging,
  showTaskCounts,
  calendarSortConfig,
  onContextMenu,
  onSelectCalendar,
}: SidebarCalendarListProps) => {
  const reorderMutation = useReorderCalendars();
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [isAnyCalendarDragging, setIsAnyCalendarDragging] = useState(false);
  const calendarDragBoundsRef = useRef<HTMLDivElement>(null);

  const getTaskCount = (calendarId: string) =>
    tasks.filter((t) => t.calendarId === calendarId && isActiveTask(t)).length;

  const restrictCalendarDragToList = useCallback<Modifier>(({ draggingNodeRect, transform }) => {
    const bounds = calendarDragBoundsRef.current?.getBoundingClientRect();
    if (!bounds || !draggingNodeRect) return transform;

    return {
      ...transform,
      x: Math.min(
        Math.max(transform.x, bounds.left - draggingNodeRect.left),
        bounds.right - draggingNodeRect.right,
      ),
      y: Math.min(
        Math.max(transform.y, bounds.top - draggingNodeRect.top),
        bounds.bottom - draggingNodeRect.bottom,
      ),
    };
  }, []);

  const sortedCalendars = (() => {
    const cals = [...account.calendars];
    if (calendarSortConfig.mode === 'title') {
      cals.sort((a, b) => {
        const cmp = a.displayName.localeCompare(b.displayName);
        return calendarSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    } else if (calendarSortConfig.mode === 'task-count') {
      cals.sort((a, b) => {
        const cmp = getTaskCount(a.id) - getTaskCount(b.id);
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
      <div className="px-3 py-1 text-sm text-surface-500 dark:text-surface-400">
        No calendars yet.
      </div>
    );
  }

  const sharedItemProps = (calendar: Calendar) => {
    const isActive = activeCalendarId === calendar.id;
    const calendarColor = calendar.color ? resolveAccent(calendar.color) : resolvedAccentColor;
    return {
      calendar,
      isActive,
      isContextMenuOpen: contextMenu?.type === 'calendar' && contextMenu.id === calendar.id,
      isAnyModalOpen,
      isAnyAccountDragging,
      isAnyCalendarDragging,
      taskCount: getTaskCount(calendar.id),
      showTaskCount: showTaskCounts,
      calendarColor,
      onSelect: () => onSelectCalendar(account.id, calendar.id),
      onContextMenu: (e: MouseEvent) => onContextMenu(e, 'calendar', calendar.id, account.id),
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
      <div ref={calendarDragBoundsRef} className="space-y-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictCalendarDragToList]}
          onDragStart={() => setIsAnyCalendarDragging(true)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setIsAnyCalendarDragging(false)}
        >
          <SortableContext
            items={sortedCalendars.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedCalendars.map((calendar) => (
              <SidebarCalendarItem key={calendar.id} {...sharedItemProps(calendar)} sortable />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  return (
    <div ref={calendarDragBoundsRef} className="space-y-1">
      {sortedCalendars.map((calendar) => (
        <SidebarCalendarItem key={calendar.id} {...sharedItemProps(calendar)} />
      ))}
    </div>
  );
};
