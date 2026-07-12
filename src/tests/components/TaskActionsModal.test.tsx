import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskActionsModal } from '$components/modals/TaskActionsModal';
import type { NotificationActionEvent } from '$types/notification';
import { makeTask } from '../fixtures';

const tauriMocks = vi.hoisted(() => ({
  emit: vi.fn(() => Promise.resolve()),
}));

vi.mock('@tauri-apps/api/event', () => ({
  emit: tauriMocks.emit,
}));

const modalMocks = vi.hoisted(() => ({
  notificationActions: {
    complete: true,
    snooze: true,
    view: true,
    snoozeDurationMinutes: 15,
    order: ['complete', 'snooze', 'view'],
  },
  updateTask: vi.fn(),
  setSelectedTask: vi.fn(),
}));

vi.mock('$context/settingsContext', () => ({
  useSettingsStore: () => ({
    notificationActions: modalMocks.notificationActions,
  }),
}));

vi.mock('$hooks/queries/useTasks', () => ({
  useTasks: () => ({
    data: [makeTask({ id: 'task-1', title: 'Snooze me' })],
  }),
  useUpdateTask: () => ({ mutate: modalMocks.updateTask }),
}));

vi.mock('$hooks/queries/useUIState', () => ({
  useSetSelectedTask: () => ({ mutate: modalMocks.setSelectedTask }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TaskActionsModal', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    tauriMocks.emit.mockClear();
    modalMocks.updateTask.mockClear();
    modalMocks.setSelectedTask.mockClear();
    modalMocks.notificationActions = {
      complete: true,
      snooze: true,
      view: true,
      snoozeDurationMinutes: 15,
      order: ['complete', 'snooze', 'view'],
    };
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const renderModal = async () => {
    await act(async () => {
      root.render(
        createElement(TaskActionsModal, {
          isOpen: true,
          onClose: vi.fn(),
          taskId: 'task-1',
        }),
      );
    });
  };

  const clickButton = async (label: string) => {
    const button = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(label),
    );
    expect(button).toBeTruthy();
    await act(async () => button?.click());
    return button;
  };

  it('emits a notification-action event with the configured snooze duration when snooze is clicked', async () => {
    modalMocks.notificationActions.snoozeDurationMinutes = 30;
    await renderModal();

    await clickButton('Snooze');

    expect(tauriMocks.emit).toHaveBeenCalledOnce();
    expect(tauriMocks.emit).toHaveBeenCalledWith('notification-action', {
      action: 'snooze-30min',
      taskId: 'task-1',
      notificationType: 'overdue',
    } satisfies NotificationActionEvent);
  });

  it('renders the Complete button when notificationActions.complete is enabled', async () => {
    await renderModal();
    expect(container.textContent).toContain('Complete Task');
  });

  it('does not render the Complete button when notificationActions.complete is disabled', async () => {
    modalMocks.notificationActions.complete = false;
    await renderModal();
    expect(container.textContent).not.toContain('Complete Task');
  });

  it('renders the Edit button when notificationActions.view is enabled', async () => {
    await renderModal();
    expect(container.textContent).toContain('Edit Task');
  });

  it('does not render the Edit button when notificationActions.view is disabled', async () => {
    modalMocks.notificationActions.view = false;
    await renderModal();
    expect(container.textContent).not.toContain('Edit Task');
  });

  it('renders the Snooze button when notificationActions.snooze is enabled', async () => {
    await renderModal();
    expect(container.textContent).toContain('Snooze');
  });

  it('does not render the Snooze button when notificationActions.snooze is disabled', async () => {
    modalMocks.notificationActions.snooze = false;
    await renderModal();
    expect(container.textContent).not.toContain('Snooze');
  });
});
