/**
 * WebKit drag-and-drop workaround for Tauri
 *
 * WebKit has a bug (bugs.webkit.org/265857) where drag events don't fire properly
 * unless dataTransfer.setData() is called during dragstart
 *
 * See: https://github.com/tauri-apps/tauri/issues/6695
 */

let initialized = false;

export function isPureWebKit(): boolean {
  return (
    'webkitURL' in window &&
    CSS.supports('-webkit-appearance', 'none') &&
    !('chrome' in window) && // exclude chrome
    !/Edge|Edg\//.test(navigator.userAgent) // exclude edge because for some reason it returns 'true' to some webkit checks
  );
}

export function initWebKitDragFix(): void {
  if (initialized) return;
  if (!isPureWebKit()) return;

  initialized = true;

  document.addEventListener(
    'dragstart',
    (event: DragEvent) => {
      if (event.dataTransfer) {
        // if dataTransfer is empty, add placeholder data
        // this fixes WebKit not firing subsequent drag events
        const hasData = event.dataTransfer.types.length > 0;
        if (!hasData) {
          const target = event.target as HTMLElement;
          const id = target?.id || target?.dataset?.id || 'dragged-element';
          event.dataTransfer.setData('text/plain', id);
        }
      }
    },
    { capture: true },
  );
}
