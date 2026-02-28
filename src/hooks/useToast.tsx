import { toast } from 'sonner';
import { createLogger } from '@/lib/logger';

const log = createLogger('ToastManager', '#ef4444');

export interface ToastAction {
  label: string;
  onClick: () => void;
}

/**
 * Toast manager for showing notifications using Sonner
 * Provides a simple API for displaying different types of toasts
 */
class ToastManager {
  private activeToastIds: Map<string, string | number> = new Map();

  /**
   * Show a toast notification
   * @param groupKey - Optional key to prevent duplicate toasts for the same event
   * @param action - Optional action button with label and onClick handler
   */
  show(
    title: string,
    message: string,
    type: 'error' | 'warning' | 'info' | 'success' = 'info',
    groupKey?: string,
    action?: ToastAction,
  ) {
    log.debug(
      `[${type.toUpperCase()}] Showing toast: "${title}" | "${message}" | groupKey: ${groupKey || 'none'}`,
    );

    // If groupKey is provided, check if a toast is already active for this group
    if (groupKey) {
      const existingToastId = this.activeToastIds.get(groupKey);
      if (existingToastId) {
        return existingToastId;
      }
    }

    // Map our type to the appropriate sonner method
    const toastFn = type === 'info' ? toast : toast[type];

    const toastId = toastFn(title, {
      description: message,
      duration: 5000,
      id: groupKey,
      action: action
        ? {
            label: action.label,
            onClick: action.onClick,
          }
        : undefined,
    });

    // Track the toast ID if groupKey is provided
    if (groupKey && toastId) {
      this.activeToastIds.set(groupKey, toastId);
      // Clean up after toast is dismissed
      setTimeout(() => {
        this.activeToastIds.delete(groupKey);
      }, 6000);
    }

    return toastId;
  }

  error(title: string, message: string, groupKey?: string, action?: ToastAction) {
    return this.show(title, message, 'error', groupKey, action);
  }

  warning(title: string, message: string, groupKey?: string, action?: ToastAction) {
    return this.show(title, message, 'warning', groupKey, action);
  }

  info(title: string, message: string, groupKey?: string, action?: ToastAction) {
    return this.show(title, message, 'info', groupKey, action);
  }

  success(title: string, message: string, groupKey?: string, action?: ToastAction) {
    return this.show(title, message, 'success', groupKey, action);
  }
}

export const toastManager = new ToastManager();

/**
 * Hook for showing toast notifications
 */
export function useToast() {
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
}
