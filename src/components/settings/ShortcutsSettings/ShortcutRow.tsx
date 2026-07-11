import Pencil from 'lucide-react/icons/pencil';
import PencilLine from 'lucide-react/icons/pencil-line';
import { Tooltip } from '$components/Tooltip';
import type { KeyboardShortcut } from '$types';
import { formatShortcut } from '$utils/keyboard';
import { isMacPlatform } from '$utils/platform';

export const ShortcutRow = ({
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
      isLast ? '' : 'border-surface-100 border-b dark:border-surface-700'
    }`}
  >
    <span className="min-w-0 text-sm text-surface-600 dark:text-surface-400">
      {shortcut.description}
    </span>
    <div className="flex shrink-0 items-center gap-2">
      {shortcut.key ? (
        <>
          <div className="flex items-center gap-1.5">
            {formatShortcut(shortcut)
              .split(' + ')
              .map((key, keyIndex, arr) => (
                <span key={key} className="flex items-center gap-1.5">
                  <kbd className="inline-flex items-center rounded-sm border border-surface-200 bg-surface-100 px-2 py-1 font-mono text-surface-700 text-xs leading-none dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300">
                    {key}
                  </kbd>
                  {keyIndex < arr.length - 1 && !isMacPlatform() && (
                    <span className="text-surface-400 text-xs">+</span>
                  )}
                </span>
              ))}
          </div>
          <Tooltip content="Edit shortcut" position="right" allowInModal>
            <button
              type="button"
              onClick={() => onEdit(shortcut)}
              aria-label={`Edit shortcut for ${shortcut.description}`}
              className="rounded-sm p-1.5 text-surface-400 outline-hidden transition-colors hover:bg-surface-100 hover:text-surface-600 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:hover:bg-surface-700 dark:hover:text-surface-300"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </>
      ) : (
        <button
          type="button"
          onClick={() => onEdit(shortcut)}
          className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-medium text-surface-500 text-xs outline-hidden transition-colors hover:bg-surface-100 hover:text-surface-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200"
        >
          <PencilLine className="h-3.5 w-3.5" />
          Set shortcut
        </button>
      )}
    </div>
  </div>
);
