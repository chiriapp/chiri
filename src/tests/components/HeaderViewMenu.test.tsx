import type { ReactNode } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeaderViewMenu } from '$components/header/HeaderViewMenu';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock('$components/FloatingDropdownFrame', () => ({
  FloatingDropdownFrame: ({ children }: { children: ReactNode }) => (
    <div data-testid="view-menu">{children}</div>
  ),
}));

vi.mock('$components/Tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
}));

const getViewButton = (container: HTMLElement) => {
  const button = container.querySelector<HTMLButtonElement>('button[aria-label="View options"]');
  if (!button) throw new Error('Expected the View options button to render');
  return button;
};

describe('HeaderViewMenu', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('opens and closes the view flyout', () => {
    act(() => {
      root.render(
        <HeaderViewMenu
          isAnyModalOpen={false}
          sortConfig={{ mode: 'title', direction: 'asc' }}
          taskGroupConfig={{ mode: 'status', direction: 'desc' }}
          showCompletedTasks
          showUnstartedTasks
          moveCompletedTasksToBottom={false}
          onShowCompletedTasksChange={vi.fn()}
          onShowUnstartedTasksChange={vi.fn()}
          onMoveCompletedTasksToBottomChange={vi.fn()}
          onSortDirectionToggle={vi.fn()}
          onSortChange={vi.fn()}
          onTaskGroupDirectionToggle={vi.fn()}
          onTaskGroupChange={vi.fn()}
        />,
      );
    });

    expect(container.querySelector('[data-testid="view-menu"]')).toBeNull();
    const viewButton = getViewButton(container);
    act(() => viewButton.click());
    expect(container.querySelector('[data-testid="view-menu"]')).not.toBeNull();

    act(() => viewButton.click());
    expect(container.querySelector('[data-testid="view-menu"]')).toBeNull();
  });

  it('routes view, sort, and group changes to their callbacks', () => {
    const onShowCompletedTasksChange = vi.fn();
    const onShowUnstartedTasksChange = vi.fn();
    const onMoveCompletedTasksToBottomChange = vi.fn();
    const onSortDirectionToggle = vi.fn();
    const onSortChange = vi.fn();
    const onTaskGroupDirectionToggle = vi.fn();
    const onTaskGroupChange = vi.fn();

    act(() => {
      root.render(
        <HeaderViewMenu
          isAnyModalOpen={false}
          sortConfig={{ mode: 'title', direction: 'asc' }}
          taskGroupConfig={{ mode: 'status', direction: 'desc' }}
          showCompletedTasks
          showUnstartedTasks
          moveCompletedTasksToBottom={false}
          onShowCompletedTasksChange={onShowCompletedTasksChange}
          onShowUnstartedTasksChange={onShowUnstartedTasksChange}
          onMoveCompletedTasksToBottomChange={onMoveCompletedTasksToBottomChange}
          onSortDirectionToggle={onSortDirectionToggle}
          onSortChange={onSortChange}
          onTaskGroupDirectionToggle={onTaskGroupDirectionToggle}
          onTaskGroupChange={onTaskGroupChange}
        />,
      );
    });

    act(() => getViewButton(container).click());

    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    act(() => checkboxes[0]?.click());
    act(() => checkboxes[1]?.click());
    act(() => checkboxes[2]?.click());

    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.getAttribute('aria-label') === 'Sort direction: Ascending')
        ?.click(),
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.trim() === 'Manual')
        ?.click(),
    );
    act(() =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.getAttribute('aria-label') === 'Sort direction: Descending')
        ?.click(),
    );
    const groupOptions = container.querySelectorAll('.hover-flyout-group')[1];
    act(() =>
      Array.from(groupOptions?.querySelectorAll('button') ?? [])
        .find((button) => button.textContent?.trim() === 'Priority')
        ?.click(),
    );

    expect(onShowCompletedTasksChange).toHaveBeenCalledOnce();
    expect(onShowUnstartedTasksChange).toHaveBeenCalledOnce();
    expect(onMoveCompletedTasksToBottomChange).toHaveBeenCalledOnce();
    expect(onSortDirectionToggle).toHaveBeenCalledOnce();
    expect(onSortChange).toHaveBeenCalledWith('manual');
    expect(onTaskGroupDirectionToggle).toHaveBeenCalledOnce();
    expect(onTaskGroupChange).toHaveBeenCalledWith('priority');
  });
});
