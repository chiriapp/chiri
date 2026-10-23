import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BootstrapErrorScreen } from '$components/BootstrapErrorScreen';

vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@tauri-apps/plugin-os', () => ({
  arch: vi.fn(),
  exeExtension: vi.fn(),
  locale: vi.fn(),
  platform: vi.fn(),
  version: vi.fn(),
}));
vi.mock('$lib/logger', () => ({
  loggers: { bootstrap: { error: vi.fn() } },
}));

const getButton = (container: HTMLElement, label: string) => {
  const button = [...container.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`Could not find button: ${label}`);
  return button;
};

describe('BootstrapErrorScreen', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows a failed preference reset and allows retrying', async () => {
    const onResetPreferences = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('preferences database is locked'))
      .mockResolvedValueOnce(undefined);

    act(() => {
      root.render(
        <BootstrapErrorScreen
          error={new Error('startup failed')}
          onResetDatabase={vi.fn()}
          onResetPreferences={onResetPreferences}
        />,
      );
    });

    act(() => getButton(container, 'Reset Preferences').click());
    await act(async () => getButton(container, 'Reset').click());

    expect(container.textContent).toContain(
      'Failed to reset preferences: preferences database is locked',
    );
    expect((getButton(container, 'Reset') as HTMLButtonElement).disabled).toBe(false);

    await act(async () => getButton(container, 'Reset').click());
    expect(onResetPreferences).toHaveBeenCalledTimes(2);
    expect(container.textContent).not.toContain('preferences database is locked');
  });
});
