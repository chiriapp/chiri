import RotateCcw from 'lucide-react/icons/rotate-ccw';
import X from 'lucide-react/icons/x';
import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';
import type { KeyboardShortcut } from '$types';
import { formatShortcut } from '$utils/keyboard';

interface KeyboardShortcutModalProps {
  isOpen: boolean;
  shortcut: KeyboardShortcut | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<KeyboardShortcut>) => void;
}

export const KeyboardShortcutModal = ({
  isOpen,
  shortcut,
  onClose,
  onSave,
}: KeyboardShortcutModalProps) => {
  const [pendingShortcut, setPendingShortcut] = useState<Partial<KeyboardShortcut> | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap(isOpen);

  // Reset pending shortcut when modal opens with new shortcut
  useEffect(() => {
    if (isOpen && shortcut) {
      setPendingShortcut(null);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, shortcut]);

  useModalEscapeKey(
    () => {
      if (pendingShortcut) {
        setPendingShortcut(null);
      } else {
        onClose();
      }
    },
    { enabled: isOpen },
  );

  const handleKeyCapture = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Escape is handled by useModalEscapeKey
    if (e.key === 'Escape') {
      return;
    }

    // Enter saves the current shortcut
    if (e.key === 'Enter') {
      if (pendingShortcut && shortcut) {
        onSave(shortcut.id, pendingShortcut);
        onClose();
      }
      return;
    }

    // Ignore modifier-only keypresses
    if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
      return;
    }

    const newShortcut: Partial<KeyboardShortcut> = {
      key: e.key,
      meta: e.metaKey || e.ctrlKey,
      ctrl: e.ctrlKey && !e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
    };

    setPendingShortcut(newShortcut);
  };

  const handleSave = () => {
    if (pendingShortcut && shortcut) {
      onSave(shortcut.id, pendingShortcut);
    }
    onClose();
  };

  const handleReset = () => {
    setPendingShortcut(null);
  };

  const displayShortcut = pendingShortcut || shortcut;

  if (!isOpen || !shortcut) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop does not require keyboard handler; intentionally captures all keyboard for shortcut capture mode
    // biome-ignore lint/a11y/useKeyWithClickEvents: Modal backdrop is non-interactive; users close with Escape or X button
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-md animate-scale-in"
      >
        <div className="flex items-start justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
              Edit Shortcut
            </h2>
            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
              {shortcut?.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-surface-600 dark:text-surface-400">
              Press the key combination you want to use
            </p>

            <div
              ref={inputRef}
              role="application"
              // biome-ignore lint/a11y/noNoninteractiveTabindex: we need to make this div focusable to capture key events, but it doesn't have typical interactive behavior
              tabIndex={0}
              onKeyDown={handleKeyCapture}
              className="w-full h-20 flex items-center justify-center bg-surface-50 dark:bg-surface-900 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:border-primary-500 focus:bg-primary-50 dark:focus:bg-primary-900/20 transition-colors cursor-text"
              aria-label="Press keys to set shortcut"
            >
              {displayShortcut ? (
                <div className="flex items-center">
                  {formatShortcut(displayShortcut)
                    .split(' + ')
                    .map((key, idx, arr) => (
                      <span key={`key-${key}`} className="flex items-center">
                        <kbd
                          className={`px-3 py-2 rounded-lg text-sm font-mono shadow-sm ${
                            pendingShortcut
                              ? 'bg-primary-100 dark:bg-primary-900/50 border-2 border-primary-400 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                              : 'bg-surface-100 dark:bg-surface-700 border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300'
                          }`}
                        >
                          {key}
                        </kbd>
                        {idx < arr.length - 1 && (
                          <span className="text-surface-400 mx-1 text-lg">+</span>
                        )}
                      </span>
                    ))}
                </div>
              ) : (
                <span className="text-surface-400 dark:text-surface-500 text-sm">
                  Click here and press keys...
                </span>
              )}
            </div>

            {pendingShortcut && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to original
              </button>
            )}
          </div>

          <div className="text-xs text-surface-500 dark:text-surface-400 text-center space-y-1">
            <p>
              Press{' '}
              <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-surface-600 dark:text-surface-400">
                Enter
              </kbd>{' '}
              to save
            </p>
            <p>
              Press{' '}
              <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-surface-600 dark:text-surface-400">
                Esc
              </kbd>{' '}
              to cancel recording
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-surface-200 dark:border-surface-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!pendingShortcut}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset ${
              pendingShortcut
                ? 'bg-primary-600 hover:bg-primary-700 text-primary-contrast'
                : 'bg-surface-300 dark:bg-surface-600 text-white cursor-not-allowed'
            }`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
