import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotifications } from '$hooks/system/useNotifications';
import type { NotificationActionEvent } from '$types/notification';

const tauriMocks = vi.hoisted(() => {
  const handlers = new Map<string, (event: { payload: NotificationActionEvent }) => void>();
  return {
    handlers,
    invoke: vi.fn(() => Promise.resolve()),
    listen: vi.fn(
      (eventName: string, handler: (event: { payload: NotificationActionEvent }) => void) => {
        handlers.set(eventName, handler);
        return Promise.resolve(() => handlers.delete(eventName));
      },
    ),
  };
});

vi.mock('@tauri-apps/api/event', () => ({
  listen: tauriMocks.listen,
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: tauriMocks.invoke,
}));

const notificationMocks = vi.hoisted(() => {
  const setNotificationActionConfig = vi.fn(() => Promise.resolve());
  return {
    setNotificationActionConfig,
    checkNotificationPermission: vi.fn(() => Promise.resolve({ status: 'granted' })),
    requestNotificationPermission: vi.fn(() =>
      Promise.resolve({ granted: true, status: 'granted' }),
    ),
    sendNotification: vi.fn(() => Promise.resolve()),
    sendSimpleNotification: vi.fn(() => Promise.resolve()),
  };
});

vi.mock('$lib/notifications', () => notificationMocks);

const snoozeMocks = vi.hoisted(() => ({
  snoozeTaskFor: vi.fn(),
  getTaskSnoozeStatus: vi.fn(() => ({ isSnoozed: false, justUnsnoozed: false })),
  getSnoozedUntil: vi.fn(() => undefined),
  subscribeToSnoozes: vi.fn(() => () => {}),
  useTaskSnooze: vi.fn(() => ({ until: undefined, clear: vi.fn() })),
}));

vi.mock('$lib/notifications/snoozes', () => snoozeMocks);

const settingsMock = vi.hoisted(() => ({
  notifications: true,
  notificationActions: {
    complete: true,
    snooze: true,
    snoozeDurationMinutes: 15,
    order: ['complete', 'snooze'],
  },
  notifyReminders: true,
  notifyOverdue: true,
  quietHoursEnabled: false,
  quietHoursStart: 22,
  quietHoursEnd: 8,
}));

vi.mock('$context/settingsContext', () => ({
  useSettingsStore: () => settingsMock,
}));

const taskMocks = vi.hoisted(() => ({
  toggleTaskComplete: vi.fn(),
}));

vi.mock('$hooks/queries/useTasks', () => ({
  useTasks: () => ({ data: [] }),
  useToggleTaskComplete: () => ({ mutate: taskMocks.toggleTaskComplete }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const Harness = () => {
  useNotifications();
  return null;
};

describe('useNotifications notification-action listener', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    tauriMocks.invoke.mockClear();
    tauriMocks.listen.mockClear();
    tauriMocks.handlers.clear();
    notificationMocks.setNotificationActionConfig.mockClear();
    taskMocks.toggleTaskComplete.mockClear();
    snoozeMocks.snoozeTaskFor.mockClear();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const renderHarness = async () => {
    await act(async () => {
      root.render(createElement(Harness));
    });
  };

  const emitAction = (event: NotificationActionEvent) => {
    const handler = tauriMocks.handlers.get('notification-action');
    expect(handler).toBeDefined();
    handler?.({ payload: event });
  };

  it('syncs notification action config on mount', async () => {
    await renderHarness();
    expect(notificationMocks.setNotificationActionConfig).toHaveBeenCalledOnce();
    expect(notificationMocks.setNotificationActionConfig).toHaveBeenCalledWith({
      complete: true,
      snooze: true,
      snoozeDurationMinutes: 15,
      order: ['complete', 'snooze'],
    });
  });

  it('completes the task when the action is complete', async () => {
    await renderHarness();

    emitAction({ action: 'complete', taskId: 'task-1', notificationType: 'overdue' });

    expect(taskMocks.toggleTaskComplete).toHaveBeenCalledOnce();
    expect(taskMocks.toggleTaskComplete).toHaveBeenCalledWith('task-1');
  });

  it('snoozes the task for the parsed duration when action matches snooze-{n}min', async () => {
    await renderHarness();

    emitAction({ action: 'snooze-30min', taskId: 'task-3', notificationType: 'overdue' });

    expect(snoozeMocks.snoozeTaskFor).toHaveBeenCalledOnce();
    expect(snoozeMocks.snoozeTaskFor).toHaveBeenCalledWith('task-3', 30);
  });

  it('ignores unknown notification actions', async () => {
    await renderHarness();

    emitAction({ action: 'dismiss', taskId: 'task-4', notificationType: 'overdue' });

    expect(taskMocks.toggleTaskComplete).not.toHaveBeenCalled();
    expect(snoozeMocks.snoozeTaskFor).not.toHaveBeenCalled();
  });
});
