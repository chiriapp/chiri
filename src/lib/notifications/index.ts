import { invoke } from '@tauri-apps/api/core';
import type {
  NotificationPermissionResult,
  NotificationPermissionStatus,
  NotificationPermissionStatusResult,
  SendNotificationOptions,
  SimpleNotificationOptions,
} from '$types/notification';
import type { NotificationActionSettings } from '$types/settings';

// cache for permission status to avoid re-checking on every component mount
let cachedPermissionStatus: NotificationPermissionStatus | null = null;

/**
 * get the cached notification permission status without making an async call
 * returns null if the status hasn't been checked yet
 */
export const getCachedNotificationPermission = () => {
  return cachedPermissionStatus;
};

/**
 * check the current notification permission status
 * on macOS, this uses the native UNUserNotificationCenter API to get the real permission state
 * on other platforms, returns 'granted' by default
 */
export const checkNotificationPermission = async () => {
  const result = await invoke<NotificationPermissionStatusResult>('check_notification_permission');
  cachedPermissionStatus = result.status;
  return result;
};

/**
 * request notification permission from the user
 * on macOS, this displays the native system permission dialog
 * on other platforms, returns granted immediately
 */
export const requestNotificationPermission = async () => {
  const result = await invoke<NotificationPermissionResult>('request_notification_permission');
  cachedPermissionStatus = result.status;
  return result;
};

/**
 * send a notification with actions using the native macOS API
 * this uses user-notify to send notifications with action buttons
 */
export const sendNotification = async (options: SendNotificationOptions) => {
  await invoke('send_notification_with_actions', { request: options });
};

/**
 * send a simple notification without actions or task metadata
 * used for system notifications like quit confirmation
 */
export const sendSimpleNotification = async (options: SimpleNotificationOptions) => {
  await invoke('send_simple_notification', { request: options });
};

/**
 * configure which notification action buttons are shown and the snooze duration
 */
export const setNotificationActionConfig = async (config: NotificationActionSettings) => {
  await invoke('set_notification_action_config', {
    config: {
      showComplete: config.complete,
      showSnooze: config.snooze,
      snoozeDurations: config.snoozeDurations.map((duration) => duration.minutes),
      actionOrder: config.order,
    },
  });
};
