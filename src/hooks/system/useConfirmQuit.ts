import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getAllWebviewWindows } from '@tauri-apps/api/webviewWindow';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  sendSimpleNotification,
} from '$lib/notifications';
import { isMacPlatform } from '$utils/platform';

type NotificationPermission = 'granted' | 'denied' | 'unknown';

const QUIT_MESSAGE = {
  title: 'Hold or double press ⌘Q to quit',
  description: 'You can change this behavior in Settings',
};

const isProductionMode = () => window.location.protocol === 'tauri:';

/**
 * Check if any webview window is currently visible
 */
const checkWindowVisibility = async (): Promise<{
  hasVisible: boolean;
  windows: WebviewWindow[];
}> => {
  const windows = await getAllWebviewWindows();
  const visibilityChecks = await Promise.all(windows.map((win) => win.isVisible()));
  return {
    hasVisible: visibilityChecks.some((v) => v),
    windows,
  };
};

/**
 * Ensure notification permission and update the cached state
 */
const ensureNotificationPermission = async (
  permissionRef: React.MutableRefObject<NotificationPermission>,
): Promise<boolean> => {
  if (permissionRef.current !== 'unknown') {
    return permissionRef.current === 'granted';
  }

  try {
    const result = await checkNotificationPermission();
    if (result.status === 'granted') {
      permissionRef.current = 'granted';
      return true;
    }
    const requestResult = await requestNotificationPermission();
    permissionRef.current = requestResult.granted ? 'granted' : 'denied';
    return requestResult.granted;
  } catch {
    permissionRef.current = 'denied';
    return false;
  }
};

/**
 * Try to send a native notification for quit confirmation
 */
const trySendNativeNotification = async (
  permissionRef: React.MutableRefObject<NotificationPermission>,
): Promise<boolean> => {
  if (!isProductionMode()) return false;

  const hasPermission = await ensureNotificationPermission(permissionRef);
  if (!hasPermission) return false;

  try {
    await sendSimpleNotification({
      title: QUIT_MESSAGE.title,
      body: QUIT_MESSAGE.description,
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Show a toast notification for quit confirmation
 */
const showQuitToast = (): string | number =>
  toast.info(QUIT_MESSAGE.title, {
    description: QUIT_MESSAGE.description,
    duration: 2000,
    closeButton: false,
  });

/**
 * Show window and display quit confirmation toast as fallback
 */
const showWindowWithToast = async (
  windows: WebviewWindow[],
): Promise<string | number | undefined> => {
  if (windows.length === 0) return undefined;

  const mainWindow = windows[0];
  await mainWindow.show();
  await mainWindow.setFocus();
  return showQuitToast();
};

/**
 * Intercepts all quit requests (Cmd+Q, Dock quit, window close) emitted by the
 * Rust backend via RunEvent::ExitRequested. When confirmBeforeQuit is enabled,
 * requires a second quit action within 2 seconds to confirm. Otherwise exits immediately.
 *
 * The Rust backend always prevents the default exit and emits 'app:quit-requested',
 * so this hook is the single exit point for the app. It calls the `force_quit` Tauri
 * command which uses std::process::exit(0) directly, bypassing ExitRequested entirely.
 * (tauri-plugin-process's exit() calls AppHandle::exit() which re-triggers ExitRequested,
 * causing an infinite prevent/exit loop.)
 */
export const useConfirmQuit = () => {
  const isMac = isMacPlatform();
  const { confirmBeforeQuit } = useSettingsStore();
  const confirmBeforeQuitRef = useRef(confirmBeforeQuit);
  const pendingQuit = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef<string | number | undefined>(undefined);
  const notificationPermissionRef = useRef<NotificationPermission>('unknown');

  // Keep ref in sync so the listener always reads the latest value without re-registering
  confirmBeforeQuitRef.current = confirmBeforeQuit;

  useEffect(() => {
    if (!isMac) return;

    let unlistenFn: (() => void) | undefined;

    const handleQuitRequested = async () => {
      if (!confirmBeforeQuitRef.current) {
        invoke('force_quit');
        return;
      }

      if (pendingQuit.current) {
        // Second quit request - confirm quit
        if (timerRef.current) clearTimeout(timerRef.current);
        if (toastIdRef.current !== undefined) toast.dismiss(toastIdRef.current);
        pendingQuit.current = false;
        invoke('force_quit');
        return;
      }

      // First quit request - show confirmation
      pendingQuit.current = true;
      const { hasVisible, windows } = await checkWindowVisibility();

      if (hasVisible) {
        toastIdRef.current = showQuitToast();
      } else {
        const notificationShown = await trySendNativeNotification(notificationPermissionRef);
        if (!notificationShown) {
          toastIdRef.current = await showWindowWithToast(windows);
        }
      }

      timerRef.current = setTimeout(() => {
        pendingQuit.current = false;
        toastIdRef.current = undefined;
      }, 2000);
    };

    const unlisten = listen('app:quit-requested', handleQuitRequested);

    // store the resolved unlisten fn so beforeunload can call it synchronously.
    unlisten.then((fn) => {
      unlistenFn = fn;
    });

    // in dev mode, a full page reload (Cmd+R) destroys the JS context without
    // React running cleanup, leaving a stale handler registered in Rust's event system
    // explicitly unregister before the webview navigates so the fresh
    // listener registered after reload is the only one receiving the event
    const onBeforeUnload = () => unlistenFn?.();
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      // use .then() here (not unlistenFn?.()) so React StrictMode's synchronous
      // cleanup correctly defers the unlisten call until the Promise resolves,
      // preventing the stale first-mount handler from lingering
      unlisten.then((fn) => fn());
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingQuit.current = false;
    };
  }, [isMac]);
};
