import { useSortable } from '@dnd-kit/sortable';
import type { HTMLAttributes, MouseEvent } from 'react';
import { getIconByName } from '$constants/icons';
import { useAccentColorResolver, useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import type { Filter } from '$types/filter';

interface SidebarFilterItemProps {
  filter: Filter;
  isActive: boolean;
  isContextMenuOpen: boolean;
  isAnyModalOpen: boolean;
  isAnyFilterDragging?: boolean;
  taskCount: number;
  showTaskCount: boolean;
  sortable?: boolean;
  onSelect: () => void;
  onContextMenu: (e: MouseEvent) => void;
}

export const SidebarFilterItem = ({
  filter,
  isActive,
  isContextMenuOpen,
  isAnyModalOpen,
  isAnyFilterDragging,
  taskCount,
  showTaskCount,
  sortable = false,
  onSelect,
  onContextMenu,
}: SidebarFilterItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: filter.id,
    disabled: !sortable,
  });
  const FilterIcon = getIconByName(filter.icon ?? 'list-todo');
  const resolveAccent = useAccentColorResolver();
  const resolvedAccentColor = useResolvedAccentColor();
  const filterColor = filter.color ? resolveAccent(filter.color) : resolvedAccentColor;
  const transformStr =
    sortable && transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
      : undefined;
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
                : !isAnyModalOpen && !isAnyFilterDragging
                  ? 'hover:bg-surface-200 dark:hover:bg-surface-700'
                  : ''
            }`
      } ${isDragging ? 'opacity-50' : ''} ${isAnyFilterDragging && !isDragging ? 'pointer-events-none' : ''}`}
      {...dragHandleProps}
    >
      {filter.emoji ? (
        <span className="text-xs leading-none" style={{ color: filterColor }}>
          {filter.emoji}
        </span>
      ) : (
        <FilterIcon className="h-3.5 w-3.5" style={{ color: filterColor }} />
      )}
      <span className="flex-1 truncate text-left">{filter.name}</span>
      {showTaskCount && <span className="text-xs">{taskCount}</span>}
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
