import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { loggers } from '$lib/logger';

const log = loggers.toastManager;

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  icon?: ReactNode;
}

/**
 * toast manager for showing notifications using Sonner
 * provides a simple API for displaying different types of toasts
 */
class ToastManager {
  private activeToastIds: Map<string, string | number> = new Map();

  /**
   * show a toast notification
   * @param groupKey - Optional key to prevent duplicate toasts for the same event
   * @param action - Optional action button with label and onClick handler
   * @param closeButton - Whether to show the close button (defaults to true)
   */
  show(
    title: ReactNode,
    message: ReactNode,
    type: 'error' | 'warning' | 'info' | 'success' = 'info',
    groupKey?: string,
    action?: ToastAction,
    closeButton = true,
    options: ToastOptions = {},
  ) {
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

    const toastId = toastFn(title, {
      description: message,
      duration: 5000,
      closeButton,
      icon: options.icon,
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

  error(
    title: ReactNode,
    message: ReactNode,
    groupKey?: string,
    action?: ToastAction,
    closeButton = true,
    options: ToastOptions = {},
  ) {
    return this.show(title, message, 'error', groupKey, action, closeButton, options);
  }

  warning(
    title: ReactNode,
    message: ReactNode,
    groupKey?: string,
    action?: ToastAction,
    closeButton = true,
    options: ToastOptions = {},
  ) {
    return this.show(title, message, 'warning', groupKey, action, closeButton, options);
  }

  info(
    title: ReactNode,
    message: ReactNode,
    groupKey?: string,
    action?: ToastAction,
    closeButton = true,
    options: ToastOptions = {},
  ) {
    return this.show(title, message, 'info', groupKey, action, closeButton, options);
  }

  success(
    title: ReactNode,
    message: ReactNode,
    groupKey?: string,
    action?: ToastAction,
    closeButton = true,
    options: ToastOptions = {},
  ) {
    return this.show(title, message, 'success', groupKey, action, closeButton, options);
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

/**
 * hook for showing toast notifications
 */
export const useToast = () => {
  return {
    showToast: (
      title: string,
      message: string,
      type: 'error' | 'warning' | 'info' | 'success' = 'info',
      groupKey?: string,
    ) => toastManager.show(title, message, type, groupKey),
    error: (title: string, message: string, groupKey?: string) =>
      toastManager.error(title, message, groupKey),
    warning: (title: string, message: string, groupKey?: string) =>
      toastManager.warning(title, message, groupKey),
    info: (title: string, message: string, groupKey?: string) =>
      toastManager.info(title, message, groupKey),
    success: (title: string, message: string, groupKey?: string) =>
      toastManager.success(title, message, groupKey),
  };
};
