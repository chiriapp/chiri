import { createElement, type ReactNode } from 'react';
import { toast } from 'sonner';
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
    const { type = 'info', groupKey, action, closeButton = false, duration } = options;

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
    const toastId = toastFn(createElement(ToastTitle, { type }, title), {
      description: message,
      duration: duration ?? 5000,
      closeButton,
      icon: null,
      action: action
        ? {
            label: action.label,
            onClick: action.onClick,
          }
        : undefined,
    });

    // track the toast ID if groupKey is provided
    if (groupKey && toastId) {
      this.activeToastIds.set(groupKey, toastId);
      // clean up after toast is dismissed
      setTimeout(() => {
        this.activeToastIds.delete(groupKey);
      }, 6000);
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
