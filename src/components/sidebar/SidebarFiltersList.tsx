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
import ArrowUpDown from 'lucide-react/icons/arrow-up-down';
import ChevronDown from 'lucide-react/icons/chevron-down';
import Plus from 'lucide-react/icons/plus';
import { type MouseEvent, useCallback, useRef, useState } from 'react';
import { SidebarFilterItem } from '$components/sidebar/SidebarFilterItem';
import { SidebarFiltersSortMenu } from '$components/sidebar/SidebarFiltersSortMenu';
import { Tooltip } from '$components/Tooltip';
import { useReorderFilters } from '$hooks/queries/useFilters';
import { useFilterSortConfig } from '$hooks/queries/useUIState';
import { matchesFilter } from '$lib/task/filtering';
import type { Filter } from '$types/filter';
import type { Task } from '$types/task/model';

interface SidebarFiltersListProps {
  filters: Filter[];
  tasks: Task[];
  activeFilterId: string | null;
  contextMenu: { type: string; id: string } | null;
  isAnyModalOpen: boolean;
  showTaskCounts: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onSelectFilter: (filterId: string) => void;
  onAddFilter: () => void;
  onContextMenu: (e: MouseEvent, type: 'filter', id: string) => void;
}

const isActiveTask = (task: Task) =>
  !task.deletedAt && task.status !== 'completed' && task.status !== 'cancelled';

export const SidebarFiltersList = ({
  filters,
  tasks,
  activeFilterId,
  contextMenu,
  isAnyModalOpen,
  showTaskCounts,
  collapsed,
  onToggle,
  onSelectFilter,
  onAddFilter,
  onContextMenu,
}: SidebarFiltersListProps) => {
  const [isAnyFilterDragging, setIsAnyFilterDragging] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const filtersDragBoundsRef = useRef<HTMLDivElement>(null);
  const reorderMutation = useReorderFilters();
  const filterSortConfig = useFilterSortConfig();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const getFilterTaskCount = (filter: Filter) =>
    tasks.filter((task) => isActiveTask(task) && matchesFilter(task, filter)).length;

  const filterTaskCounts = new Map(
    filters.map((filter) => [filter.id, getFilterTaskCount(filter)] as const),
  );
  const sortedFilters = [...filters].sort((a, b) => {
    let cmp = 0;
    if (filterSortConfig.mode === 'title') {
      cmp = a.name.localeCompare(b.name);
    } else if (filterSortConfig.mode === 'task-count') {
      cmp = (filterTaskCounts.get(a.id) ?? 0) - (filterTaskCounts.get(b.id) ?? 0);
    } else {
      cmp = a.sortOrder - b.sortOrder;
    }
    return filterSortConfig.direction === 'desc' ? -cmp : cmp;
  });

  const handleDragEnd = (event: DragEndEvent) => {
    setIsAnyFilterDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderMutation.mutate({ activeId: active.id as string, overId: over.id as string });
  };

  const restrictFilterDragToSection = useCallback<Modifier>(({ draggingNodeRect, transform }) => {
    const bounds = filtersDragBoundsRef.current?.getBoundingClientRect();
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

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-left outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:hover:bg-surface-700"
        >
          <ChevronDown
            className={`h-4 w-4 text-surface-500 motion-safe:transition-transform motion-safe:duration-200 dark:text-surface-400 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
          />
          <span className="font-semibold text-sm text-surface-500 dark:text-surface-400">
            Filters
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <Tooltip content="Filter order" position="top">
            <button
              ref={sortButtonRef}
              type="button"
              onClick={() => setShowSortMenu((value) => !value)}
              aria-label="Sort filters"
              className={`flex h-9 w-8 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
                showSortMenu
                  ? 'bg-surface-300 text-surface-700 dark:bg-surface-600 dark:text-surface-200'
                  : `text-surface-500 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-300 hover:text-surface-700 dark:hover:bg-surface-600 dark:hover:text-surface-300' : ''}`
              }`}
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </Tooltip>

          <Tooltip content="Add filter" position="top" triggerClassName="shrink-0">
            <button
              type="button"
              onClick={() => onAddFilter()}
              className={`flex h-9 w-8 shrink-0 items-center justify-center rounded-lg ${!isAnyModalOpen ? 'hover:bg-surface-300 hover:text-surface-700 dark:hover:bg-surface-600 dark:hover:text-surface-300' : ''} text-surface-500 outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-400`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {showSortMenu && (
        <SidebarFiltersSortMenu
          anchorRef={sortButtonRef}
          filterSortConfig={filterSortConfig}
          onClose={() => setShowSortMenu(false)}
        />
      )}

      <div
        className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-in-out ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'} pt-1`}
      >
        <div className="space-y-1 overflow-hidden" aria-hidden={collapsed} inert={collapsed}>
          {filters.length === 0 ? (
            <div className="px-3 py-1 text-sm text-surface-500 dark:text-surface-400">
              No filters. Click + to add one.
            </div>
          ) : (
            <div ref={filtersDragBoundsRef}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictFilterDragToSection]}
                onDragStart={() => setIsAnyFilterDragging(true)}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setIsAnyFilterDragging(false)}
              >
                <div className="space-y-1">
                  <SortableContext
                    items={sortedFilters.map((filter) => filter.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedFilters.map((filter) => (
                      <SidebarFilterItem
                        key={filter.id}
                        filter={filter}
                        isActive={activeFilterId === filter.id}
                        isContextMenuOpen={
                          contextMenu?.type === 'filter' && contextMenu.id === filter.id
                        }
                        isAnyModalOpen={isAnyModalOpen}
                        isAnyFilterDragging={isAnyFilterDragging}
                        taskCount={filterTaskCounts.get(filter.id) ?? 0}
                        showTaskCount={showTaskCounts}
                        sortable={filterSortConfig.mode === 'manual'}
                        onSelect={() => onSelectFilter(filter.id)}
                        onContextMenu={(e) => onContextMenu(e, 'filter', filter.id)}
                      />
                    ))}
                  </SortableContext>
                </div>
              </DndContext>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
