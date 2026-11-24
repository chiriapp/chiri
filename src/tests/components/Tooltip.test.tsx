import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tooltip } from '$components/Tooltip';
import { useDismissableLayer } from '$hooks/ui/useDismissableLayer';
import { DismissableLayerProvider } from '$providers/DismissableLayerProvider';
import { ModalStateProvider } from '$providers/ModalStateProvider';

interface RenderTooltipProps {
  content: string;
  delay?: number;
  describedBy?: string;
}

const renderTooltip = (props: RenderTooltipProps) => (
  <Tooltip content={props.content} delay={props.delay}>
    <button type="button" aria-describedby={props.describedBy}>
      Trigger
    </button>
  </Tooltip>
);

const getButton = (container: HTMLElement) => {
  const button = container.querySelector('button');
  if (!button) throw new Error('Expected trigger button to render');
  return button;
};

const getTriggerWrapper = (button: HTMLElement) => {
  const wrapper = button.parentElement;
  if (!wrapper) throw new Error('Expected trigger wrapper to render');
  return wrapper;
};

const getDescribedTooltip = (button: HTMLElement) => {
  const describedBy = button.getAttribute('aria-describedby');
  if (!describedBy) throw new Error('Expected trigger to have aria-describedby');

  const tooltipIds = describedBy.split(' ');
  const tooltipId = tooltipIds[tooltipIds.length - 1];
  if (!tooltipId) throw new Error('Expected trigger to include tooltip id');

  const tooltip = document.getElementById(tooltipId);
  if (!tooltip) throw new Error('Expected tooltip element to render');

  return tooltip;
};

const pressEscape = (target: EventTarget = document.body) => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
};

const mouseEnter = (target: HTMLElement) => {
  target.dispatchEvent(
    new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }),
  );
};

const mouseLeave = (target: HTMLElement) => {
  target.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
};

const ModalLayer = ({ enabled }: { enabled: boolean }) => {
  useDismissableLayer({ enabled, type: 'modal' });
  return null;
};

describe('Tooltip', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete document.documentElement.dataset.focusOrigin;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('describes the actual trigger with a portal tooltip', () => {
    act(() => {
      root.render(renderTooltip({ content: 'Archive task', describedBy: 'existing-description' }));
    });

    const button = getButton(container);
    const describedBy = button.getAttribute('aria-describedby');
    const tooltip = getDescribedTooltip(button);

    expect(button.getAttribute('role')).toBeNull();
    expect(describedBy?.split(' ')).toContain('existing-description');
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.textContent).toContain('Archive task');
    expect(tooltip.classList.contains('invisible')).toBe(true);
  });

  it('shows on focus and hides on Escape', () => {
    act(() => {
      root.render(renderTooltip({ content: 'Focus tooltip', delay: 25 }));
    });

    const button = getButton(container);
    const tooltip = getDescribedTooltip(button);

    act(() => {
      button.focus();
    });
    act(() => {
      vi.advanceTimersByTime(24);
    });
    expect(tooltip.classList.contains('invisible')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(tooltip.classList.contains('invisible')).toBe(false);

    act(() => {
      pressEscape();
    });
    expect(tooltip.classList.contains('invisible')).toBe(true);
  });

  it('stays hidden when the pointer produced the focus', () => {
    act(() => {
      root.render(renderTooltip({ content: 'Pointer focus tooltip' }));
    });

    const button = getButton(container);
    const tooltip = getDescribedTooltip(button);

    // the app hands focus back to a trigger after a dismissal (Esc closing search)
    document.documentElement.dataset.focusOrigin = 'pointer';
    act(() => {
      button.focus();
    });

    expect(tooltip.classList.contains('invisible')).toBe(true);
  });

  it('hides a hovered tooltip on Escape without reopening until hover leaves', () => {
    act(() => {
      root.render(
        <DismissableLayerProvider>
          {renderTooltip({ content: 'Hover tooltip' })}
        </DismissableLayerProvider>,
      );
    });

    const button = getButton(container);
    const wrapper = getTriggerWrapper(button);
    const tooltip = getDescribedTooltip(button);

    act(() => {
      mouseEnter(wrapper);
    });
    expect(tooltip.classList.contains('invisible')).toBe(false);

    act(() => {
      pressEscape(button);
    });
    expect(tooltip.classList.contains('invisible')).toBe(true);

    act(() => {
      mouseEnter(wrapper);
    });
    expect(tooltip.classList.contains('invisible')).toBe(true);

    act(() => {
      mouseLeave(wrapper);
    });
    act(() => {
      mouseEnter(wrapper);
    });
    expect(tooltip.classList.contains('invisible')).toBe(false);
  });

  it('does not reopen a hovered tooltip after a modal closes until hover leaves', () => {
    const renderWithModal = (modalOpen: boolean) => (
      <DismissableLayerProvider>
        <ModalStateProvider>
          {renderTooltip({ content: 'Add account' })}
          <ModalLayer enabled={modalOpen} />
        </ModalStateProvider>
      </DismissableLayerProvider>
    );

    act(() => {
      root.render(renderWithModal(false));
    });

    const button = getButton(container);
    const wrapper = getTriggerWrapper(button);
    const tooltip = getDescribedTooltip(button);
    vi.spyOn(wrapper, 'matches').mockImplementation((selector) => selector === ':hover');

    act(() => {
      mouseEnter(wrapper);
    });
    expect(tooltip.classList.contains('invisible')).toBe(false);
    act(() => {
      button.focus();
    });

    act(() => {
      root.render(renderWithModal(true));
    });
    expect(tooltip.classList.contains('invisible')).toBe(true);

    // WebKit2GTK can deliver this while the modal opens even though it retains :hover.
    act(() => {
      mouseLeave(wrapper);
    });

    act(() => {
      root.render(renderWithModal(false));
    });
    act(() => {
      button.focus();
    });
    expect(tooltip.classList.contains('invisible')).toBe(true);

    act(() => {
      mouseLeave(wrapper);
      mouseEnter(wrapper);
    });
    expect(tooltip.classList.contains('invisible')).toBe(false);
  });

  it('repositions the arrow when visible content changes size', () => {
    act(() => {
      root.render(renderTooltip({ content: 'Short tooltip' }));
    });

    const button = getButton(container);
    const wrapper = getTriggerWrapper(button);
    const tooltip = getDescribedTooltip(button);
    let tooltipWidth = 100;

    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      right: 140,
      bottom: 124,
      width: 40,
      height: 24,
    } as DOMRect);
    vi.spyOn(tooltip, 'getBoundingClientRect').mockImplementation(
      () => ({ width: tooltipWidth, height: 32 }) as DOMRect,
    );

    act(() => {
      mouseEnter(wrapper);
    });
    expect(tooltip.querySelector('div')?.getAttribute('style')).toContain('left: 50px');

    tooltipWidth = 200;
    act(() => {
      root.render(renderTooltip({ content: 'A much longer tooltip' }));
    });

    expect(tooltip.querySelector('div')?.getAttribute('style')).toContain('left: 100px');
  });
});
