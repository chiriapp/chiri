import Pencil from 'lucide-react/icons/pencil';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import { useEffect, useState } from 'react';
import { KeyboardShortcutModal } from '$components/modals/KeyboardShortcutModal';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import type { KeyboardShortcut } from '$types';
import { formatShortcut } from '$utils/keyboard';
import { isMacPlatform } from '$utils/platform';

const SHORTCUT_GROUPS: { label: string; ids: string[] }[] = [
  {
    label: 'Tasks',
    ids: [
      'new-task',
      'delete',
      'toggle-complete',
      'toggle-show-completed',
      'toggle-show-unstarted',
    ],
  },
  {
    label: 'Navigation',
    ids: [
      'nav-up',
      'nav-down',
      'nav-prev-list',
      'nav-next-list',
      'toggle-sidebar',
      'search',
      'close',
    ],
  },
  {
    label: 'General',
    ids: ['sync', 'settings', 'keyboard-shortcuts'],
  },
];

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
        <div className="flex flex-row items-center justify-between">
          <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
            Keyboard shortcuts
          </h3>
          <button
            type="button"
            onClick={resetShortcuts}
            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to defaults
          </button>
        </div>

        <div className="space-y-6">
          {SHORTCUT_GROUPS.map((group) => {
            const shortcuts = group.ids
              .map((id) => keyboardShortcuts.find((s) => s.id === id))
              .filter((s): s is KeyboardShortcut => s !== undefined);
            if (shortcuts.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="text-xs font-medium text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-1.5 px-0.5">
                  {group.label}
                </p>
                <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between py-2.5 px-3 bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 last:border-0"
                    >
                      <span className="text-sm text-surface-600 dark:text-surface-400">
                        {shortcut.description}
                      </span>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          {formatShortcut(shortcut)
                            .split(' + ')
                            .map((key, keyIndex, arr) => (
                              <>
                                <kbd
                                  key={`kbd-${key}-${shortcut.id}`}
                                  className="inline-flex items-center px-2 py-1 bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-xs font-mono leading-none text-surface-700 dark:text-surface-300"
                                >
                                  {key}
                                </kbd>
                                {keyIndex < arr.length - 1 && !isMacPlatform() && (
                                  <span
                                    key={`sep-${keyIndex}-${shortcut.id}`}
                                    className="text-xs text-surface-400"
                                  >
                                    +
                                  </span>
                                )}
                              </>
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
            );
          })}
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
