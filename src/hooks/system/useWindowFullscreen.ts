import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';
import { isMacPlatform } from '$utils/platform';

export const useWindowFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isMacPlatform()) return;

    const window = getCurrentWindow();
    let disposed = false;

    const updateFullscreen = async () => {
      const fullscreen = await window.isFullscreen();
      if (!disposed) setIsFullscreen(fullscreen);
    };

    void updateFullscreen();
    const unlistenPromise = window.onResized(() => {
      void updateFullscreen();
    });

    return () => {
      disposed = true;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  return isFullscreen;
};
