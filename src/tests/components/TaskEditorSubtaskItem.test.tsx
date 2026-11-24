import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskEditorSubtaskItem } from '$components/taskEditor/TaskEditorSubtaskItem';
import type { Task } from '$types/task/model';
import { makeTask } from '../fixtures';

const { childTasks } = vi.hoisted(() => ({ childTasks: { current: [] as { id: string }[] } }));

vi.mock('@dnd-kit/sortable', () => ({
  defaultAnimateLayoutChanges: vi.fn(),
  useSortable: () => ({
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
}));

vi.mock('$context/settingsContext', () => ({
  useSettingsStore: () => ({ syncStatusProgress: false }),
}));

vi.mock('$hooks/queries/useTasks', () => ({
  useChildTasks: () => ({ data: childTasks.current }),
}));

vi.mock('$hooks/ui/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

vi.mock('$lib/task/status', async () => ({
  ...(await vi.importActual<typeof import('$lib/task/status')>('$lib/task/status')),
  buildStatusUpdates: vi.fn(() => ({})),
}));

vi.mock('$utils/sortable', () => ({
  getSortableItemDisabled: () => true,
  getSortableItemId: (id: string) => id,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TaskEditorSubtaskItem', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    childTasks.current = [];
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('reflects and toggles the shared collapse flag for its children', async () => {
    childTasks.current = [{ id: 'child' }];
    const onToggleCollapsed = vi.fn();

    const renderItem = async (overrides: Partial<Task>) =>
      await act(async () => {
        root.render(
          createElement(TaskEditorSubtaskItem, {
            task: makeTask({ id: 'subtask-4', title: 'Parent subtask', ...overrides }),
            depth: 0,
            checkmarkColor: '#fff',
            useAccentColorForCheckboxes: false,
            onToggleCollapsed,
            updateTask: vi.fn(),
            moveTaskToRecentlyDeleted: vi.fn(async () => true),
            isDragEnabled: false,
          }),
        );
      });

    await renderItem({ isCollapsed: true });
    expect(container.querySelector('[aria-label="Expand subtasks"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Collapse subtasks"]')).toBeNull();

    await renderItem({});
    const collapseButton = container.querySelector<HTMLButtonElement>(
      '[aria-label="Collapse subtasks"]',
    );
    expect(collapseButton).not.toBeNull();

    await act(async () => collapseButton?.click());
    expect(onToggleCollapsed).toHaveBeenCalledWith('subtask-4');
  });

  it('does not move an already-untitled subtask to Recently Deleted on blur', async () => {
    const moveTaskToRecentlyDeleted = vi.fn(async () => true);
    const task = makeTask({ id: 'subtask-1', title: '', parentUid: 'parent-uid' });

    await act(async () => {
      root.render(
        createElement(TaskEditorSubtaskItem, {
          task,
          depth: 0,
          checkmarkColor: '#fff',
          useAccentColorForCheckboxes: false,
          onToggleCollapsed: vi.fn(),
          updateTask: vi.fn(),
          moveTaskToRecentlyDeleted,
          isDragEnabled: false,
        }),
      );
    });

    const row = container.querySelector<HTMLElement>('[role="button"]');
    expect(row).toBeDefined();

    await act(async () => row?.click());
    const input = container.querySelector<HTMLInputElement>('input');
    expect(input).toBeTruthy();

    await act(async () => input?.blur());

    expect(moveTaskToRecentlyDeleted).not.toHaveBeenCalled();
  });

  it('persists an empty title instead of deleting the subtask when cleared and submitted', async () => {
    const moveTaskToRecentlyDeleted = vi.fn(async () => true);
    const updateTask = vi.fn();
    const task = makeTask({ id: 'subtask-2', title: 'Existing title', parentUid: 'parent-uid' });

    await act(async () => {
      root.render(
        createElement(TaskEditorSubtaskItem, {
          task,
          depth: 0,
          checkmarkColor: '#fff',
          useAccentColorForCheckboxes: false,
          onToggleCollapsed: vi.fn(),
          updateTask,
          moveTaskToRecentlyDeleted,
          isDragEnabled: false,
        }),
      );
    });

    const row = container.querySelector<HTMLElement>('[role="button"]');
    expect(row).toBeDefined();

    await act(async () => row?.click());
    const input = container.querySelector<HTMLInputElement>('input');
    expect(input).toBeTruthy();

    await act(async () => {
      if (!input) return;
      input.focus();
      const setNativeValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;
      setNativeValue?.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await act(async () =>
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    );

    expect(moveTaskToRecentlyDeleted).not.toHaveBeenCalled();
    expect(updateTask).toHaveBeenCalledWith(task.id, { title: '' });
  });

  it('shows the in-process state on the status checkbox', async () => {
    const task = makeTask({ id: 'subtask-5', title: 'In progress', status: 'in-process' });

    await act(async () => {
      root.render(
        createElement(TaskEditorSubtaskItem, {
          task,
          depth: 0,
          checkmarkColor: '#fff',
          useAccentColorForCheckboxes: false,
          onToggleCollapsed: vi.fn(),
          updateTask: vi.fn(),
          moveTaskToRecentlyDeleted: vi.fn(async () => true),
          isDragEnabled: false,
        }),
      );
    });

    const statusButton = container.querySelector('button');
    expect(statusButton?.className).toContain('bg-status-in-process');
    expect(statusButton?.querySelector('svg')).not.toBeNull();
    expect(statusButton?.getAttribute('aria-label')).toBe('In Progress');
  });

  it('does not start editing when a subtask control is clicked', async () => {
    const updateTask = vi.fn();
    const task = makeTask({ id: 'subtask-3', title: 'Existing title', parentUid: 'parent-uid' });

    await act(async () => {
      root.render(
        createElement(TaskEditorSubtaskItem, {
          task,
          depth: 0,
          checkmarkColor: '#fff',
          useAccentColorForCheckboxes: false,
          onToggleCollapsed: vi.fn(),
          updateTask,
          moveTaskToRecentlyDeleted: vi.fn(async () => true),
          isDragEnabled: false,
        }),
      );
    });

    const statusButton = container.querySelector('button');
    expect(statusButton).toBeDefined();

    await act(async () => statusButton?.click());

    expect(container.querySelector('input')).toBeNull();
    expect(updateTask).toHaveBeenCalledWith(task.id, {});
  });
});
