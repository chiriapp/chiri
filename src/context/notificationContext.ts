import { createContext, useContext } from 'react';
import type {
  NotificationPermissionResult,
  NotificationPermissionStatus,
} from '$types/notification';

interface NotificationContextValue {
  /** macOS system permission status. Always null on Windows/Linux */
  permissionStatus: NotificationPermissionStatus | null;
  isCheckingPermission: boolean;
  /** re-check the current system permission and sync app state */
  checkPermission: () => Promise<void>;
  /** trigger the macOS permission request dialog */
  requestPermission: () => Promise<NotificationPermissionResult>;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};
