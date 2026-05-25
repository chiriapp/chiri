import RotateCcw from 'lucide-react/icons/rotate-ccw';
import { useEffect, useRef, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import type { KeyboardShortcut } from '$types';
import { formatShortcut, shortcutsConflict } from '$utils/keyboard';

interface KeyboardShortcutModalProps {
  isOpen: boolean;
  shortcut: KeyboardShortcut | null;
  shortcuts: KeyboardShortcut[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<KeyboardShortcut>) => void;
}

export const KeyboardShortcutModal = ({
  isOpen,
  shortcut,
  shortcuts,
  onClose,
  onSave,
}: KeyboardShortcutModalProps) => {
  const [pendingShortcut, setPendingShortcut] = useState<Partial<KeyboardShortcut> | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const pendingFullShortcut =
    shortcut && pendingShortcut ? { ...shortcut, ...pendingShortcut } : null;
  const conflictingShortcut =
    pendingFullShortcut && shortcut
      ? shortcuts.find(
          (candidate) =>
            candidate.id !== shortcut.id && shortcutsConflict(candidate, pendingFullShortcut),
        )
      : undefined;

  // Reset pending shortcut when modal opens with new shortcut
  useEffect(() => {
    if (isOpen && shortcut) {
      setPendingShortcut(null);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, shortcut]);

  const handleEscape = () => {
    if (pendingShortcut) {
      setPendingShortcut(null);
    } else {
      onClose();
    }
  };

  const handleKeyCapture = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Escape is handled by the modal layer.
    if (e.key === 'Escape') {
      return;
    }

    // Enter saves the current shortcut
    if (e.key === 'Enter') {
      if (pendingShortcut && shortcut && !conflictingShortcut) {
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
    if (pendingShortcut && shortcut && !conflictingShortcut) {
      onSave(shortcut.id, pendingShortcut);
      onClose();
    }
  };

  const handleReset = () => {
    setPendingShortcut(null);
  };

  const displayShortcut = pendingShortcut || shortcut;

  if (!isOpen || !shortcut) return null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Shortcut"
      description={shortcut?.description}
      zIndex="z-60"
      preventClose
      onEscape={handleEscape}
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton onClick={handleSave} disabled={!pendingShortcut || !!conflictingShortcut}>
            Save
          </ModalButton>
        </>
      }
    >
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
          className={`w-full h-20 flex items-center justify-center bg-surface-50 dark:bg-surface-900 border-2 border-dashed rounded-lg focus:outline-hidden focus:bg-surface-50 dark:focus:bg-surface-900 transition-colors cursor-text ${
            conflictingShortcut
              ? 'border-semantic-error focus:border-semantic-error'
              : 'border-surface-300 dark:border-surface-600 focus:border-primary-500'
          }`}
          aria-label="Press keys to set shortcut"
        >
          {displayShortcut ? (
            <div className="flex items-center">
              {formatShortcut(displayShortcut)
                .split(' + ')
                .map((key, idx, arr) => (
                  <span key={`key-${key}`} className="flex items-center">
                    <kbd
                      className={`px-3 py-2 rounded-lg text-sm font-mono shadow-xs ${
                        pendingShortcut
                          ? 'bg-surface-200 dark:bg-surface-700 border-2 border-primary-500 text-surface-900 dark:text-surface-100'
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

        {conflictingShortcut && (
          <p className="text-xs text-semantic-error">
            Already used by {conflictingShortcut.description}.
          </p>
        )}

        {pendingShortcut && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to original
          </button>
        )}

        <div className="text-xs text-surface-500 dark:text-surface-400 space-y-1">
          <p>
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded-sm text-surface-600 dark:text-surface-400">
              Enter
            </kbd>{' '}
            to save
          </p>
          <p>
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded-sm text-surface-600 dark:text-surface-400">
              Esc
            </kbd>{' '}
            to cancel recording
          </p>
        </div>
      </div>
    </ModalWrapper>
  );
};
