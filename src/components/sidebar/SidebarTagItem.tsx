import { useSortable } from '@dnd-kit/sortable';
import { getFallbackItemColor } from '$constants/colorSchemes';
import { getIconByName } from '$constants/icons';
import type { Tag } from '$types';

export interface SidebarTagItemProps {
  tag: Tag;
  isActive: boolean;
  isContextMenuOpen: boolean;
  isAnyModalOpen: boolean;
  taskCount: number;
  isAnyTagDragging?: boolean;
  sortable?: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const SidebarTagItem = ({
  tag,
  isActive,
  isContextMenuOpen,
  isAnyModalOpen,
  taskCount,
  isAnyTagDragging,
  sortable = false,
  onSelect,
  onContextMenu,
}: SidebarTagItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: tag.id,
    disabled: !sortable,
  });
  const TagIcon = getIconByName(tag.icon ?? 'tag');
  const tagColor = tag.color ?? getFallbackItemColor();
  const transformStr =
    sortable && transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
      : undefined;
  const dragHandleProps = sortable
    ? ({ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>)
    : undefined;

  const item = (
    <button
      type="button"
      data-context-menu
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
        isActive
          ? 'bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100'
          : `text-surface-600 dark:text-surface-400 ${
              isContextMenuOpen
                ? 'bg-surface-200 dark:bg-surface-700'
                : !isAnyModalOpen && !isAnyTagDragging
                  ? 'hover:bg-surface-200 dark:hover:bg-surface-700'
                  : ''
            }`
      } ${isDragging ? 'opacity-50' : ''} ${isAnyTagDragging && !isDragging ? 'pointer-events-none' : ''}`}
      {...dragHandleProps}
    >
      {tag.emoji ? (
        <span className="text-xs leading-none" style={{ color: tagColor }}>
          {tag.emoji}
        </span>
      ) : (
        <TagIcon className="w-3.5 h-3.5" style={{ color: tagColor }} />
      )}
      <span className="flex-1 text-left truncate">{tag.name}</span>
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
