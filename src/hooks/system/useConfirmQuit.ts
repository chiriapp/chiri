import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { isMacPlatform } from '$utils/platform';

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

  // Keep ref in sync so the listener always reads the latest value without re-registering
  confirmBeforeQuitRef.current = confirmBeforeQuit;

  useEffect(() => {
    if (!isMac) {
      return;
    }

    let unlistenFn: (() => void) | undefined;

    const unlisten = listen('app:quit-requested', () => {
      if (!confirmBeforeQuitRef.current) {
        invoke('force_quit');
        return;
      }

      if (!pendingQuit.current) {
        pendingQuit.current = true;
        toastIdRef.current = toast.info('Press ⌘Q again to quit', {
          description: 'You can change this behavior in Settings',
          duration: 2000,
          closeButton: false,
        });
        timerRef.current = setTimeout(() => {
          pendingQuit.current = false;
          toastIdRef.current = undefined;
        }, 2000);
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (toastIdRef.current !== undefined) toast.dismiss(toastIdRef.current);
        pendingQuit.current = false;
        invoke('force_quit');
      }
    });

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
