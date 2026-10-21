import Pencil from 'lucide-react/icons/pencil';
import PencilLine from 'lucide-react/icons/pencil-line';
import { ShortcutKeycaps } from '$components/ShortcutKeycaps';
import { Tooltip } from '$components/Tooltip';
import type { KeyboardShortcut } from '$types/shortcuts';

export const ShortcutsSettingsRow = ({
  shortcut,
  onEdit,
  isLast = false,
}: {
  shortcut: KeyboardShortcut;
  onEdit: (shortcut: KeyboardShortcut) => void;
  isLast?: boolean;
}) => (
  <div
    className={`flex items-center justify-between gap-3 bg-white px-3 py-2.5 dark:bg-surface-800 ${
      isLast ? '' : 'border-surface-300 border-b dark:border-surface-700'
    }`}
  >
    <span className="min-w-0 text-sm text-surface-600 dark:text-surface-400">
      {shortcut.description}
    </span>
    <div className="flex shrink-0 items-center gap-2">
      {shortcut.key ? (
        <>
          <ShortcutKeycaps shortcut={shortcut} />
          <Tooltip content="Edit shortcut" position="right" allowInModal>
            <button
              type="button"
              onClick={() => onEdit(shortcut)}
              aria-label={`Edit shortcut for ${shortcut.description}`}
              className="rounded-sm p-1.5 text-surface-500 outline-hidden transition-colors hover:bg-surface-100 hover:text-surface-600 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:hover:bg-surface-700 dark:hover:text-surface-300"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </>
      ) : (
        <button
          type="button"
          onClick={() => onEdit(shortcut)}
          className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-medium text-surface-500 text-xs outline-hidden transition-colors hover:bg-surface-100 hover:text-surface-700 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200"
        >
          <PencilLine className="h-3.5 w-3.5" />
          Set shortcut
        </button>
      )}
    </div>
  </div>
);
