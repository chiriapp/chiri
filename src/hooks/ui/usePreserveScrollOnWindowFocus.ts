import { type RefObject, useEffect, useRef } from 'react';

type TauriWindowApi = typeof import('@tauri-apps/api/window');

interface FocusSnapshot {
  element: HTMLElement;
  selectionDirection?: SelectionDirection;
  selectionEnd?: number | null;
  selectionStart?: number | null;
}

const supportsSelectionRange = (element: HTMLElement) =>
  element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;

/**
 * WebKit can scroll a still-focused input into view when the app regains focus.
 * blur it while the window is inactive, then restore focus without scrolling
 * used for the title field in task editor
 */
export const usePreserveScrollOnWindowFocus = <T extends HTMLElement>(
  scrollContainerRef: RefObject<T | null>,
) => {
  const focusSnapshotRef = useRef<FocusSnapshot | null>(null);

  useEffect(() => {
    let didCancel = false;
    let unlistenNativeFocus: (() => void) | null = null;

    const getActiveEditorElement = () => {
      const container = scrollContainerRef.current;
      const activeElement = document.activeElement;

      if (
        !container ||
        !(activeElement instanceof HTMLElement) ||
        !container.contains(activeElement)
      ) {
        return null;
      }

      return activeElement;
    };

    const getFocusSnapshot = (element: HTMLElement): FocusSnapshot => {
      if (!supportsSelectionRange(element)) return { element };

      return {
        element,
        selectionDirection: element.selectionDirection ?? undefined,
        selectionEnd: element.selectionEnd,
        selectionStart: element.selectionStart,
      };
    };

    const saveAndClearEditorFocus = () => {
      const activeElement = getActiveEditorElement();

      if (!activeElement) {
        const blurredToDocument =
          document.activeElement === document.body ||
          document.activeElement === document.documentElement;
        if (!blurredToDocument) {
          focusSnapshotRef.current = null;
        }
        return;
      }

      focusSnapshotRef.current = getFocusSnapshot(activeElement);
      activeElement.blur();
    };

    const restoreEditorFocus = () => {
      const snapshot = focusSnapshotRef.current;
      if (!snapshot) return;

      const container = scrollContainerRef.current;
      if (!container?.contains(snapshot.element)) {
        focusSnapshotRef.current = null;
        return;
      }

      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body &&
        document.activeElement !== document.documentElement &&
        document.activeElement !== snapshot.element
      ) {
        focusSnapshotRef.current = null;
        return;
      }

      snapshot.element.focus({ preventScroll: true });

      if (
        supportsSelectionRange(snapshot.element) &&
        snapshot.selectionStart !== undefined &&
        snapshot.selectionEnd !== undefined
      ) {
        snapshot.element.setSelectionRange(
          snapshot.selectionStart,
          snapshot.selectionEnd,
          snapshot.selectionDirection,
        );
      }

      focusSnapshotRef.current = null;
    };

    const subscribeToNativeWindowFocus = async () => {
      const tauriWindow = window as Window & { __TAURI_INTERNALS__?: unknown };
      if (!tauriWindow.__TAURI_INTERNALS__) return;

      const { getCurrentWindow }: TauriWindowApi = await import('@tauri-apps/api/window');
      if (didCancel) return;

      const unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
        if (focused) {
          restoreEditorFocus();
        } else {
          saveAndClearEditorFocus();
        }
      });

      if (didCancel) {
        unlisten();
        return;
      }

      unlistenNativeFocus = unlisten;
    };

    subscribeToNativeWindowFocus().catch(() => {});
    window.addEventListener('blur', saveAndClearEditorFocus);
    window.addEventListener('focus', restoreEditorFocus);

    return () => {
      didCancel = true;
      unlistenNativeFocus?.();
      window.removeEventListener('blur', saveAndClearEditorFocus);
      window.removeEventListener('focus', restoreEditorFocus);
    };
  }, [scrollContainerRef]);
};
