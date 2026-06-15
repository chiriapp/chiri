import RotateCcw from 'lucide-react/icons/rotate-ccw';
import { useEffect, useState } from 'react';
import { KeyboardShortcutModal } from '$components/modals/KeyboardShortcutModal';
import { ShortcutRow } from '$components/settings/ShortcutsSettings/ShortcutRow';
import { Tooltip } from '$components/Tooltip';
import { DEFAULT_SHORTCUTS } from '$constants';
import { useSettingsStore } from '$context/settingsContext';
import type { KeyboardShortcut } from '$types';
import { keyboardShortcutsMatch } from '$utils/keyboard';

const SHORTCUT_GROUPS: { label: string; ids: string[] }[] = [
  {
    label: 'Tasks',
    ids: [
      'new-task',
      'select-all-tasks',
      'delete',
      'toggle-complete',
      'toggle-show-completed',
      'toggle-show-unstarted',
    ],
  },
  {
    label: 'Navigation',
    ids: ['nav-up', 'nav-down', 'nav-prev-list', 'nav-next-list', 'toggle-sidebar', 'search'],
  },
  {
    label: 'General',
    ids: ['sync', 'import-tasks', 'settings', 'keyboard-shortcuts'],
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
  const hasCustomShortcuts = !keyboardShortcutsMatch(keyboardShortcuts, DEFAULT_SHORTCUTS);
  const resetTitle = hasCustomShortcuts
    ? 'Reset to defaults'
    : 'Keyboard shortcuts are already using defaults';

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
          <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">
            Keyboard shortcuts
          </h3>
          <Tooltip content={resetTitle} position="top" allowInModal>
            <button
              type="button"
              onClick={resetShortcuts}
              disabled={!hasCustomShortcuts}
              aria-label={resetTitle}
              className="flex items-center gap-1.5 rounded-sm bg-surface-100 px-2 py-1 text-surface-700 text-xs outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset enabled:hover:bg-surface-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-700 dark:text-surface-300 dark:enabled:hover:bg-surface-600"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to defaults
            </button>
          </Tooltip>
        </div>

        <div className="space-y-6">
          {SHORTCUT_GROUPS.map((group) => {
            const shortcuts = group.ids
              .map((id) => keyboardShortcuts.find((s) => s.id === id))
              .filter((s): s is KeyboardShortcut => s !== undefined);
            if (shortcuts.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="mb-1.5 px-0.5 font-medium text-surface-400 text-xs uppercase tracking-wider dark:text-surface-500">
                  {group.label}
                </p>
                <div className="overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700">
                  {shortcuts.map((shortcut) => (
                    <ShortcutRow key={shortcut.id} shortcut={shortcut} onEdit={handleOpenEdit} />
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
        shortcuts={keyboardShortcuts}
        onClose={handleCloseEdit}
        onSave={handleSave}
      />
    </>
  );
};
