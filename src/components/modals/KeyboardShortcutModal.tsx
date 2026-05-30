import X from 'lucide-react/icons/x';
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
  const [isRecording, setIsRecording] = useState(false);
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

  const handleClear = () => {
    setPendingShortcut({
      key: undefined,
      meta: false,
      ctrl: false,
      shift: false,
      alt: false,
    });
  };

  const displayShortcut = pendingShortcut || shortcut;
  const canClear = Boolean(displayShortcut?.key);

  if (!isOpen || !shortcut) return null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Shortcut"
      description={shortcut?.description}
      zIndex="z-60"
      onEscape={handleEscape}
      footerLeft={
        canClear ? (
          <ModalButton variant="ghost" onClick={handleClear}>
            <X className="w-4 h-4" />
            Clear shortcut
          </ModalButton>
        ) : undefined
      }
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
      <div className="space-y-4">
        <div
          ref={inputRef}
          role="application"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: we need to make this div focusable to capture key events, but it doesn't have typical interactive behavior
          tabIndex={0}
          onFocus={() => setIsRecording(true)}
          onBlur={() => setIsRecording(false)}
          onKeyDown={handleKeyCapture}
          className={`relative w-full h-20 flex items-center justify-center bg-surface-50 dark:bg-surface-900 border rounded-lg shadow-inner focus:outline-hidden focus:bg-white dark:focus:bg-surface-800 focus:ring-2 focus:ring-primary-500 focus:ring-inset transition-colors cursor-text ${
            conflictingShortcut
              ? 'border-semantic-error focus:border-semantic-error focus:ring-semantic-error'
              : 'border-surface-200 dark:border-surface-700 focus:border-primary-500'
          }`}
          aria-label="Press keys to set shortcut"
        >
          {isRecording && (
            <span
              className="absolute right-3 top-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary-600 dark:text-primary-400"
              aria-live="polite"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
              Recording
            </span>
          )}
          {displayShortcut?.key ? (
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
            <span className="text-surface-400 dark:text-surface-500 text-sm">No shortcut set</span>
          )}
        </div>

        {conflictingShortcut && (
          <p className="text-center text-xs text-semantic-error">
            Already used by {conflictingShortcut.description}.
          </p>
        )}
      </div>
    </ModalWrapper>
  );
};
