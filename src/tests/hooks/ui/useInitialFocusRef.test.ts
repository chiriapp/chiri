import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInitialFocusRef } from '$hooks/ui/useInitialFocusRef';

interface ProbeProps {
  showInput?: boolean;
}

const Probe = ({ showInput = true }: ProbeProps) => {
  const initialFocusRef = useInitialFocusRef<HTMLInputElement>();
  const [count, setCount] = useState(0);

  return createElement(
    'div',
    null,
    showInput
      ? createElement('input', { ref: initialFocusRef, 'aria-label': 'Primary input' })
      : null,
    createElement(
      'button',
      { type: 'button', onClick: () => setCount((current) => current + 1) },
      `rerender ${count}`,
    ),
  );
};

describe('useInitialFocusRef', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('focuses once without stealing focus on later rerenders', () => {
    act(() => {
      root.render(createElement(Probe));
    });

    const input = container.querySelector('input');
    const button = container.querySelector('button');
    expect(input).not.toBeNull();
    expect(button).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(document.activeElement).toBe(input);

    act(() => {
      button?.focus();
    });
    expect(document.activeElement).toBe(button);

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(document.activeElement).toBe(button);
  });

  it('focuses again when the element remounts', () => {
    act(() => {
      root.render(createElement(Probe));
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      root.render(createElement(Probe, { showInput: false }));
    });
    act(() => {
      root.render(createElement(Probe, { showInput: true }));
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(document.activeElement).toBe(container.querySelector('input'));
  });
});
