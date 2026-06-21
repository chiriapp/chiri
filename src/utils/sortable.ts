export const getSortableItemId = (id: string, isOverlay?: boolean) =>
  isOverlay ? `${id}:drag-overlay` : id;

// parent changes reshape dnd-kit ancestry without changing the task id, so the
// row's sortable hook needs a fresh mount when a task moves in or out of a parent
export const getSortableItemKey = (id: string, parentUid?: string) =>
  `${id}:${parentUid ?? 'root'}`;

export const getSortableItemDisabled = (isDragEnabled: boolean, isOverlay?: boolean) => {
  // dnd-kit still registers disabled draggables, so overlays need a separate id
  // and must not participate as drop targets
  const disabled = !isDragEnabled || !!isOverlay;
  return { draggable: disabled, droppable: disabled };
};
