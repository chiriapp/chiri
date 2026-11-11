import { closestCenter, DndContext, type DragEndEvent, type Modifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Tags from 'lucide-react/icons/tags';
import type { MouseEvent, RefObject } from 'react';
import { SidebarCollapsedSectionButton } from '$components/sidebar/SidebarCollapsedSectionButton';
import { SidebarCollapsedSortableItem } from '$components/sidebar/SidebarCollapsedSortableItem';
import { Tooltip } from '$components/Tooltip';
import { getIconByName } from '$constants/icons';
import { useReorderTags } from '$hooks/queries/useTags';
import { useTagSortConfig } from '$hooks/queries/useUIState';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { SidebarCollapsedSensors } from '$hooks/ui/useSidebarCollapsedDragState';
import { isActiveTask } from '$lib/task/status';
import type { Tag } from '$types/tag';
import type { Task } from '$types/task/model';

interface SidebarCollapsedTagsProps {
  tags: Tag[];
  tasks: Task[];
  activeTagId: string | null;
  contextMenu: { type: string; id: string } | null;
  showTagsSection: boolean;
  tagsSectionCollapsed: boolean;
  sensors: SidebarCollapsedSensors;
  dragBoundsRef: RefObject<HTMLDivElement | null>;
  restrictDragToSection: Modifier;
  isAnyDragging: boolean;
  onDraggingChange: (isDragging: boolean) => void;
  onToggleSection: () => void;
  onSelectTag: (tagId: string) => void;
  onContextMenu: (event: MouseEvent, type: 'tag', id: string) => void;
}

export const SidebarCollapsedTags = ({
  tags,
  tasks,
  activeTagId,
  contextMenu,
  showTagsSection,
  tagsSectionCollapsed,
  sensors,
  dragBoundsRef,
  restrictDragToSection,
  isAnyDragging,
  onDraggingChange,
  onToggleSection,
  onSelectTag,
  onContextMenu,
}: SidebarCollapsedTagsProps) => {
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const tagSortConfig = useTagSortConfig();
  const reorderMutation = useReorderTags();
  const getTaskCount = (tagId: string) =>
    tasks.filter((task) => (task.tags ?? []).includes(tagId) && isActiveTask(task)).length;
  const sortedTags = (() => {
    const sorted = [...tags];
    if (tagSortConfig.mode === 'title') {
      sorted.sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return tagSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    } else if (tagSortConfig.mode === 'task-count') {
      sorted.sort((a, b) => {
        const cmp = getTaskCount(a.id) - getTaskCount(b.id);
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
  const handleDragEnd = (event: DragEndEvent) => {
    onDraggingChange(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderMutation.mutate({ activeId: active.id as string, overId: over.id as string });
  };

  if (!showTagsSection) return null;

  return (
    <div className="flex w-full flex-col items-center">
      <SidebarCollapsedSectionButton
        label="Tags"
        icon={Tags}
        collapsed={tagsSectionCollapsed}
        isAnyDragging={isAnyDragging}
        onToggle={onToggleSection}
      />
      <div
        className={`grid w-full motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-in-out ${tagsSectionCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'} pt-1`}
      >
        <div
          className="min-h-0 overflow-hidden"
          aria-hidden={tagsSectionCollapsed}
          inert={tagsSectionCollapsed}
        >
          {sortedTags.length > 0 && (
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
                        content={
                          <span className="flex flex-col whitespace-nowrap leading-tight">
                            <span>{tag.name}</span>
                            <span className="font-normal text-[10px] text-white/65">Tag</span>
                          </span>
                        }
                        position="right"
                        disabled={isAnyDragging}
                      >
                        <SidebarCollapsedSortableItem
                          id={tag.id}
                          sortable={tagSortConfig.mode === 'manual'}
                          isAnyDragging={isAnyDragging}
                        >
                          {(dragHandleProps) => (
                            <button
                              type="button"
                              data-context-menu
                              aria-label={`${tag.name} tag`}
                              onClick={() => onSelectTag(tag.id)}
                              onContextMenu={(event) => onContextMenu(event, 'tag', tag.id)}
                              className={`flex size-10 shrink-0 items-center justify-center rounded-xl outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
                                isActive
                                  ? 'bg-surface-200 dark:bg-surface-700'
                                  : contextMenu?.type === 'tag' && contextMenu.id === tag.id
                                    ? 'bg-surface-200 dark:bg-surface-700'
                                    : 'bg-surface-200/50 hover:bg-surface-300/70 dark:bg-surface-800/50 dark:hover:bg-surface-700/70'
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
