import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useFocusOrigin } from '$hooks/ui/useFocusOrigin';

const Probe = () => {
  useFocusOrigin();
  return null;
};

const origin = () => document.documentElement.dataset.focusOrigin;

const pressKey = (key: string) => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
};

const pressPointer = () => {
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
};

const focusProgrammatically = (element: HTMLElement) => {
  act(() => element.focus());
};

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('useFocusOrigin', () => {
  let container: HTMLDivElement;
  let root: Root | null;
  let button: HTMLButtonElement;
  let other: HTMLButtonElement;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    button = document.createElement('button');
    other = document.createElement('button');
    document.body.append(button, other);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(Probe));
    });
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = null;
    }
    container.remove();
    button.remove();
    other.remove();
  });

  it('starts in pointer origin', () => {
    expect(origin()).toBe('pointer');
  });

  it('treats focus moved while a navigation key is handled as keyboard navigation', () => {
    pressKey('Tab');
    focusProgrammatically(button);
    expect(origin()).toBe('keyboard');
  });

  it('treats focus moved outside a navigation key as programmatic', async () => {
    pressKey('Tab');
    focusProgrammatically(button);
    expect(origin()).toBe('keyboard');

    await nextTask();
    focusProgrammatically(other);
    expect(origin()).toBe('pointer');
  });

  it('does not treat dismissals or shortcuts as navigation', async () => {
    pressKey('Escape');
    focusProgrammatically(button);
    expect(origin()).toBe('pointer');

    pressKey(',');
    focusProgrammatically(other);
    expect(origin()).toBe('pointer');
  });

  it('returns to pointer origin on pointer input', () => {
    pressKey('Tab');
    focusProgrammatically(button);
    expect(origin()).toBe('keyboard');

    pressPointer();
    expect(origin()).toBe('pointer');
  });

  it('stops tracking and clears the attribute on unmount', () => {
    act(() => root?.unmount());
    root = null;

    expect(origin()).toBeUndefined();

    pressKey('Tab');
    focusProgrammatically(button);
    expect(origin()).toBeUndefined();
  });
});
