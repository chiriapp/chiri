import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';
import { SidebarCalendarItem } from '$components/sidebar/SidebarCalendarItem';
import { getFallbackItemColor } from '$constants/colorSchemes';
import { useReorderCalendars } from '$hooks/queries/useAccounts';
import type { Account, Calendar, CalendarSortConfig, Task } from '$types';

interface SidebarCalendarListProps {
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

const isActiveTask = (t: { status: string }) =>
  t.status !== 'completed' && t.status !== 'cancelled';

export const SidebarCalendarList = ({
  account,
  tasks,
  activeCalendarId,
  contextMenu,
  isAnyModalOpen,
  isAnyAccountDragging,
  calendarSortConfig,
  onContextMenu,
  onSelectCalendar,
}: SidebarCalendarListProps) => {
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
    const calendarColor = calendar.color ?? getFallbackItemColor();
    return {
      calendar,
      isActive,
      isContextMenuOpen: contextMenu?.type === 'calendar' && contextMenu.id === calendar.id,
      isAnyModalOpen,
      isAnyAccountDragging,
      isAnyCalendarDragging,
      taskCount: getTaskCount(calendar.id),
      calendarColor,
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
            <SidebarCalendarItem key={calendar.id} {...sharedItemProps(calendar)} sortable />
          ))}
        </SortableContext>
      </DndContext>
    );
  }

  return (
    <>
      {sortedCalendars.map((calendar) => (
        <SidebarCalendarItem key={calendar.id} {...sharedItemProps(calendar)} />
      ))}
    </>
  );
};
