import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Search from 'lucide-react/icons/search';
import X from 'lucide-react/icons/x';
import { useEffect, useRef, useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasCustomShortcuts = !keyboardShortcutsMatch(keyboardShortcuts, DEFAULT_SHORTCUTS);
  const resetTitle = hasCustomShortcuts
    ? 'Reset to defaults'
    : 'Keyboard shortcuts are already using defaults';

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isSearching = !!trimmedQuery;

  // filter shortcuts within each group if searching, and only keep groups that have matching shortcuts
  const renderedGroups = SHORTCUT_GROUPS.map((group) => {
    const shortcuts = group.ids
      .map((id) => keyboardShortcuts.find((s) => s.id === id))
      .filter((s): s is KeyboardShortcut => s !== undefined)
      .filter((s) => !isSearching || s.description.toLowerCase().includes(trimmedQuery));
    return {
      label: group.label,
      shortcuts,
    };
  }).filter((g) => g.shortcuts.length > 0);

  // ensure shortcuts are up-to-date with defaults when component mounts
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

        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shortcuts..."
            aria-label="Search keyboard shortcuts"
            className="w-full rounded-lg border border-transparent bg-surface-100 py-2 pr-9 pl-9 text-sm text-surface-800 transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-sm p-0.5 text-surface-400 transition-colors hover:text-surface-600 dark:hover:text-surface-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="space-y-6">
          {isSearching && renderedGroups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Search className="h-7 w-7 text-surface-300 dark:text-surface-600" />
              <p className="text-sm text-surface-500 dark:text-surface-400">
                No shortcuts match{' '}
                <span className="font-medium text-surface-700 dark:text-surface-300">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              </p>
            </div>
          ) : (
            renderedGroups.map((group) => (
              <div key={group.label}>
                <h4 className="mb-1.5 font-semibold text-sm text-surface-700 dark:text-surface-300">
                  {group.label}
                </h4>
                <div className="overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700">
                  {group.shortcuts.map((shortcut) => (
                    <ShortcutRow key={shortcut.id} shortcut={shortcut} onEdit={handleOpenEdit} />
                  ))}
                </div>
              </div>
            ))
          )}
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
