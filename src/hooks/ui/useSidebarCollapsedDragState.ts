import {
  type Modifier,
  PointerSensor,
  type SensorDescriptor,
  type SensorOptions,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { type RefObject, useCallback, useRef, useState } from 'react';

export type SidebarCollapsedSensors = SensorDescriptor<SensorOptions>[];

export const useSidebarCollapsedDragState = () => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const filtersDragBoundsRef = useRef<HTMLDivElement>(null);
  const localCalendarsDragBoundsRef = useRef<HTMLDivElement>(null);
  const accountsCalendarsDragBoundsRef = useRef<HTMLDivElement>(null);
  const tagsDragBoundsRef = useRef<HTMLDivElement>(null);
  const [isDraggingFilters, setIsDraggingFilters] = useState(false);
  const [draggingCalendarAccountId, setDraggingCalendarAccountId] = useState<string | null>(null);
  const [isDraggingTags, setIsDraggingTags] = useState(false);

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

  return {
    sensors,
    filtersDragBoundsRef,
    localCalendarsDragBoundsRef,
    accountsCalendarsDragBoundsRef,
    tagsDragBoundsRef,
    isDraggingFilters,
    setIsDraggingFilters,
    draggingCalendarAccountId,
    setDraggingCalendarAccountId,
    isDraggingTags,
    setIsDraggingTags,
    isAnyCollapsedItemDragging:
      isDraggingFilters || draggingCalendarAccountId !== null || isDraggingTags,
    restrictFilterDragToSection: restrictDragToBounds(filtersDragBoundsRef),
    restrictLocalCalendarDragToSection: restrictDragToBounds(localCalendarsDragBoundsRef),
    restrictAccountCalendarDragToSection: restrictDragToBounds(accountsCalendarsDragBoundsRef),
    restrictTagDragToSection: restrictDragToBounds(tagsDragBoundsRef),
  };
};
