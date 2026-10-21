import type { KeyboardShortcut } from '$types/shortcuts';
import { formatShortcut } from '$utils/keyboard';
import { isMacPlatform } from '$utils/platform';

export const ShortcutKeycaps = ({ shortcut }: { shortcut: KeyboardShortcut }) => {
  const keys = formatShortcut(shortcut).split(' + ');

  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      {keys.map((key, keyIndex) => (
        <span key={`${shortcut.id}-${key}`} className="flex items-center gap-1.5">
          <kbd className="inline-flex items-center rounded-sm border border-surface-300 bg-surface-100 px-2 py-0.5 font-mono text-surface-700 text-xs leading-none dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300">
            {key}
          </kbd>
          {keyIndex < keys.length - 1 && !isMacPlatform() && (
            <span className="text-surface-500 text-xs">+</span>
          )}
        </span>
      ))}
    </span>
  );
};
