import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskItemBadges } from '$components/taskItem/TaskItemBadges';
import type { TaskBadgeKey, TaskBadgeVisibility } from '$types/settings';
import { makeTask } from '../fixtures';

const SNOOZED_UNTIL = Date.now() + 60 * 60 * 1000;

const badgeState = vi.hoisted(() => ({ snoozedUntil: undefined as number | undefined }));

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
  getChildTasks: () => [],
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
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const renderBadges = async (visibility: TaskBadgeVisibility) => {
    await act(async () => {
      root.render(
        createElement(TaskItemBadges, {
          task: makeTask({ id: 'task-1' }),
          accounts: [],
          activeCalendarId: null,
          activeTagId: null,
          showCompletedTasks: false,
          onTagClick: vi.fn(),
          onCalendarClick: vi.fn(),
          onRepeatClick: vi.fn(),
          onToggleCollapsed: vi.fn(),
          compact: false,
          badgeVisibility: visibility,
          badgeOrder,
        }),
      );
    });
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
});
