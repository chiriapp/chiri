import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '$types';
import { makeTask } from '../../fixtures';

const {
  deleteTaskMutate,
  permanentDeleteTaskMutate,
  setRecentlyDeletedViewMutate,
  toastInfo,
  confirm,
  close,
  setHasSeenRecentlyDeletedToast,
} = vi.hoisted(() => ({
  deleteTaskMutate: vi.fn(),
  permanentDeleteTaskMutate: vi.fn(),
  setRecentlyDeletedViewMutate: vi.fn(),
  toastInfo: vi.fn(),
  confirm: vi.fn(),
  close: vi.fn(),
  setHasSeenRecentlyDeletedToast: vi.fn(),
}));

let currentTasks: Task[] = [];

vi.mock('$context/settingsContext', () => ({
  useSettingsStore: () => ({
    confirmBeforeMoveToRecentlyDeleted: false,
    deleteSubtasksWithParent: 'delete',
    hasSeenRecentlyDeletedToast: false,
    setHasSeenRecentlyDeletedToast,
  }),
}));

vi.mock('$hooks/queries/useTasks', () => ({
  useTasks: () => ({ data: currentTasks }),
  useDeleteTask: () => ({ mutate: deleteTaskMutate }),
  usePermanentDeleteTask: () => ({ mutate: permanentDeleteTaskMutate }),
  useRestoreTask: () => ({ mutate: vi.fn() }),
}));

vi.mock('$hooks/queries/useUIState', () => ({
  useSetRecentlyDeletedView: () => ({ mutate: setRecentlyDeletedViewMutate }),
}));

vi.mock('$hooks/ui/useToast', () => ({
  toastManager: { info: toastInfo },
}));

vi.mock('$context/confirmDialogContext', () => ({
  useConfirmDialog: () => ({ confirm, close }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

import { useTaskDeletion } from '$hooks/deletion/useTaskDeletion';

beforeEach(() => {
  vi.clearAllMocks();
  currentTasks = [];
});

const Harness = ({
  taskIds,
  onResult,
}: {
  taskIds: Array<string | null | undefined>;
  onResult: (result: boolean) => void;
}) => {
  const { moveTasksToRecentlyDeleted } = useTaskDeletion();

  return createElement(
    'button',
    {
      'data-testid': 'delete-button',
      type: 'button',
      onClick: async () => {
        const result = await moveTasksToRecentlyDeleted(taskIds);
        onResult(result);
      },
    },
    'Delete',
  );
};

const renderAndClick = async (
  container: HTMLDivElement,
  tasks: Task[],
  taskIds: Array<string | null | undefined>,
) => {
  currentTasks = tasks;
  const root = createRoot(container);
  let result: boolean | null = null;

  await act(async () => {
    root.render(
      createElement(Harness, {
        taskIds,
        onResult: (value) => {
          result = value;
        },
      }),
    );
  });

  const button = container.querySelector('[data-testid="delete-button"]') as HTMLButtonElement;

  await act(async () => {
    button.click();
  });

  root.unmount();
  return result;
};

describe('useTaskDeletion moveTasksToRecentlyDeleted', () => {
  it('does not show the recently deleted toast when deleting only discardable untitled drafts', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const draft = makeTask({
      id: 'draft-1',
      uid: 'draft-uid-1',
      title: '',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      modifiedAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    const result = await renderAndClick(container, [draft], [draft.id]);

    expect(result).toBe(true);
    expect(permanentDeleteTaskMutate).toHaveBeenCalledTimes(1);
    expect(permanentDeleteTaskMutate).toHaveBeenCalledWith({ id: draft.id, deleteChildren: true });
    expect(deleteTaskMutate).not.toHaveBeenCalled();
    expect(toastInfo).not.toHaveBeenCalled();
    expect(setHasSeenRecentlyDeletedToast).not.toHaveBeenCalled();

    document.body.removeChild(container);
  });

  it('shows the recently deleted toast when deleting a normal task', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const task = makeTask({
      id: 'task-1',
      uid: 'task-uid-1',
      title: 'Real task',
    });

    const result = await renderAndClick(container, [task], [task.id]);

    expect(result).toBe(true);
    expect(deleteTaskMutate).toHaveBeenCalledTimes(1);
    expect(deleteTaskMutate).toHaveBeenCalledWith({ id: task.id, deleteChildren: true });
    expect(permanentDeleteTaskMutate).not.toHaveBeenCalled();
    expect(toastInfo).toHaveBeenCalledTimes(1);
    expect(setHasSeenRecentlyDeletedToast).toHaveBeenCalledTimes(1);
    expect(setHasSeenRecentlyDeletedToast).toHaveBeenCalledWith(true);

    document.body.removeChild(container);
  });

  it('shows the recently deleted toast when deleting a mix of drafts and normal tasks', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const draft = makeTask({
      id: 'draft-2',
      uid: 'draft-uid-2',
      title: '',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      modifiedAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    const task = makeTask({
      id: 'task-2',
      uid: 'task-uid-2',
      title: 'Real task',
    });

    const result = await renderAndClick(container, [draft, task], [draft.id, task.id]);

    expect(result).toBe(true);
    expect(permanentDeleteTaskMutate).toHaveBeenCalledTimes(1);
    expect(permanentDeleteTaskMutate).toHaveBeenCalledWith({ id: draft.id, deleteChildren: true });
    expect(deleteTaskMutate).toHaveBeenCalledTimes(1);
    expect(deleteTaskMutate).toHaveBeenCalledWith({ id: task.id, deleteChildren: true });
    expect(toastInfo).toHaveBeenCalledTimes(1);
    expect(setHasSeenRecentlyDeletedToast).toHaveBeenCalledWith(true);

    document.body.removeChild(container);
  });
});
