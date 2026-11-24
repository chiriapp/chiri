import { useSortable } from '@dnd-kit/sortable';
import type { HTMLAttributes, ReactNode } from 'react';

interface SidebarCollapsedSortableItemProps {
  id: string;
  sortable: boolean;
  isAnyDragging: boolean;
  children: (dragHandleProps?: HTMLAttributes<HTMLButtonElement>) => ReactNode;
}

export const SidebarCollapsedSortableItem = ({
  id,
  sortable,
  isAnyDragging,
  children,
}: SidebarCollapsedSortableItemProps) => {
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
      className={`cursor-grab overflow-hidden rounded-xl active:cursor-grabbing ${isDragging ? 'opacity-50' : ''} ${
        isAnyDragging && !isDragging ? 'pointer-events-none' : ''
      }`}
    >
      {children(dragHandleProps)}
    </div>
  );
};
