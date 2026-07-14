import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFileDrop } from '$hooks/system/useFileDrop';

const tauriMocks = vi.hoisted(() => {
  const handlers = new Map<string, (event: { payload: { paths: string[] } }) => void>();
  return {
    handlers,
    invoke: vi.fn(() => Promise.resolve()),
    listen: vi.fn(
      (eventName: string, handler: (event: { payload: { paths: string[] } }) => void) => {
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

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn(() => 'macos'),
}));

vi.mock('$lib/mobileconfig/import', () => ({
  importMobileConfig: vi.fn(() => Promise.resolve({ ok: true, candidates: [] })),
}));

vi.mock('$lib/logger', () => ({
  loggers: {
    fileDrop: {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useFileDrop', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    tauriMocks.invoke.mockClear();
    tauriMocks.listen.mockClear();
    tauriMocks.handlers.clear();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const renderHarness = async (
    callbacks: {
      onFileDrop?: (file: { name: string; content: string }) => void;
      onConfigProfileDrop?: (profile: { ok: true; candidates: unknown[] }) => void;
      onUnsupportedFile?: (fileName: string) => void;
    } = {},
  ) => {
    const Harness = () => {
      const { handleFileDrop, handleDragOver, handleDragEnter, handleDragLeave } = useFileDrop({
        onFileDrop: callbacks.onFileDrop,
        onConfigProfileDrop: callbacks.onConfigProfileDrop,
        onUnsupportedFile: callbacks.onUnsupportedFile,
      });

      return createElement('div', {
        onDrop: handleFileDrop,
        onDragOver: handleDragOver,
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        'data-testid': 'drop-zone',
      });
    };

    await act(async () => {
      root.render(createElement(Harness));
    });
  };

  const dropFile = async (file: File) => {
    const dropZone = container.querySelector('[data-testid="drop-zone"]');
    expect(dropZone).not.toBeNull();

    const files = [file];
    const dataTransfer = {
      files: {
        length: files.length,
        item: (index: number) => files[index] ?? null,
        [Symbol.iterator]: function* () {
          yield* files;
        },
        ...Object.fromEntries(files.map((f, i) => [i, f])),
      },
      types: ['Files'],
      dropEffect: 'none',
      effectAllowed: 'all',
      items: {
        length: files.length,
        add: () => {},
        remove: () => {},
        clear: () => {},
        [Symbol.iterator]: function* () {
          yield* files.map((f) => ({ kind: 'file', type: f.type, getAsFile: () => f }));
        },
      },
      getData: () => '',
      setData: () => {},
      clearData: () => {},
      setDragImage: () => {},
    };

    const dropEvent = new MouseEvent('drop', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: dataTransfer,
    });

    await act(async () => {
      dropZone!.dispatchEvent(dropEvent);
    });
  };

  it('calls onUnsupportedFile when an unsupported file is dropped', async () => {
    const onUnsupportedFile = vi.fn();
    await renderHarness({ onUnsupportedFile });

    const file = new File(['content'], 'photo.png', { type: 'image/png' });
    await dropFile(file);

    expect(onUnsupportedFile).toHaveBeenCalledOnce();
    expect(onUnsupportedFile).toHaveBeenCalledWith('photo.png');
  });

  it('calls onFileDrop when a .json file is dropped', async () => {
    const onFileDrop = vi.fn();
    await renderHarness({ onFileDrop });

    const file = new File(['{"tasks":[]}'], 'tasks.json', { type: 'application/json' });
    await dropFile(file);

    expect(onFileDrop).toHaveBeenCalledOnce();
    expect(onFileDrop).toHaveBeenCalledWith({ name: 'tasks.json', content: '{"tasks":[]}' });
  });

  it('calls onFileDrop when an .ics file is dropped', async () => {
    const onFileDrop = vi.fn();
    await renderHarness({ onFileDrop });

    const file = new File(['BEGIN:VCALENDAR'], 'calendar.ics', { type: 'text/calendar' });
    await dropFile(file);

    expect(onFileDrop).toHaveBeenCalledOnce();
    expect(onFileDrop).toHaveBeenCalledWith({ name: 'calendar.ics', content: 'BEGIN:VCALENDAR' });
  });
});
