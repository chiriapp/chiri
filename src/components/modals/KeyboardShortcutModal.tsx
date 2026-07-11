import X from 'lucide-react/icons/x';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import type { KeyboardShortcut } from '$types';
import {
  formatShortcut,
  getReservedShortcutMessage,
  normalizeShortcutKey,
  shortcutsConflict,
} from '$utils/keyboard';
import { isMacPlatform } from '$utils/platform';

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
  const reservedShortcutMessage = pendingFullShortcut
    ? getReservedShortcutMessage(pendingFullShortcut)
    : null;
  const hasShortcutError = Boolean(conflictingShortcut || reservedShortcutMessage);

  // reset pending shortcut when modal opens with new shortcut
  useEffect(() => {
    if (isOpen && shortcut) {
      setPendingShortcut(null);
      // focus input after animation
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

  const handleKeyCapture = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // escape is handled by the modal layer
    if (e.key === 'Escape') {
      return;
    }

    // enter saves the current shortcut
    if (e.key === 'Enter') {
      if (pendingShortcut && shortcut && !conflictingShortcut && !reservedShortcutMessage) {
        onSave(shortcut.id, pendingShortcut);
        onClose();
      }
      return;
    }

    // ignore modifier-only keypresses
    if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
      return;
    }

    const isMac = isMacPlatform();
    const newShortcut: Partial<KeyboardShortcut> = {
      key: normalizeShortcutKey(e.key),
      meta: isMac ? e.metaKey : e.ctrlKey,
      ctrl: isMac ? e.ctrlKey : false,
      super: isMac ? false : e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
    };

    setPendingShortcut(newShortcut);
  };

  const handleSave = () => {
    if (pendingShortcut && shortcut && !conflictingShortcut && !reservedShortcutMessage) {
      onSave(shortcut.id, pendingShortcut);
      onClose();
    }
  };

  const handleClear = () => {
    setPendingShortcut({
      key: undefined,
      meta: false,
      ctrl: false,
      super: false,
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
            <X className="h-4 w-4" />
            Clear shortcut
          </ModalButton>
        ) : undefined
      }
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton
            onClick={handleSave}
            disabled={!pendingShortcut || !!conflictingShortcut || !!reservedShortcutMessage}
          >
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
          onClick={() => inputRef.current?.focus()}
          onFocus={() => setIsRecording(true)}
          onBlur={() => setIsRecording(false)}
          onKeyDown={handleKeyCapture}
          className={`relative flex h-20 w-full cursor-pointer items-center justify-center rounded-lg border bg-surface-50 shadow-inner transition-colors hover:bg-white focus:bg-white focus:outline-hidden dark:bg-surface-900 dark:focus:bg-surface-800 dark:hover:bg-surface-800 ${
            hasShortcutError
              ? 'border-semantic-error border-dashed focus:border-semantic-error'
              : isRecording
                ? 'border-primary-500 border-dashed focus:border-primary-500'
                : 'border-surface-200 border-dashed hover:border-surface-300 focus:border-primary-500 dark:border-surface-700 dark:hover:border-surface-600'
          }`}
          aria-label="Press keys to set shortcut"
        >
          {isRecording && (
            <span
              className="absolute top-2 right-3 inline-flex items-center gap-1.5 font-medium text-[11px] text-primary-600 dark:text-primary-400"
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
                      className={`rounded-lg px-3 py-2 font-mono text-sm shadow-xs ${
                        pendingShortcut
                          ? 'border-2 border-primary-500 bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
                          : 'border border-surface-300 bg-surface-100 text-surface-700 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300'
                      }`}
                    >
                      {key}
                    </kbd>
                    {idx < arr.length - 1 && (
                      <span className="mx-1 text-lg text-surface-400">+</span>
                    )}
                  </span>
                ))}
            </div>
          ) : (
            <span className="text-sm text-surface-400 dark:text-surface-500">No shortcut set</span>
          )}
        </div>

        {conflictingShortcut && (
          <p className="text-center text-semantic-error text-xs">
            Already used by {conflictingShortcut.description}.
          </p>
        )}
        {!conflictingShortcut && reservedShortcutMessage && (
          <p className="text-center text-semantic-error text-xs">{reservedShortcutMessage}</p>
        )}
      </div>
    </ModalWrapper>
  );
};
