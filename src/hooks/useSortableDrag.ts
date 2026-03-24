import {
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReorderTasks } from '$hooks/queries/useTasks';
import { TASK_LIST_INDENT_SHIFT_SIZE } from '$utils/constants';
import type { FlattenedTask } from '$utils/tree';

export const truncateName = (name: string, maxLength = 20): string => {
  if (name.length <= maxLength) return name;
  return `${name.substring(0, maxLength - 1)}…`;
};

interface UseSortableDragOptions {
  flattenedItems: FlattenedTask[];
  /** Minimum allowed indent level. 0 for root-level lists, 1 for subtask editors. */
  minIndent?: number;
}

export const useSortableDrag = ({ flattenedItems, minIndent = 0 }: UseSortableDragOptions) => {
  const reorderTasksMutation = useReorderTasks();

  const [activeItem, setActiveItem] = useState<FlattenedTask | null>(null);
  const [targetIndent, setTargetIndent] = useState(0);
  const [targetParentName, setTargetParentName] = useState<string | null>(null);
  const originalIndentRef = useRef(0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Hide carried children of the dragged item during drag to avoid empty space
  const visibleItems = useMemo(() => {
    if (!activeItem) return flattenedItems;
    return flattenedItems.filter((t) => !t.ancestorIds.includes(activeItem.id));
  }, [flattenedItems, activeItem]);

  // Clear active item if it no longer exists (e.g. deleted during drag)
  useEffect(() => {
    if (activeItem && !flattenedItems.find((t) => t.id === activeItem.id)) {
      setActiveItem(null);
      setTargetIndent(0);
      setTargetParentName(null);
    }
  }, [activeItem, flattenedItems]);

  // Adds `is-dragging`, which suppresses hover states on all child elements.
  // TODO: We could optimize this by not relying on useEffect
  useEffect(() => {
    if (activeItem) {
      document.documentElement.classList.add('is-dragging');
      return () => document.documentElement.classList.remove('is-dragging');
    }
  }, [activeItem]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const item = flattenedItems.find((t) => t.id === event.active.id);
      if (item) {
        setActiveItem(item);
        originalIndentRef.current = item.depth;
        setTargetIndent(item.depth);
      }
    },
    [flattenedItems],
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { active, over } = event;
      if (!activeItem || !over) return;

      const activeIndex = visibleItems.findIndex((t) => t.id === active.id);
      const overIndex = visibleItems.findIndex((t) => t.id === over.id);
      if (activeIndex === -1 || overIndex === -1) return;

      const taskAboveIndex =
        activeIndex < overIndex
          ? overIndex
          : activeIndex > overIndex
            ? overIndex - 1
            : activeIndex - 1;

      let maxIndent = minIndent;
      for (let i = taskAboveIndex; i >= 0; i--) {
        const t = visibleItems[i];
        if (t.id !== active.id) {
          maxIndent = t.depth + 1;
          break;
        }
      }

      const indentDelta = Math.round(event.delta.x / TASK_LIST_INDENT_SHIFT_SIZE);
      const newIndent = Math.max(
        minIndent,
        Math.min(maxIndent, originalIndentRef.current + indentDelta),
      );
      setTargetIndent(newIndent);

      let parentName: string | null = null;
      for (let i = taskAboveIndex; i >= 0; i--) {
        const t = visibleItems[i];
        if (t.id !== active.id && t.depth === newIndent - 1) {
          parentName = t.title || 'Untitled';
          break;
        }
      }
      setTargetParentName(parentName);
    },
    [activeItem, visibleItems, minIndent],
  );

  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
    setTargetIndent(0);
    setTargetParentName(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const finalIndent = targetIndent;
      setActiveItem(null);
      setTargetIndent(0);
      setTargetParentName(null);

      if (!over) return;

      const overAncestorIds = (over.data.current?.ancestorIds as string[]) ?? [];
      if (overAncestorIds.includes(active.id as string)) return;

      const activeIndex = visibleItems.findIndex((t) => t.id === active.id);
      const overIndex = visibleItems.findIndex((t) => t.id === over.id);
      if (activeIndex === -1 || overIndex === -1) return;

      const activeListItem = visibleItems[activeIndex];
      if (active.id === over.id && activeListItem.depth === finalIndent) return;

      reorderTasksMutation.mutate({
        activeId: active.id as string,
        overId: over.id as string,
        flattenedItems: visibleItems,
        targetIndent: finalIndent,
      });
    },
    [visibleItems, reorderTasksMutation, targetIndent],
  );

  return {
    activeItem,
    targetIndent,
    targetParentName,
    originalIndentRef,
    visibleItems,
    sensors,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  };
};
