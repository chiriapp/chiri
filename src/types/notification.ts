// note: 'ephemeral' is iOS-only and not available on macOS
export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'provisional';

export interface NotificationPermissionStatusResult {
  status: NotificationPermissionStatus;
}

export interface NotificationPermissionResult {
  granted: boolean;
  status: NotificationPermissionStatus;
}

export type NotificationType = 'overdue' | 'reminder';

export interface SendNotificationOptions {
  title: string;
  body: string;
  taskId: string;
  notificationType: NotificationType;
}

export interface SimpleNotificationOptions {
  title: string;
  body: string;
}

export interface NotificationActionEvent {
  action: 'complete' | 'snooze-15min' | 'snooze-1hr' | 'view';
  taskId: string;
  notificationType: string;
}
