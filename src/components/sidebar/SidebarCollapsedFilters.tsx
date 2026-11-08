import { closestCenter, DndContext, type DragEndEvent, type Modifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Funnel from 'lucide-react/icons/funnel';
import type { MouseEvent, RefObject } from 'react';
import { SidebarCollapsedSectionButton } from '$components/sidebar/SidebarCollapsedSectionButton';
import { SidebarCollapsedSortableItem } from '$components/sidebar/SidebarCollapsedSortableItem';
import { Tooltip } from '$components/Tooltip';
import { getIconByName } from '$constants/icons';
import { useReorderFilters } from '$hooks/queries/useFilters';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { SidebarCollapsedSensors } from '$hooks/ui/useSidebarCollapsedDragState';
import type { Filter } from '$types/filter';

interface SidebarCollapsedFiltersProps {
  filters: Filter[];
  activeFilterId: string | null;
  contextMenu: { type: string; id: string } | null;
  showFiltersSection: boolean;
  filtersSectionCollapsed: boolean;
  sensors: SidebarCollapsedSensors;
  dragBoundsRef: RefObject<HTMLDivElement | null>;
  restrictDragToSection: Modifier;
  isAnyDragging: boolean;
  onDraggingChange: (isDragging: boolean) => void;
  onToggleSection: () => void;
  onSelectFilter: (filterId: string) => void;
  onContextMenu: (event: MouseEvent, type: 'filter', id: string) => void;
}

export const SidebarCollapsedFilters = ({
  filters,
  activeFilterId,
  contextMenu,
  showFiltersSection,
  filtersSectionCollapsed,
  sensors,
  dragBoundsRef,
  restrictDragToSection,
  isAnyDragging,
  onDraggingChange,
  onToggleSection,
  onSelectFilter,
  onContextMenu,
}: SidebarCollapsedFiltersProps) => {
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const reorderMutation = useReorderFilters();
  const sortedFilters = [...filters].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDragEnd = (event: DragEndEvent) => {
    onDraggingChange(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderMutation.mutate({ activeId: active.id as string, overId: over.id as string });
  };

  if (!showFiltersSection) return null;

  return (
    <div className="flex w-full flex-col items-center">
      <SidebarCollapsedSectionButton
        label="Filters"
        icon={Funnel}
        collapsed={filtersSectionCollapsed}
        isAnyDragging={isAnyDragging}
        onToggle={onToggleSection}
      />
      <div
        className={`grid w-full motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-in-out ${filtersSectionCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'} pt-1`}
      >
        <div
          className="min-h-0 overflow-hidden"
          aria-hidden={filtersSectionCollapsed}
          inert={filtersSectionCollapsed}
        >
          {sortedFilters.length > 0 && (
            <div ref={dragBoundsRef} className="flex flex-col items-center gap-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictDragToSection]}
                onDragStart={() => onDraggingChange(true)}
                onDragEnd={handleDragEnd}
                onDragCancel={() => onDraggingChange(false)}
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
                        content={
                          <span className="flex flex-col whitespace-nowrap leading-tight">
                            <span>{filter.name}</span>
                            <span className="font-normal text-[10px] text-white/65">Filter</span>
                          </span>
                        }
                        position="right"
                        disabled={isAnyDragging}
                      >
                        <SidebarCollapsedSortableItem
                          id={filter.id}
                          sortable
                          isAnyDragging={isAnyDragging}
                        >
                          {(dragHandleProps) => (
                            <button
                              type="button"
                              data-context-menu
                              aria-label={`${filter.name} filter`}
                              onClick={() => onSelectFilter(filter.id)}
                              onContextMenu={(event) => onContextMenu(event, 'filter', filter.id)}
                              className={`flex size-10 shrink-0 items-center justify-center rounded-xl outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
                                isActive
                                  ? 'bg-surface-200 dark:bg-surface-700'
                                  : contextMenu?.type === 'filter' && contextMenu.id === filter.id
                                    ? 'bg-surface-200 dark:bg-surface-700'
                                    : 'bg-surface-200/50 hover:bg-surface-300/70 dark:bg-surface-800/50 dark:hover:bg-surface-700/70'
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
                        </SidebarCollapsedSortableItem>
                      </Tooltip>
                    );
                  })}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
