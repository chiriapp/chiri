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
import { SidebarTagItem } from '$components/sidebar/SidebarTagItem';
import { SidebarTagsSortMenu } from '$components/sidebar/SidebarTagsSortMenu';
import { Tooltip } from '$components/Tooltip';
import { useReorderTags } from '$hooks/queries/useTags';
import { useTagSortConfig } from '$hooks/queries/useUIState';
import type { Tag, Task } from '$types';

interface SidebarTagsListProps {
  tags: Tag[];
  tasks: Task[];
  activeTagId: string | null;
  contextMenu: { type: string; id: string } | null;
  isAnyModalOpen: boolean;
  tagsSectionCollapsed: boolean;
  onToggleTagsSection: () => void;
  onSelectTag: (tagId: string) => void;
  onContextMenu: (
    e: MouseEvent,
    type: 'account' | 'calendar' | 'tag' | 'accounts-section',
    id: string,
    accountId?: string,
  ) => void;
  onAddTag: () => void;
}

const isActiveTask = (task: Task) =>
  !task.deletedAt && task.status !== 'completed' && task.status !== 'cancelled';

export const SidebarTagsList = ({
  tags,
  tasks,
  activeTagId,
  contextMenu,
  isAnyModalOpen,
  tagsSectionCollapsed,
  onToggleTagsSection,
  onSelectTag,
  onContextMenu,
  onAddTag,
}: SidebarTagsListProps) => {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isAnyTagDragging, setIsAnyTagDragging] = useState(false);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const tagsDragBoundsRef = useRef<HTMLDivElement>(null);
  const tagSortConfig = useTagSortConfig();
  const reorderMutation = useReorderTags();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const closeSortMenu = useCallback(() => setShowSortMenu(false), []);

  const getTagTaskCount = (tagId: string) =>
    tasks.filter((t) => (t.tags || []).includes(tagId) && isActiveTask(t)).length;

  const sortedTags = (() => {
    const sorted = [...tags];
    if (tagSortConfig.mode === 'title') {
      sorted.sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return tagSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    } else if (tagSortConfig.mode === 'task-count') {
      sorted.sort((a, b) => {
        const cmp = getTagTaskCount(a.id) - getTagTaskCount(b.id);
        return tagSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      // manual: use sortOrder
      sorted.sort((a, b) => {
        const cmp = a.sortOrder - b.sortOrder;
        return tagSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    }
    return sorted;
  })();

  const sharedItemProps = (tag: Tag) => {
    const isActive = activeTagId === tag.id;
    return {
      tag,
      isActive,
      isContextMenuOpen: contextMenu?.type === 'tag' && contextMenu.id === tag.id,
      isAnyModalOpen,
      isAnyTagDragging,
      taskCount: getTagTaskCount(tag.id),
      onSelect: () => onSelectTag(tag.id),
      onContextMenu: (e: MouseEvent) => onContextMenu(e, 'tag', tag.id),
    };
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsAnyTagDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderMutation.mutate({ activeId: active.id as string, overId: over.id as string });
  };

  const restrictTagDragToSection = useCallback<Modifier>(({ draggingNodeRect, transform }) => {
    const bounds = tagsDragBoundsRef.current?.getBoundingClientRect();
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
    <div>
      <div className="relative">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleTagsSection}
            aria-expanded={!tagsSectionCollapsed}
            className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-left outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:hover:bg-surface-700"
          >
            <ChevronDown
              className={`h-4 w-4 text-surface-400 motion-safe:transition-transform motion-safe:duration-200 ${tagsSectionCollapsed ? '-rotate-90' : 'rotate-0'}`}
            />
            <span className="font-semibold text-sm text-surface-500 dark:text-surface-400">
              Tags
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <Tooltip content="Tag order" position="top">
              <button
                ref={sortButtonRef}
                type="button"
                onClick={() => {
                  setShowSortMenu((v) => !v);
                }}
                className={`flex h-9 w-8 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                  showSortMenu
                    ? 'bg-surface-300 text-surface-700 dark:bg-surface-600 dark:text-surface-200'
                    : `text-surface-500 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-300 hover:text-surface-700 dark:hover:bg-surface-600 dark:hover:text-surface-300' : ''}`
                }`}
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </Tooltip>

            <Tooltip content="Add a new tag" position="top">
              <button
                type="button"
                onClick={() => {
                  onAddTag();
                }}
                className={`flex h-9 w-8 shrink-0 items-center justify-center rounded-lg ${!isAnyModalOpen ? 'hover:bg-surface-300 hover:text-surface-700 dark:hover:bg-surface-600 dark:hover:text-surface-300' : ''} text-surface-500 outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {showSortMenu && (
          <SidebarTagsSortMenu
            anchorRef={sortButtonRef}
            tagSortConfig={tagSortConfig}
            onClose={closeSortMenu}
          />
        )}
      </div>

      <div
        className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-in-out ${tagsSectionCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'} pt-1`}
      >
        <div
          className="overflow-hidden"
          aria-hidden={tagsSectionCollapsed}
          inert={tagsSectionCollapsed}
        >
          {tags.length === 0 ? (
            <div className="px-3 py-1 text-sm text-surface-500 dark:text-surface-400">
              No tags. Click + to add one!
            </div>
          ) : tagSortConfig.mode === 'manual' ? (
            <div ref={tagsDragBoundsRef} className="space-y-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictTagDragToSection]}
                onDragStart={() => setIsAnyTagDragging(true)}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setIsAnyTagDragging(false)}
              >
                <SortableContext
                  items={sortedTags.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedTags.map((tag) => (
                    <SidebarTagItem key={tag.id} {...sharedItemProps(tag)} sortable />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            <div ref={tagsDragBoundsRef} className="space-y-1">
              {sortedTags.map((tag) => (
                <SidebarTagItem key={tag.id} {...sharedItemProps(tag)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
