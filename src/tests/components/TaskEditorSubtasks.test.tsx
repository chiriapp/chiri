import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskEditorSubtasks } from '$components/taskEditor/TaskEditorSubtasks';
import type { Task } from '$types/task/model';
import { makeTask } from '../fixtures';

const { sortMode, getSortedTasksMock, getTaskByIdMock, toggleTaskCollapsedMock, children } =
  vi.hoisted(() => ({
    sortMode: { current: 'manual' as 'manual' | 'title' },
    getSortedTasksMock: vi.fn((tasks: ReturnType<typeof makeTask>[]) => tasks),
    getTaskByIdMock: vi.fn(),
    toggleTaskCollapsedMock: vi.fn(),
    children: { current: [] as ReturnType<typeof makeTask>[] },
  }));

vi.mock('@dnd-kit/core', () => ({
  closestCenter: vi.fn(),
  DndContext: ({ children }: { children: ReactNode }) => children,
  DragOverlay: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => children,
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('$hooks/queries/useTasks', () => ({
  useChildTasks: () => ({ data: children.current }),
  useCreateTask: () => ({ mutate: vi.fn() }),
  useTasks: () => ({ data: [makeTask(), ...children.current] }),
}));

vi.mock('$hooks/queries/useUIState', () => ({
  useSortConfig: () => ({ mode: sortMode.current, direction: 'asc' }),
}));

vi.mock('$hooks/ui/useSortableDrag', () => ({
  truncateName: (name: string) => name,
  useSortableDrag: ({ flattenedItems }: { flattenedItems: unknown[] }) => ({
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

vi.mock('$lib/store/tasks', () => ({
  getSortedTasks: getSortedTasksMock,
  getTaskById: getTaskByIdMock,
  toggleTaskCollapsed: toggleTaskCollapsedMock,
}));

vi.mock('$components/taskEditor/TaskEditorSubtaskItem', () => ({
  TaskEditorSubtaskItem: ({
    task,
    isDragEnabled,
  }: {
    task: { id: string };
    isDragEnabled: boolean;
  }) =>
    createElement('div', {
      'data-subtask-id': task.id,
      'data-subtask-drag-enabled': String(isDragEnabled),
    }),
}));

describe('TaskEditorSubtasks', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    sortMode.current = 'manual';
    getSortedTasksMock.mockClear();
    toggleTaskCollapsedMock.mockClear();
    children.current = [
      makeTask({ id: 'subtask-1', uid: 'subtask-1-uid', parentUid: 'parent-uid' }),
      makeTask({ id: 'subtask-2', uid: 'subtask-2-uid', parentUid: 'parent-uid' }),
    ];
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const renderSubtasks = async (overrides: Partial<Task> = {}) => {
    await act(async () => {
      root.render(
        createElement(TaskEditorSubtasks, {
          task: makeTask({ id: 'parent', uid: 'parent-uid', ...overrides }),
          checkmarkColor: '#fff',
          useAccentColorForCheckboxes: false,
          updateTask: vi.fn(),
          moveTaskToRecentlyDeleted: vi.fn(async () => true),
        }),
      );
    });
  };

  it('enables subtask dragging only with manual task sorting', async () => {
    await renderSubtasks();

    expect(
      Array.from(container.querySelectorAll('[data-subtask-drag-enabled]')).map((item) =>
        item.getAttribute('data-subtask-drag-enabled'),
      ),
    ).toEqual(['true', 'true']);
    expect(getSortedTasksMock).toHaveBeenCalledWith(expect.any(Array), {
      mode: 'manual',
      direction: 'asc',
    });

    sortMode.current = 'title';
    await renderSubtasks();

    expect(
      Array.from(container.querySelectorAll('[data-subtask-drag-enabled]')).map((item) =>
        item.getAttribute('data-subtask-drag-enabled'),
      ),
    ).toEqual(['false', 'false']);
    expect(getSortedTasksMock).toHaveBeenLastCalledWith(expect.any(Array), {
      mode: 'title',
      direction: 'asc',
    });
  });

  it('toggles the edited task collapse from the subtask section header', async () => {
    await renderSubtasks();
    expect(container.querySelectorAll('[data-subtask-id]')).toHaveLength(2);

    const header = container.querySelector<HTMLButtonElement>('[aria-expanded]');
    expect(header?.textContent).toContain('Subtasks');
    expect(header?.getAttribute('aria-expanded')).toBe('true');

    await act(async () => header?.click());

    expect(toggleTaskCollapsedMock).toHaveBeenCalledWith('parent');
  });

  it('hides the subtask rows while the task is collapsed', async () => {
    await renderSubtasks({ isCollapsed: true });

    expect(container.querySelectorAll('[data-subtask-id]')).toHaveLength(0);
    expect(container.querySelector('[aria-expanded]')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the subtask header inert when the task has no subtasks', async () => {
    children.current = [];
    await renderSubtasks();

    expect(container.textContent).toContain('Subtasks');
    expect(container.querySelector('[aria-expanded]')).toBeNull();
  });
});
