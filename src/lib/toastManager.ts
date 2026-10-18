import { createElement, type ReactNode } from 'react';
import { type ToastT, toast } from 'sonner';
import { ToastTitle, type ToastType } from '$components/ToastTitle';
import { loggers } from '$lib/logger';

const log = loggers.toastManager;

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  /** key to prevent duplicate toasts for the same event */
  groupKey?: string;
  /** optional secondary guidance shown below the description */
  hint?: ReactNode;
  /** optional action button with label and onClick handler */
  action?: ToastAction;
  /** whether to show the close button (defaults to false) */
  closeButton?: boolean;
  /** auto-dismiss delay in ms (defaults to 5000) */
  duration?: number;
}

interface ShowToastOptions extends ToastOptions {
  type?: ToastType;
}

/**
 * toast manager for showing notifications using Sonner
 * provides a simple API for displaying different types of toasts
 */
class ToastManager {
  private activeToastIds: Map<string, string | number> = new Map();

  /**
   * show a toast notification
   * @param message - description shown under the title; pass null for no description
   */
  show(title: ReactNode, message: ReactNode, options: ShowToastOptions = {}) {
    const { type = 'info', groupKey, hint, action, closeButton = false, duration } = options;

    log.debug(
      `[${type.toUpperCase()}] Showing toast: "${title}" | "${message}" | groupKey: ${groupKey || 'none'}`,
    );

    // if groupKey is provided, dismiss any existing toast for this group
    if (groupKey) {
      const existingToastId = this.activeToastIds.get(groupKey);
      if (existingToastId) {
        toast.dismiss(existingToastId);
        this.activeToastIds.delete(groupKey);
      }
    }

    // map our type to the appropriate sonner method
    const toastFn = toast[type];

    // render every title with the standardized icon row and suppress sonner's default type icon
    const onToastRemoved = groupKey
      ? (removedToast: Pick<ToastT, 'id'>) => {
          if (this.activeToastIds.get(groupKey) === removedToast.id) {
            this.activeToastIds.delete(groupKey);
          }
        }
      : undefined;

    const description = hint
      ? createElement(
          'div',
          { className: 'flex flex-col gap-1' },
          message != null &&
            createElement('div', { className: 'text-surface-700 dark:text-surface-300' }, message),
          createElement(
            'div',
            { className: 'text-xs text-surface-500 dark:text-surface-400' },
            hint,
          ),
        )
      : message;

    const toastId = toastFn(createElement(ToastTitle, { type }, title), {
      description,
      duration: duration ?? 5000,
      closeButton,
      icon: null,
      action: action
        ? {
            label: action.label,
            onClick: action.onClick,
          }
        : undefined,
      ...(onToastRemoved
        ? {
            onAutoClose: onToastRemoved,
            onDismiss: onToastRemoved,
          }
        : {}),
    });

    // track the toast ID if groupKey is provided
    if (groupKey && toastId) {
      this.activeToastIds.set(groupKey, toastId);
    }

    return toastId;
  }

  error(title: ReactNode, message: ReactNode, options: ToastOptions = {}) {
    return this.show(title, message, { ...options, type: 'error' });
  }

  warning(title: ReactNode, message: ReactNode, options: ToastOptions = {}) {
    return this.show(title, message, { ...options, type: 'warning' });
  }

  info(title: ReactNode, message: ReactNode, options: ToastOptions = {}) {
    return this.show(title, message, { ...options, type: 'info' });
  }

  loading(title: ReactNode, message: ReactNode, options: ToastOptions = {}) {
    return this.show(title, message, { ...options, type: 'loading' });
  }

  success(title: ReactNode, message: ReactNode, options: ToastOptions = {}) {
    return this.show(title, message, { ...options, type: 'success' });
  }

  /**
   * dismiss a toast by its group key
   */
  dismiss(groupKey: string) {
    const toastId = this.activeToastIds.get(groupKey);
    if (toastId) {
      toast.dismiss(toastId);
      this.activeToastIds.delete(groupKey);
    }
  }
}

export const toastManager = new ToastManager();
