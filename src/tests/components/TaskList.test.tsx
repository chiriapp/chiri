import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskList } from '$components/TaskList';
import type { FlattenedTask } from '$types/store/tasks';

const tasks: FlattenedTask[] = Array.from({ length: 3400 }, (_, index) => ({
  id: `task-${index}`,
  uid: `uid-${index}`,
  title: `Task ${index}`,
  description: '',
  status: 'needs-action',
  completed: false,
  priority: 'none',
  createdAt: new Date(0),
  modifiedAt: new Date(0),
  sortOrder: index,
  accountId: 'account-1',
  calendarId: 'calendar-1',
  synced: true,
  ancestorIds: [],
  depth: 0,
}));

const scrollToIndex = vi.fn();

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 12) }, (_, index) => ({
        index,
        key: index,
        start: index * 104,
        end: (index + 1) * 104,
        size: 104,
      })),
    getTotalSize: () => count * 104,
    containerRef: (node: HTMLElement | null) => {
      if (node) node.style.height = `${count * 104}px`;
    },
    measureElement: vi.fn(),
    scrollToIndex,
  }),
}));

vi.mock('@dnd-kit/core', () => ({
  closestCenter: vi.fn(),
  DndContext: ({ children }: { children: ReactNode }) => children,
  DragOverlay: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => children,
  verticalListSortingStrategy: {},
}));

vi.mock('$components/taskItem/TaskItem', () => ({
  TaskItem: ({ task }: { task: FlattenedTask }) => (
    <div data-testid="task-item" data-task-id={task.id} />
  ),
}));

vi.mock('$context/taskHighlightContext', () => ({
  useTaskHighlight: () => ({ highlightedTaskId: null }),
}));

vi.mock('$hooks/queries/useTasks', () => ({
  useCreateTask: () => ({ mutate: vi.fn() }),
}));

vi.mock('$hooks/queries/useUIState', () => ({
  useUIState: () => ({
    data: {
      activeCalendarId: 'calendar-1',
      activeView: 'tasks',
      searchQuery: '',
      selectedTaskId: null,
      sortConfig: { mode: 'manual', direction: 'asc' },
      taskGroupConfig: { mode: 'none', direction: 'asc' },
    },
  }),
  useSetActiveAccount: () => ({ mutate: vi.fn() }),
  useSetActiveCalendar: () => ({ mutate: vi.fn() }),
}));

vi.mock('$hooks/queries/useVisibleTasks', () => ({
  useVisibleTaskGroups: () => [
    {
      key: 'all',
      label: 'All tasks',
      tasks,
    },
  ],
}));

vi.mock('$hooks/ui/useSortableDrag', () => ({
  truncateName: (name: string) => name,
  useSortableDrag: ({ flattenedItems }: { flattenedItems: FlattenedTask[] }) => ({
    activeItem: null,
    targetIndent: 0,
    targetParentName: null,
    originalIndentRef: { current: 0 },
    visibleItems: flattenedItems,
    sensors: [],
    handleDragStart: vi.fn(),
    handleDragMove: vi.fn(),
    handleDragEnd: vi.fn(),
    handleDragCancel: vi.fn(),
  }),
}));

vi.mock('$hooks/ui/useTaskListSelection', () => ({
  useTaskListSelection: () => ({
    clearSelection: vi.fn(),
    handleSelectionCheckboxClick: vi.fn(),
    handleTaskClick: vi.fn(),
    handleTaskContextMenu: vi.fn(),
    isSelectionMode: false,
    selectedTaskIdSet: new Set<string>(),
  }),
}));

vi.mock('$utils/keyboard', () => ({
  getMetaKeyLabel: () => '⌘',
  getModifierJoiner: () => '',
}));

describe('TaskList virtualization', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('mounts only the task rows returned by the virtualizer for a large list', async () => {
    await act(async () => root.render(<TaskList />));

    const renderedTasks = container.querySelectorAll('[data-testid="task-item"]');
    expect(renderedTasks).toHaveLength(12);
    expect(renderedTasks[0]?.getAttribute('data-task-id')).toBe('task-0');
    expect(container.querySelector('[data-task-id="task-3399"]')).toBeNull();
    expect(container.querySelector('[style*="height: 353600px"]')).not.toBeNull();
  });
});
