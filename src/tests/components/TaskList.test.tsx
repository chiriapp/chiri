import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskList } from '$components/TaskList';
import type { FlattenedTask } from '$types/store/tasks';

const taskListMocks = vi.hoisted(() => ({
  activeView: 'tasks',
  createTask: vi.fn(),
  isEmpty: false,
  searchQuery: '',
}));

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

vi.mock('$context/settingsContext', () => ({
  useSettingsStore: () => ({
    keyboardShortcuts: [{ id: 'new-task', key: 'n', meta: true, description: 'Create new task' }],
  }),
}));

vi.mock('$hooks/queries/useTasks', () => ({
  useCreateTask: () => ({ mutate: taskListMocks.createTask }),
}));

vi.mock('$hooks/queries/useUIState', () => ({
  useUIState: () => ({
    data: {
      activeCalendarId: 'calendar-1',
      activeView: taskListMocks.activeView,
      searchQuery: taskListMocks.searchQuery,
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
      tasks: taskListMocks.isEmpty ? [] : tasks,
    },
  ],
}));

vi.mock('$components/banners/RecentlyDeletedNoticeBanner', () => ({
  RecentlyDeletedNoticeBanner: () => <div data-testid="recently-deleted-notice" />,
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
  formatShortcut: (shortcut: { key?: string; meta?: boolean }) =>
    [shortcut.meta ? '⌘' : null, shortcut.key?.toUpperCase()].filter(Boolean).join(' + '),
  getMetaKeyLabel: () => '⌘',
  getModifierJoiner: () => '',
}));

vi.mock('$utils/platform', () => ({
  isMacPlatform: () => true,
}));

describe('TaskList virtualization', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    taskListMocks.activeView = 'tasks';
    taskListMocks.createTask = vi.fn();
    taskListMocks.isEmpty = false;
    taskListMocks.searchQuery = '';
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

  it('shows the quick-add field instead of the create button in an empty task view', async () => {
    taskListMocks.isEmpty = true;

    await act(async () => root.render(<TaskList />));

    expect(container.querySelector<HTMLInputElement>('#add-task-input')).not.toBeNull();
    expect(container.textContent).not.toContain('Create Task');
    expect(container.textContent).toContain('Add a task above');
    expect(
      Array.from(container.querySelectorAll('kbd')).map((keycap) => keycap.textContent),
    ).toEqual(['⌘', 'N']);
  });

  it('keeps the quick-add field available when an empty view is filtered by search', async () => {
    taskListMocks.isEmpty = true;
    taskListMocks.searchQuery = 'missing task';

    await act(async () => root.render(<TaskList />));

    expect(container.querySelector<HTMLInputElement>('#add-task-input')).not.toBeNull();
    expect(container.textContent).toContain('No tasks found');
  });

  it('keeps the quick-add field available in an empty filter view', async () => {
    taskListMocks.activeView = 'filter';
    taskListMocks.isEmpty = true;

    await act(async () => root.render(<TaskList />));

    const input = container.querySelector<HTMLInputElement>('#add-task-input');
    expect(input).not.toBeNull();
    expect(container.textContent).toContain('No tasks match this filter');

    const inputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;
    await act(async () => {
      inputValueSetter?.call(input, '  Filter task  ');
      input?.dispatchEvent(new Event('input', { bubbles: true }));
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(taskListMocks.createTask).toHaveBeenCalledWith({ title: 'Filter task' });
    expect(input?.value).toBe('');
  });

  it('does not show the quick-add field in Recently Deleted', async () => {
    taskListMocks.activeView = 'recently-deleted';
    taskListMocks.isEmpty = true;

    await act(async () => root.render(<TaskList />));

    expect(container.querySelector('#add-task-input')).toBeNull();
    expect(container.querySelector('[data-testid="recently-deleted-notice"]')).not.toBeNull();
    expect(container.textContent).toContain('Recently Deleted is empty');

    taskListMocks.isEmpty = false;
    await act(async () => root.render(<TaskList />));

    expect(container.querySelector('#add-task-input')).toBeNull();
  });
});
