import { type ComponentProps, isValidElement, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastTitle, type ToastType } from '$components/ToastTitle';

const { toastError, toastWarning, toastInfo, toastSuccess, toastDismiss } = vi.hoisted(() => {
  let nextId = 0;
  return {
    toastError: vi.fn((..._args: unknown[]) => ++nextId),
    toastWarning: vi.fn((..._args: unknown[]) => ++nextId),
    toastInfo: vi.fn((..._args: unknown[]) => ++nextId),
    toastSuccess: vi.fn((..._args: unknown[]) => ++nextId),
    toastDismiss: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
    warning: toastWarning,
    info: toastInfo,
    success: toastSuccess,
    dismiss: toastDismiss,
  },
}));

import { toastManager } from '$lib/toastManager';

type ToastTitleProps = ComponentProps<typeof ToastTitle>;

/** narrows an unknown mock argument to the ToastTitle element useToast builds */
const asTitleElement = (value: unknown): ReactElement<ToastTitleProps> => {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    throw new Error('expected the sonner title argument to be a React element');
  }
  if (!isValidElement<ToastTitleProps>(value)) {
    throw new Error('expected the sonner title argument to be a React element');
  }
  return value;
};

type ToastMock = typeof toastInfo;

const getOnlyCall = (mock: ToastMock) => {
  expect(mock).toHaveBeenCalledTimes(1);
  return mock.mock.calls[0];
};

const TYPE_METHODS: Array<{ method: ToastType; mock: ToastMock }> = [
  { method: 'error', mock: toastError },
  { method: 'warning', mock: toastWarning },
  { method: 'info', mock: toastInfo },
  { method: 'success', mock: toastSuccess },
];

beforeEach(() => {
  // show() schedules a 6s setTimeout to forget group keys — keep it off the real clock
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('toastManager', () => {
  it.each(
    TYPE_METHODS,
  )('$method() calls sonner toast.$method with a ToastTitle element and standardized options', ({
    method,
    mock,
  }) => {
    toastManager[method]('Title text', 'Detail message');

    const [titleArg, optionsArg] = getOnlyCall(mock);

    const title = asTitleElement(titleArg);
    expect(title.type).toBe(ToastTitle);
    expect(title.props.type).toBe(method);
    expect(title.props.children).toBe('Title text');

    expect(optionsArg).toEqual({
      description: 'Detail message',
      duration: 5000,
      closeButton: false,
      icon: null,
      action: undefined,
    });
  });

  it('forwards a null message as description: null so sonner skips the description block', () => {
    toastManager.info('Title only', null);

    const [, optionsArg] = getOnlyCall(toastInfo);
    expect(optionsArg).toEqual({
      description: null,
      duration: 5000,
      closeButton: false,
      icon: null,
      action: undefined,
    });
  });

  it('prefers options.duration over the 5000ms default', () => {
    toastManager.warning('Quit Chiri?', 'You have unsaved changes', {
      closeButton: true,
      duration: 2000,
    });

    const [, optionsArg] = getOnlyCall(toastWarning);
    expect(optionsArg).toMatchObject({ duration: 2000 });
  });

  it('forwards the action as {label, onClick}', () => {
    const onClick = vi.fn();
    toastManager.error('Sync failed', 'Could not reach the server', {
      action: { label: 'Retry', onClick },
    });

    const [, optionsArg] = getOnlyCall(toastError);
    expect(optionsArg).toMatchObject({ action: { label: 'Retry', onClick } });
  });

  it('leaves action undefined when none is provided', () => {
    toastManager.info('Title', 'Message');

    const [, optionsArg] = getOnlyCall(toastInfo);
    expect(optionsArg).toEqual({
      description: 'Message',
      duration: 5000,
      closeButton: false,
      icon: null,
      action: undefined,
    });
  });

  it('honours closeButton=true', () => {
    toastManager.success('Saved', 'All changes stored', { closeButton: true });

    const [, optionsArg] = getOnlyCall(toastSuccess);
    expect(optionsArg).toMatchObject({ closeButton: true });
  });

  it('dismisses the previous toast when showing the same groupKey again', () => {
    const firstId = toastManager.info('First', 'Message', { groupKey: 'sync-status' });
    const secondId = toastManager.info('Second', 'Message', { groupKey: 'sync-status' });

    expect(secondId).not.toBe(firstId);
    expect(toastDismiss).toHaveBeenCalledTimes(1);
    expect(toastDismiss).toHaveBeenCalledWith(firstId);
  });

  it('dismiss(groupKey) dismisses the tracked toast id and forgets the key', () => {
    const id = toastManager.success('Export complete', 'Wrote 12 tasks', {
      groupKey: 'export-done',
    });

    toastManager.dismiss('export-done');
    expect(toastDismiss).toHaveBeenCalledTimes(1);
    expect(toastDismiss).toHaveBeenCalledWith(id);

    // the key was forgotten — a second dismiss is a no-op
    toastManager.dismiss('export-done');
    expect(toastDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismiss(unknownKey) does not call toast.dismiss', () => {
    toastManager.dismiss('never-shown');

    expect(toastDismiss).not.toHaveBeenCalled();
  });

  it('forgets the groupKey after 6s so a later dismiss is a no-op', () => {
    toastManager.info('Title', 'Message', { groupKey: 'auto-forget' });

    vi.advanceTimersByTime(6000);
    toastManager.dismiss('auto-forget');

    expect(toastDismiss).not.toHaveBeenCalled();
  });
});
