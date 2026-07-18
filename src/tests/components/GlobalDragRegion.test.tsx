import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalDragRegion } from '$components/GlobalDragRegion';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let mockPlatform = 'macos';

const mockSettings = { windowDecorationStyle: 'integrated' as 'integrated' | 'native' };

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: () => mockPlatform,
}));

vi.mock('$context/settingsContext', () => ({
  settingsStore: {
    getState: () => mockSettings,
    getSnapshot: () => mockSettings,
    subscribe: vi.fn(() => () => {}),
  },
}));

describe('GlobalDragRegion', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mockPlatform = 'macos';
    mockSettings.windowDecorationStyle = 'integrated';
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  it('renders a top drag region on macOS with integrated decorations', async () => {
    await act(async () => {
      root.render(<GlobalDragRegion />);
    });

    const dragRegion = container.querySelector('[data-tauri-drag-region]');
    expect(dragRegion).not.toBeNull();
    expect(dragRegion?.classList.contains('app-global-drag-region')).toBe(true);
  });

  it('renders nothing on non-macOS platforms', async () => {
    mockPlatform = 'windows';

    await act(async () => {
      root.render(<GlobalDragRegion />);
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when using native window decorations', async () => {
    mockSettings.windowDecorationStyle = 'native';

    await act(async () => {
      root.render(<GlobalDragRegion />);
    });

    expect(container.firstChild).toBeNull();
  });
});
