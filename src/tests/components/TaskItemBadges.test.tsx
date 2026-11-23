import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskItemBadges } from '$components/taskItem/TaskItemBadges';
import type { TaskBadgeKey, TaskBadgeVisibility } from '$types/settings/categories/editor';
import { makeTask } from '../fixtures';

const SNOOZED_UNTIL = Date.now() + 60 * 60 * 1000;

const badgeState = vi.hoisted(() => ({ snoozedUntil: undefined as number | undefined }));
const childTaskState = vi.hoisted(() => ({ tasks: [] as Array<{ status: string }> }));

const badgeMocks = vi.hoisted(() => ({
  getSnoozedUntil: vi.fn(() => badgeState.snoozedUntil),
  subscribeToSnoozes: vi.fn((_listener: () => void) => () => {}),
  useTaskSnooze: vi.fn(() => ({
    until: badgeState.snoozedUntil,
    clear: vi.fn(),
  })),
  snoozeTaskFor: vi.fn(),
  getTaskSnoozeStatus: vi.fn(() => ({ isSnoozed: false, justUnsnoozed: false })),
}));

vi.mock('$lib/notifications/snoozes', () => badgeMocks);

vi.mock('$context/settingsContext', () => ({
  settingsStore: {
    getState: () => ({ timeFormat: '12', dateFormat: 'MMM d, yyyy' }),
  },
  useSettingsStore: () => ({
    dateFormat: 'MMM d, yyyy',
  }),
}));

vi.mock('$hooks/ui/useResolvedAccentColor', () => ({
  useAccentColorResolver: () => (color: string) => color,
  useResolvedAccentColor: () => '#000000',
}));

vi.mock('$lib/store/tags', () => ({
  getAllTags: () => [],
}));

vi.mock('$lib/store/tasks', () => ({
  getChildTasks: () => childTaskState.tasks,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TaskItemBadges snooze badge', () => {
  let container: HTMLDivElement;
  let root: Root;

  const baseVisibility: TaskBadgeVisibility = {
    startDate: false,
    dueDate: false,
    tags: false,
    calendar: false,
    url: false,
    status: false,
    snooze: true,
    repeat: false,
    subtasks: false,
  };

  const badgeOrder: TaskBadgeKey[] = ['snooze'];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    badgeState.snoozedUntil = undefined;
    childTaskState.tasks = [];
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const renderBadges = async (
    visibility: TaskBadgeVisibility,
    order: TaskBadgeKey[] = badgeOrder,
    onToggleCollapsed = vi.fn(),
    taskOverrides = {},
    extraProps: Record<string, unknown> = {},
  ) => {
    await act(async () => {
      root.render(
        createElement(TaskItemBadges, {
          task: makeTask({ id: 'task-1', ...taskOverrides }),
          accounts: [],
          activeCalendarId: null,
          activeTagId: null,
          showCompletedTasks: false,
          onTagClick: vi.fn(),
          onCalendarClick: vi.fn(),
          onRepeatClick: vi.fn(),
          onToggleCollapsed,
          compact: false,
          badgeVisibility: visibility,
          badgeOrder: order,
          ...extraProps,
        }),
      );
    });

    return onToggleCollapsed;
  };

  it('renders the snooze badge when the task is snoozed and snooze visibility is enabled', async () => {
    badgeState.snoozedUntil = SNOOZED_UNTIL;
    await renderBadges(baseVisibility);

    expect(container.textContent).toContain('Snoozed');
  });

  it('does not render the snooze badge when snooze visibility is disabled', async () => {
    badgeState.snoozedUntil = SNOOZED_UNTIL;
    await renderBadges({ ...baseVisibility, snooze: false });

    expect(container.textContent).not.toContain('Snoozed');
  });

  it('does not render the snooze badge when the task is not snoozed', async () => {
    badgeState.snoozedUntil = undefined;
    await renderBadges(baseVisibility);

    expect(container.textContent).not.toContain('Snoozed');
  });

  it('combines subtask progress and collapse into one badge', async () => {
    childTaskState.tasks = [{ status: 'needs-action' }, { status: 'completed' }];
    const onToggleCollapsed = vi.fn();
    const subtasksVisibility = { ...baseVisibility, snooze: false, subtasks: true };

    await renderBadges(subtasksVisibility, ['subtasks'], onToggleCollapsed);

    const badge = container.querySelector('button');
    expect(badge?.textContent).toBe('1/2');
    expect(badge?.getAttribute('aria-label')).toBe('Collapse subtasks');

    await act(async () => badge?.click());

    expect(onToggleCollapsed).toHaveBeenCalledOnce();
  });

  it('shows the expand action on a collapsed subtask badge', async () => {
    childTaskState.tasks = [{ status: 'needs-action' }];
    const subtasksVisibility = { ...baseVisibility, snooze: false, subtasks: true };

    await renderBadges(subtasksVisibility, ['subtasks'], vi.fn(), { isCollapsed: true });

    const badge = container.querySelector('button');
    expect(badge?.textContent).toBe('0/1');
    expect(badge?.getAttribute('aria-label')).toBe('Expand subtasks');
  });

  it('makes date badges shortcuts when handlers are provided', async () => {
    const onStartDateClick = vi.fn();
    const onDueDateClick = vi.fn();
    const dateVisibility = {
      ...baseVisibility,
      snooze: false,
      startDate: true,
      dueDate: true,
    };

    await renderBadges(
      dateVisibility,
      ['startDate', 'dueDate'],
      vi.fn(),
      {
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      { onStartDateClick, onDueDateClick },
    );

    const badges = container.querySelectorAll('button');
    expect(badges).toHaveLength(2);

    await act(async () => {
      badges[0]?.click();
      badges[1]?.click();
    });

    expect(onStartDateClick).toHaveBeenCalledOnce();
    expect(onDueDateClick).toHaveBeenCalledOnce();
  });

  it('makes progress a shortcut when a handler is provided', async () => {
    const onProgressClick = vi.fn();
    const progressVisibility = { ...baseVisibility, snooze: false, status: true };

    await renderBadges(
      progressVisibility,
      ['status'],
      vi.fn(),
      { status: 'in-process', percentComplete: 50 },
      { onProgressClick },
    );

    const badge = container.querySelector('button');
    expect(badge?.getAttribute('aria-label')).toBe('Edit progress: 50%');

    await act(async () => badge?.click());

    expect(onProgressClick).toHaveBeenCalledOnce();
  });
});
