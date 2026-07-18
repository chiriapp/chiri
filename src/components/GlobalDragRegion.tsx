import { useSyncExternalStore } from 'react';
import { settingsStore } from '$context/settingsContext';
import { isMacPlatform } from '$utils/platform';

/**
 * global drag region for macOS integrated window decorations
 *
 * renders a fixed top drag region so the window remains draggable even when
 * the app shell (and its per-component drag regions) are not rendered, e.g.
 * when the error boundary or bootstrap error screen is shown
 *
 * hidden while the app shell is present, since the shell already provides
 * drag regions on the sidebar and main headers
 */
export const GlobalDragRegion = () => {
  const isMac = isMacPlatform();
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

  if (!isMac || settings.windowDecorationStyle !== 'integrated') {
    return null;
  }

  return (
    <div
      data-tauri-drag-region
      aria-hidden="true"
      className="app-global-drag-region pointer-events-auto fixed top-0 right-0 left-0 z-50 h-13"
    />
  );
};
