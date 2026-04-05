import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortDesc from 'lucide-react/icons/arrow-down-wide-narrow';
import ArrowUpDown from 'lucide-react/icons/arrow-up-down';
import SortAsc from 'lucide-react/icons/arrow-up-narrow-wide';
import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Plus from 'lucide-react/icons/plus';
import { useEffect, useState } from 'react';
import { Tooltip } from '$components/Tooltip';
import { FALLBACK_ITEM_COLOR, TAG_SORT_OPTIONS } from '$constants';
import { getIconByName } from '$constants/icons';
import { useReorderTags } from '$hooks/queries/useTags';
import { useSetTagSortConfig, useTagSortConfig } from '$hooks/queries/useUIState';
import type { Tag, TagSortConfig, Task } from '$types';
import { getContrastTextColor } from '$utils/color';

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
    e: React.MouseEvent,
    type: 'account' | 'calendar' | 'tag' | 'accounts-section',
    id: string,
    accountId?: string,
  ) => void;
  onAddTag: () => void;
}

const isActiveTask = (t: { status: string }) =>
  t.status !== 'completed' && t.status !== 'cancelled';

interface TagItemContentProps {
  tag: Tag;
  isActive: boolean;
  isContextMenuOpen: boolean;
  isAnyModalOpen: boolean;
  taskCount: number;
  isAnyTagDragging?: boolean;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const TagItemContent = ({
  tag,
  isActive,
  isContextMenuOpen,
  isAnyModalOpen,
  taskCount,
  isAnyTagDragging,
  isDragging,
  dragHandleProps,
  onSelect,
  onContextMenu,
}: TagItemContentProps) => {
  const TagIcon = getIconByName(tag.icon ?? 'tag');
  const tagColor = tag.color ?? FALLBACK_ITEM_COLOR;

  return (
    <button
      type="button"
      data-context-menu
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
        isActive
          ? ''
          : `text-surface-600 dark:text-surface-400 ${
              isContextMenuOpen
                ? 'bg-surface-200 dark:bg-surface-700'
                : !isAnyModalOpen && !isAnyTagDragging
                  ? 'hover:bg-surface-200 dark:hover:bg-surface-700'
                  : ''
            }`
      } ${isDragging ? 'opacity-50' : ''} ${isAnyTagDragging && !isDragging ? 'pointer-events-none' : ''}`}
      style={
        isActive ? { backgroundColor: tagColor, color: getContrastTextColor(tagColor) } : undefined
      }
      {...dragHandleProps}
    >
      {tag.emoji ? (
        <span
          className="text-xs leading-none"
          style={{ color: isActive ? getContrastTextColor(tagColor) : tagColor }}
        >
          {tag.emoji}
        </span>
      ) : (
        <TagIcon
          className="w-3.5 h-3.5"
          style={{ color: isActive ? getContrastTextColor(tagColor) : tagColor }}
        />
      )}
      <span className="flex-1 text-left truncate">{tag.name}</span>
      <span className="text-xs">{taskCount}</span>
    </button>
  );
};

interface SortableTagItemProps
  extends Omit<TagItemContentProps, 'isDragging' | 'dragHandleProps'> {}

const SortableTagItem = (props: SortableTagItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: props.tag.id,
  });

  const transformStr = transform
    ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: transformStr }}
      className="cursor-grab active:cursor-grabbing"
    >
      <TagItemContent
        {...props}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLDivElement>}
      />
    </div>
  );
};

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
  const tagSortConfig = useTagSortConfig();
  const setTagSortConfigMutation = useSetTagSortConfig();
  const reorderMutation = useReorderTags();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const isDirectionDisabled = tagSortConfig.mode === 'manual';

  const handleSortModeChange = (mode: TagSortConfig['mode']) => {
    setTagSortConfigMutation.mutate({ ...tagSortConfig, mode });
  };

  const toggleSortDirection = () => {
    setTagSortConfigMutation.mutate({
      ...tagSortConfig,
      direction: tagSortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSortMenu) {
        setShowSortMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSortMenu]);

  const getTagTaskCount = (tagId: string) =>
    tasks.filter((t) => (t.tags || []).includes(tagId) && isActiveTask(t)).length;

  const sortedTags = (() => {
    const sorted = [...tags];
    if (tagSortConfig.mode === 'title') {
      sorted.sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
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
      onContextMenu: (e: React.MouseEvent) => onContextMenu(e, 'tag', tag.id),
    };
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsAnyTagDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderMutation.mutate({ activeId: active.id as string, overId: over.id as string });
  };

  return (
    <div>
      <div className="relative">
        {/* biome-ignore lint/a11y/useSemanticElements: Section header toggle div contains icon+text layout that button element can't replicate */}
        <div
          onClick={onToggleTagsSection}
          onKeyDown={(e) => e.key === 'Enter' && onToggleTagsSection()}
          role="button"
          tabIndex={0}
          className="flex items-center justify-between px-3.5 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
        >
          <div className="flex items-center gap-1.5">
            {tagsSectionCollapsed ? (
              <ChevronRight className="w-4 h-4 text-surface-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-surface-400" />
            )}
            <span className="text-sm font-semibold text-surface-500 dark:text-surface-400 tracking-wider">
              Tags
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip content="Tag order" position="top">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSortMenu((v) => !v);
                }}
                className={`p-1 rounded transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                  showSortMenu
                    ? 'bg-surface-300 dark:bg-surface-600 text-surface-700 dark:text-surface-200'
                    : `text-surface-500 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''}`
                }`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip content="Add a new tag" position="top">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddTag();
                }}
                className={`p-1 rounded-sm ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''} text-surface-500 dark:text-surface-400 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {showSortMenu && (
          <>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Sort menu backdrop for closing on outside click */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: Sort menu backdrop for closing on outside click */}
            <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
            <div
              data-context-menu-content
              className="absolute right-0 top-full mt-1 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 z-50 min-w-50 animate-scale-in"
            >
              <div className="py-2">
                <div className="px-3 pb-2 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Sort By
                </div>
                {TAG_SORT_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => handleSortModeChange(option.value)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                      tagSortConfig.mode === option.value
                        ? 'text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
                        : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                    }`}
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-surface-200 dark:border-surface-700">
                <div className="px-3 pb-2 pt-1 text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Sort Direction
                </div>
                <Tooltip
                  content={isDirectionDisabled ? 'Not available for manual sorting' : ''}
                  position="bottom"
                  allowInModal
                  className="whitespace-nowrap"
                  triggerClassName="w-full"
                >
                  <button
                    type="button"
                    onClick={isDirectionDisabled ? undefined : toggleSortDirection}
                    disabled={isDirectionDisabled}
                    className={`w-full flex rounded-b-md items-center justify-between gap-2 px-3 py-1.5 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                      isDirectionDisabled
                        ? 'text-surface-400 dark:text-surface-600 cursor-not-allowed'
                        : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {tagSortConfig.direction === 'asc' ? (
                        <SortAsc className="w-4 h-4" />
                      ) : (
                        <SortDesc className="w-4 h-4" />
                      )}
                      <span>{tagSortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}</span>
                    </div>
                  </button>
                </Tooltip>
              </div>
            </div>
          </>
        )}
      </div>

      {!tagsSectionCollapsed &&
        (tags.length === 0 ? (
          <div className="px-4 py-1 text-sm text-surface-500 dark:text-surface-400">
            No tags yet.
          </div>
        ) : tagSortConfig.mode === 'manual' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => setIsAnyTagDragging(true)}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedTags.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedTags.map((tag) => (
                <SortableTagItem key={tag.id} {...sharedItemProps(tag)} />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          sortedTags.map((tag) => <TagItemContent key={tag.id} {...sharedItemProps(tag)} />)
        ))}
    </div>
  );
};
