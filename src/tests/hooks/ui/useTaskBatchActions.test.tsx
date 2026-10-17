import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTaskBatchActions } from '$hooks/ui/useTaskBatchActions';
import type { Task } from '$types/task/model';
import { makeTask } from '../../fixtures';

const mocks = vi.hoisted(() => ({
  exportTasksAndActiveDescendants: vi.fn((tasks: Task[]) => tasks),
}));

vi.mock('$context/settingsContext', () => ({
  useSettingsStore: () => ({ timeFormat: '24h', syncStatusProgress: false }),
}));

vi.mock('$hooks/deletion/useTaskDeletion', () => ({
  useTaskDeletion: () => ({
    moveTasksToRecentlyDeleted: vi.fn(),
    deleteTasksPermanently: vi.fn(),
  }),
}));

vi.mock('$hooks/queries/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock('$hooks/queries/useTags', () => ({ useTags: () => ({ data: [] }) }));
vi.mock('$hooks/queries/useTasks', () => ({
  useBatchUpdateTasks: () => ({ mutate: vi.fn() }),
  useRestoreTask: () => ({ mutate: vi.fn() }),
}));

vi.mock('$lib/store/tasks', () => ({
  exportTasksAndActiveDescendants: mocks.exportTasksAndActiveDescendants,
}));

const Probe = ({ selectedTasks }: { selectedTasks: Task[] }) => {
  const actions = useTaskBatchActions({ selectedTasks, onClearSelection: vi.fn() });
  return (
    <>
      <button type="button" onClick={actions.openExportModal}>
        Export
      </button>
      <output data-testid="export-count">{actions.exportTasks.length}</output>
    </>
  );
};

describe('useTaskBatchActions', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    mocks.exportTasksAndActiveDescendants.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('defers export tree expansion until the export modal opens', () => {
    const selectedTasks = [makeTask({ id: 'one' }), makeTask({ id: 'two' })];

    act(() => root.render(<Probe selectedTasks={selectedTasks} />));

    expect(mocks.exportTasksAndActiveDescendants).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="export-count"]')?.textContent).toBe('0');

    act(() => {
      container.querySelector('button')?.click();
    });

    expect(mocks.exportTasksAndActiveDescendants).toHaveBeenCalledOnce();
    expect(mocks.exportTasksAndActiveDescendants).toHaveBeenCalledWith(selectedTasks);
    expect(container.querySelector('[data-testid="export-count"]')?.textContent).toBe('2');
  });
});
