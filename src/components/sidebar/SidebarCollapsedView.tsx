import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Download from 'lucide-react/icons/download';
import Import from 'lucide-react/icons/import';
import Inbox from 'lucide-react/icons/inbox';
import Settings from 'lucide-react/icons/settings';
import Trash2 from 'lucide-react/icons/trash-2';
import {
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useRef,
  useState,
} from 'react';
import { SidebarCollapsedItemTooltip } from '$components/sidebar/SidebarCollapsedItemTooltip';
import { Tooltip } from '$components/Tooltip';
import { getIconByName } from '$constants/icons';
import { useReorderAccounts, useReorderCalendars } from '$hooks/queries/useAccounts';
import { useReorderFilters } from '$hooks/queries/useFilters';
import { useReorderTags } from '$hooks/queries/useTags';
import {
  useAccountSortConfig,
  useCalendarSortConfig,
  useTagSortConfig,
} from '$hooks/queries/useUIState';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { Account, Calendar, Tag, Task } from '$types';
import type { Filter } from '$types/filter';

interface SidebarCollapsedViewProps {
  accounts: Account[];
  tags: Tag[];
  filters: Filter[];
  tasks: Task[];
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
    type: 'account' | 'calendar' | 'tag' | 'filter',
    id: string,
    accountId?: string,
  ) => void;
  onOpenImport?: () => void;
  onOpenSettings?: () => void;
  onUpdateClick?: () => void;
}

interface CollapsedSortableItemProps {
  id: string;
  sortable: boolean;
  isAnyDragging: boolean;
  children: (dragHandleProps?: HTMLAttributes<HTMLButtonElement>) => ReactNode;
}

const isActiveTask = (task: Task) =>
  !task.deletedAt && task.status !== 'completed' && task.status !== 'cancelled';

const getTaskCount = (tasks: Task[], predicate: (task: Task) => boolean) =>
  tasks.filter((task) => isActiveTask(task) && predicate(task)).length;

const CollapsedSortableItem = ({
  id,
  sortable,
  isAnyDragging,
  children,
}: CollapsedSortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id,
    disabled: !sortable,
  });
  const transformStr =
    sortable && transform
      ? `translate3d(0, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
      : undefined;
  const dragHandleProps = sortable
    ? ({ ...attributes, ...listeners } as HTMLAttributes<HTMLButtonElement>)
    : undefined;

  if (!sortable) return children();

  return (
    <div
      ref={setNodeRef}
      style={{ transform: transformStr }}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''} ${
        isAnyDragging && !isDragging ? 'pointer-events-none' : ''
      }`}
    >
      {children(dragHandleProps)}
    </div>
  );
};

export const SidebarCollapsedView = ({
  accounts,
  tags,
  filters,
  tasks,
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
  const accountSortConfig = useAccountSortConfig();
  const calendarSortConfig = useCalendarSortConfig();
  const tagSortConfig = useTagSortConfig();
  const reorderAccountsMutation = useReorderAccounts();
  const reorderCalendarsMutation = useReorderCalendars();
  const reorderFiltersMutation = useReorderFilters();
  const reorderTagsMutation = useReorderTags();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const filtersDragBoundsRef = useRef<HTMLDivElement>(null);
  const accountsDragBoundsRef = useRef<HTMLDivElement>(null);
  const tagsDragBoundsRef = useRef<HTMLDivElement>(null);
  const [isDraggingFilters, setIsDraggingFilters] = useState(false);
  const [isDraggingAccounts, setIsDraggingAccounts] = useState(false);
  const [draggingCalendarAccountId, setDraggingCalendarAccountId] = useState<string | null>(null);
  const [isDraggingTags, setIsDraggingTags] = useState(false);
  const isAnyCollapsedItemDragging =
    isDraggingFilters || isDraggingAccounts || draggingCalendarAccountId !== null || isDraggingTags;

  const restrictDragToBounds = useCallback(
    (boundsRef: RefObject<HTMLDivElement | null>): Modifier =>
      ({ draggingNodeRect, transform }) => {
        const bounds = boundsRef.current?.getBoundingClientRect();
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
      },
    [],
  );
  const restrictFilterDragToSection = restrictDragToBounds(filtersDragBoundsRef);
  const restrictAccountDragToSection = restrictDragToBounds(accountsDragBoundsRef);
  const restrictTagDragToSection = restrictDragToBounds(tagsDragBoundsRef);

  const sortedFilters = [...filters].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedAccounts = (() => {
    const sorted = [...accounts];
    if (accountSortConfig.mode === 'title') {
      sorted.sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return accountSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    } else if (accountSortConfig.mode === 'task-count') {
      sorted.sort((a, b) => {
        const cmp =
          getTaskCount(tasks, (task) => task.accountId === a.id) -
          getTaskCount(tasks, (task) => task.accountId === b.id);
        return accountSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    } else if (accountSortConfig.mode === 'calendar-count') {
      sorted.sort((a, b) => {
        const cmp = a.calendars.length - b.calendars.length;
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
  const sortedTags = (() => {
    const sorted = [...tags];
    if (tagSortConfig.mode === 'title') {
      sorted.sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return tagSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    } else if (tagSortConfig.mode === 'task-count') {
      sorted.sort((a, b) => {
        const cmp =
          getTaskCount(tasks, (task) => (task.tags ?? []).includes(a.id)) -
          getTaskCount(tasks, (task) => (task.tags ?? []).includes(b.id));
        return tagSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      sorted.sort((a, b) => {
        const cmp = a.sortOrder - b.sortOrder;
        return tagSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    }
    return sorted;
  })();

  const getSortedCalendars = (calendars: Calendar[]) => {
    const sorted = [...calendars];
    if (calendarSortConfig.mode === 'title') {
      sorted.sort((a, b) => {
        const cmp = a.displayName.localeCompare(b.displayName);
        return calendarSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    } else if (calendarSortConfig.mode === 'task-count') {
      sorted.sort((a, b) => {
        const cmp =
          getTaskCount(tasks, (task) => task.calendarId === a.id) -
          getTaskCount(tasks, (task) => task.calendarId === b.id);
        return calendarSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      sorted.sort((a, b) => {
        const cmp = a.sortOrder - b.sortOrder;
        return calendarSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    }
    return sorted;
  };

  const handleFilterDragEnd = (event: DragEndEvent) => {
    setIsDraggingFilters(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderFiltersMutation.mutate({ activeId: active.id as string, overId: over.id as string });
  };

  const handleAccountDragEnd = (event: DragEndEvent) => {
    setIsDraggingAccounts(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderAccountsMutation.mutate({ activeId: active.id as string, overId: over.id as string });
  };

  const handleCalendarDragEnd = (accountId: string, event: DragEndEvent) => {
    setDraggingCalendarAccountId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderCalendarsMutation.mutate({
      accountId,
      activeId: active.id as string,
      overId: over.id as string,
    });
  };

  const handleTagDragEnd = (event: DragEndEvent) => {
    setIsDraggingTags(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderTagsMutation.mutate({ activeId: active.id as string, overId: over.id as string });
  };

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
        <Tooltip content="All Tasks" position="right" disabled={isAnyCollapsedItemDragging}>
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

        <Tooltip content="Recently Deleted" position="right" disabled={isAnyCollapsedItemDragging}>
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
          (sortedFilters.length > 0 ? (
            <div ref={filtersDragBoundsRef} className="flex flex-col items-center gap-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictFilterDragToSection]}
                onDragStart={() => setIsDraggingFilters(true)}
                onDragEnd={handleFilterDragEnd}
                onDragCancel={() => setIsDraggingFilters(false)}
              >
                <SortableContext
                  items={sortedFilters.map((filter) => filter.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedFilters.map((filter) => {
                    const isActive = activeFilterId === filter.id;
                    const FilterIcon = getIconByName(filter.icon ?? 'list-todo');
                    const filterColor = filter.color
                      ? resolveAccent(filter.color)
                      : resolvedAccentColor;
                    return (
                      <Tooltip
                        key={filter.id}
                        content={<SidebarCollapsedItemTooltip name={filter.name} type="Filter" />}
                        position="right"
                        disabled={isAnyCollapsedItemDragging}
                      >
                        <CollapsedSortableItem
                          id={filter.id}
                          sortable
                          isAnyDragging={isDraggingFilters}
                        >
                          {(dragHandleProps) => (
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
                              {...dragHandleProps}
                            >
                              {filter.emoji ? (
                                <span
                                  className="text-base leading-none"
                                  style={{ color: filterColor }}
                                >
                                  {filter.emoji}
                                </span>
                              ) : (
                                <FilterIcon className="h-5 w-5" style={{ color: filterColor }} />
                              )}
                            </button>
                          )}
                        </CollapsedSortableItem>
                      </Tooltip>
                    );
                  })}
                </SortableContext>
              </DndContext>
            </div>
          ) : null)}

        <div ref={accountsDragBoundsRef} className="flex w-full flex-col items-center gap-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictAccountDragToSection]}
            onDragStart={() => setIsDraggingAccounts(true)}
            onDragEnd={handleAccountDragEnd}
            onDragCancel={() => setIsDraggingAccounts(false)}
          >
            <SortableContext
              items={sortedAccounts
                .filter(
                  (a) =>
                    (!a.caldav && !localSectionCollapsed) ||
                    (a.caldav && !accountsSectionCollapsed),
                )
                .map((account) => account.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedAccounts
                .filter(
                  (a) =>
                    (!a.caldav && !localSectionCollapsed) ||
                    (a.caldav && !accountsSectionCollapsed),
                )
                .map((account) => {
                  const sortedCalendars = getSortedCalendars(account.calendars);
                  const isAccountSortable = accountSortConfig.mode === 'manual' && !!account.caldav;
                  if (sortedCalendars.length === 0) return null;

                  return (
                    <div key={account.id} className="flex w-full flex-col items-center gap-1">
                      <CollapsedSortableItem
                        id={account.id}
                        sortable={isAccountSortable}
                        isAnyDragging={isDraggingAccounts}
                      >
                        {(dragHandleProps) => (
                          <button
                            type="button"
                            data-context-menu
                            aria-label={`${account.name} account`}
                            onContextMenu={(e) => onContextMenu(e, 'account', account.id)}
                            className={`my-1 h-px w-8 shrink-0 rounded-full bg-surface-200 outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 ${
                              isAccountSortable
                                ? 'cursor-grab hover:h-1 hover:bg-surface-300 active:cursor-grabbing dark:hover:bg-surface-600'
                                : ''
                            }`}
                            {...dragHandleProps}
                          />
                        )}
                      </CollapsedSortableItem>

                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictAccountDragToSection]}
                        onDragStart={() => setDraggingCalendarAccountId(account.id)}
                        onDragEnd={(event) => handleCalendarDragEnd(account.id, event)}
                        onDragCancel={() => setDraggingCalendarAccountId(null)}
                      >
                        <SortableContext
                          items={sortedCalendars.map((calendar) => calendar.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {sortedCalendars.map((calendar) => {
                            const CalendarIcon = getIconByName(calendar.icon ?? 'calendar');
                            const isActive = activeCalendarId === calendar.id;
                            const calendarColor = calendar.color
                              ? resolveAccent(calendar.color)
                              : resolvedAccentColor;
                            return (
                              <Tooltip
                                key={calendar.id}
                                content={
                                  <SidebarCollapsedItemTooltip
                                    name={calendar.displayName}
                                    type="Calendar"
                                  />
                                }
                                position="right"
                                disabled={isAnyCollapsedItemDragging}
                              >
                                <CollapsedSortableItem
                                  id={calendar.id}
                                  sortable={calendarSortConfig.mode === 'manual'}
                                  isAnyDragging={draggingCalendarAccountId === account.id}
                                >
                                  {(dragHandleProps) => (
                                    <button
                                      type="button"
                                      data-context-menu
                                      aria-label={`${calendar.displayName} calendar`}
                                      onClick={() => onSelectCalendar(account.id, calendar.id)}
                                      onContextMenu={(e) =>
                                        onContextMenu(e, 'calendar', calendar.id, account.id)
                                      }
                                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                                        isActive
                                          ? 'bg-surface-200 dark:bg-surface-700'
                                          : contextMenu?.type === 'calendar' &&
                                              contextMenu.id === calendar.id
                                            ? 'bg-surface-200 dark:bg-surface-700'
                                            : 'hover:bg-surface-200 dark:hover:bg-surface-700'
                                      }`}
                                      {...dragHandleProps}
                                    >
                                      {calendar.emoji ? (
                                        <span
                                          className="text-base leading-none"
                                          style={{ color: calendarColor }}
                                        >
                                          {calendar.emoji}
                                        </span>
                                      ) : (
                                        <CalendarIcon
                                          className="h-5 w-5"
                                          style={{ color: calendarColor }}
                                        />
                                      )}
                                    </button>
                                  )}
                                </CollapsedSortableItem>
                              </Tooltip>
                            );
                          })}
                        </SortableContext>
                      </DndContext>
                    </div>
                  );
                })}
            </SortableContext>
          </DndContext>
        </div>

        {!tagsSectionCollapsed && tags.length > 0 && (
          <div className="my-1 h-px w-8 shrink-0 bg-surface-200 dark:bg-surface-700" />
        )}

        {!tagsSectionCollapsed &&
          (sortedTags.length > 0 ? (
            <div ref={tagsDragBoundsRef} className="flex flex-col items-center gap-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictTagDragToSection]}
                onDragStart={() => setIsDraggingTags(true)}
                onDragEnd={handleTagDragEnd}
                onDragCancel={() => setIsDraggingTags(false)}
              >
                <SortableContext
                  items={sortedTags.map((tag) => tag.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedTags.map((tag) => {
                    const isActive = activeTagId === tag.id;
                    const TagIcon = getIconByName(tag.icon ?? 'tag');
                    const tagColor = tag.color ? resolveAccent(tag.color) : resolvedAccentColor;
                    return (
                      <Tooltip
                        key={tag.id}
                        content={<SidebarCollapsedItemTooltip name={tag.name} type="Tag" />}
                        position="right"
                        disabled={isAnyCollapsedItemDragging}
                      >
                        <CollapsedSortableItem
                          id={tag.id}
                          sortable={tagSortConfig.mode === 'manual'}
                          isAnyDragging={isDraggingTags}
                        >
                          {(dragHandleProps) => (
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
                              {...dragHandleProps}
                            >
                              {tag.emoji ? (
                                <span
                                  className="text-base leading-none"
                                  style={{ color: tagColor }}
                                >
                                  {tag.emoji}
                                </span>
                              ) : (
                                <TagIcon className="h-5 w-5" style={{ color: tagColor }} />
                              )}
                            </button>
                          )}
                        </CollapsedSortableItem>
                      </Tooltip>
                    );
                  })}
                </SortableContext>
              </DndContext>
            </div>
          ) : null)}
      </div>

      <div className="relative flex w-full shrink-0 flex-col items-center gap-1 bg-surface-100 px-1 py-2 dark:bg-surface-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-surface-100 to-transparent dark:from-surface-900"
        />
        <div aria-hidden="true" className="h-px w-8 shrink-0 bg-surface-200 dark:bg-surface-700" />
        {updateAvailable && (
          <Tooltip
            content="Update available!"
            position="right"
            disabled={isAnyCollapsedItemDragging}
          >
            <button
              type="button"
              onClick={() => onUpdateClick?.()}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-surface-500 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
            >
              <Download className="h-5 w-5 text-primary-500" />
            </button>
          </Tooltip>
        )}
        <Tooltip content={importTooltip} position="right" disabled={isAnyCollapsedItemDragging}>
          <button
            type="button"
            onClick={() => onOpenImport?.()}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-surface-500 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
          >
            <Import className="h-5 w-5" />
          </button>
        </Tooltip>
        <Tooltip content={settingsTooltip} position="right" disabled={isAnyCollapsedItemDragging}>
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
