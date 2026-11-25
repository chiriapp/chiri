import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEasedValue } from '$hooks/ui/useEasedValue';

const motionMock = vi.hoisted(() => ({ prefersReducedMotion: false }));

vi.mock('$hooks/ui/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => motionMock.prefersReducedMotion,
}));

const ValueProbe = ({ target }: { target: number }) => {
  const value = useEasedValue(target);

  return <output data-value={value} />;
};

describe('useEasedValue', () => {
  let container: HTMLDivElement;
  let root: Root;
  let now = 0;
  let scheduled = new Map<number, FrameRequestCallback>();
  let nextHandle = 1;

  const read = () => Number(container.querySelector('output')?.dataset.value);

  const runFrame = (elapsedMs = 16) => {
    const callbacks = [...scheduled.values()];
    scheduled.clear();
    now += elapsedMs;
    act(() => {
      for (const callback of callbacks) callback(now);
    });
  };

  beforeEach(() => {
    motionMock.prefersReducedMotion = false;
    now = 0;
    scheduled = new Map();
    nextHandle = 1;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const handle = nextHandle++;
      scheduled.set(handle, callback);
      return handle;
    });
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
      scheduled.delete(handle);
    });

    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('eases up to a new target without overshooting and settles exactly on it', () => {
    act(() => root.render(createElement(ValueProbe, { target: 0 })));
    act(() => root.render(createElement(ValueProbe, { target: 80 })));

    const samples: number[] = [];
    for (let frame = 0; frame < 60; frame++) {
      runFrame();
      samples.push(read());
    }

    expect(samples.every((value) => value >= 0 && value <= 80)).toBe(true);
    expect(samples.every((value, index) => index === 0 || value >= samples[index - 1])).toBe(true);
    expect(samples.filter((value) => value > 0 && value < 80).length).toBeGreaterThan(2);
    expect(read()).toBe(80);
  });

  it('continues from the value on screen when a newer target arrives', () => {
    act(() => root.render(createElement(ValueProbe, { target: 0 })));
    act(() => root.render(createElement(ValueProbe, { target: 90 })));

    for (let frame = 0; frame < 3; frame++) runFrame();
    const midway = read();
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(90);

    act(() => root.render(createElement(ValueProbe, { target: 100 })));
    runFrame();
    expect(read()).toBeGreaterThanOrEqual(midway);

    for (let frame = 0; frame < 60; frame++) runFrame();
    expect(read()).toBe(100);
  });

  it('drops straight to a lower target, such as a restarted download', () => {
    act(() => root.render(createElement(ValueProbe, { target: 60 })));
    for (let frame = 0; frame < 60; frame++) runFrame();
    expect(read()).toBe(60);

    act(() => root.render(createElement(ValueProbe, { target: 0 })));
    runFrame();
    expect(read()).toBe(0);
  });

  it('settles a jump from empty to full within the relaunch dwell', () => {
    act(() => root.render(createElement(ValueProbe, { target: 0 })));
    act(() => root.render(createElement(ValueProbe, { target: 100 })));

    // the updater waits 600ms after the last byte before relaunching the app
    for (let elapsed = 0; elapsed < 600; elapsed += 16) runFrame();

    expect(read()).toBe(100);
  });

  it('skips easing for people who ask for reduced motion', () => {
    motionMock.prefersReducedMotion = true;

    act(() => root.render(createElement(ValueProbe, { target: 55 })));
    expect(read()).toBe(55);

    act(() => root.render(createElement(ValueProbe, { target: 90 })));
    expect(read()).toBe(90);
  });
});
