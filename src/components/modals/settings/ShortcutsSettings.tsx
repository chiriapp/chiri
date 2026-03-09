import Pencil from 'lucide-react/icons/pencil';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import { useEffect, useState } from 'react';
import { KeyboardShortcutModal } from '$components/modals/KeyboardShortcutModal';
import { useSettingsStore } from '$hooks/useSettingsStore';
import type { KeyboardShortcut } from '$types/index';
import { formatShortcut } from '$utils/keyboard';

export const ShortcutsSettings = ({
  onEditingShortcutChange,
}: {
  onEditingShortcutChange?: (editing: boolean) => void;
}) => {
  const { keyboardShortcuts, updateShortcut, resetShortcuts, ensureLatestShortcuts } =
    useSettingsStore();
  const [editingShortcut, setEditingShortcut] = useState<KeyboardShortcut | null>(null);

  // Ensure shortcuts are up-to-date with defaults when component mounts
  useEffect(() => {
    ensureLatestShortcuts();
  }, [ensureLatestShortcuts]);

  const handleSave = (id: string, updates: Partial<KeyboardShortcut>) => {
    updateShortcut(id, updates);
    setEditingShortcut(null);
    onEditingShortcutChange?.(false);
  };

  const handleOpenEdit = (shortcut: KeyboardShortcut) => {
    setEditingShortcut(shortcut);
    onEditingShortcutChange?.(true);
  };

  const handleCloseEdit = () => {
    setEditingShortcut(null);
    onEditingShortcutChange?.(false);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-row justify-between">
          <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
            Keyboard Shortcuts
          </h3>
          <button
            type="button"
            onClick={resetShortcuts}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to Defaults
          </button>
        </div>

        <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
          {keyboardShortcuts.map((shortcut) => (
            <div
              key={shortcut.id}
              className="flex items-center justify-between py-2.5 px-3 bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 last:border-0"
            >
              <span className="text-sm text-surface-600 dark:text-surface-400">
                {shortcut.description}
              </span>

              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {formatShortcut(shortcut)
                    .split(' + ')
                    .map((key, keyIndex, arr) => (
                      <span key={`${key}-${shortcut.id}`} className="flex items-center">
                        <kbd className="px-2 py-1 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-xs font-mono text-surface-700 dark:text-surface-300">
                          {key}
                        </kbd>
                        {keyIndex < arr.length - 1 && (
                          <span className="text-surface-400 mx-0.5">+</span>
                        )}
                      </span>
                    ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(shortcut)}
                  className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                  title="Edit shortcut"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <KeyboardShortcutModal
        isOpen={editingShortcut !== null}
        shortcut={editingShortcut}
        onClose={handleCloseEdit}
        onSave={handleSave}
      />
    </>
  );
};
