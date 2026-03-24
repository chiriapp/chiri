import { listen } from '@tauri-apps/api/event';
import { exit } from '@tauri-apps/plugin-process';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { MENU_EVENTS } from '$utils/menu';
import { isMacPlatform } from '$utils/platform';

/**
 * On macOS, intercepts the Quit menu event (Cmd+Q or "Quit Chiri" click) and
 * requires a second press within 2 seconds to confirm when confirmBeforeQuit is enabled.
 *
 * Note: macOS does not expose whether the quit was triggered by keyboard shortcut or
 * menu click — both fire the same menu item action. Distinguishing them would require
 * ObjC runtime swizzling.
 */
export const useConfirmQuit = () => {
  const { confirmBeforeQuit } = useSettingsStore();
  const pendingQuit = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    if (!isMacPlatform()) return;

    const unlisten = listen(MENU_EVENTS.QUIT_MENU, () => {
      if (!confirmBeforeQuit) {
        exit(0);
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
        exit(0);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingQuit.current = false;
    };
  }, [confirmBeforeQuit]);
};
