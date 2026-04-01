export const moveItem = <T extends { id: string; sortOrder: number }>(
  items: T[],
  activeId: string,
  overId: string,
): T[] | null => {
  if (activeId === overId) return null;

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeIndex = sorted.findIndex((item) => item.id === activeId);
  const overIndex = sorted.findIndex((item) => item.id === overId);

  if (activeIndex === -1 || overIndex === -1) return null;

  const [moved] = sorted.splice(activeIndex, 1);
  sorted.splice(overIndex, 0, moved);

  return sorted.map((item, index) => ({ ...item, sortOrder: (index + 1) * 100 }));
};
