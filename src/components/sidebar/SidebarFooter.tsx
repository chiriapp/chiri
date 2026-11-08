import Download from 'lucide-react/icons/download';
import Import from 'lucide-react/icons/import';
import Settings from 'lucide-react/icons/settings';

interface SidebarFooterProps {
  updateAvailable?: boolean;
  onUpdateClick?: () => void;
  onOpenImport?: () => void;
  onOpenSettings?: () => void;
  importShortcut?: string;
  settingsShortcut?: string;
  isAnyModalOpen: boolean;
}

export const SidebarFooter = ({
  updateAvailable,
  onUpdateClick,
  onOpenImport,
  onOpenSettings,
  importShortcut,
  settingsShortcut,
  isAnyModalOpen,
}: SidebarFooterProps) => {
  return (
    <div className="app-sidebar-footer relative flex flex-col justify-between border-surface-300 border-t bg-surface-100 px-2.25 pt-2.25 pb-2 dark:border-surface-700 dark:bg-surface-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-surface-100 to-transparent dark:from-surface-900"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-surface-200 dark:bg-surface-700"
      />
      {updateAvailable && (
        <button
          type="button"
          onClick={() => onUpdateClick?.()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-medium text-sm text-surface-600 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
        >
          <Download className="h-4 w-4 text-primary-ink" />
          Update available!
        </button>
      )}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onOpenImport?.()}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-200 dark:hover:bg-surface-700' : ''} outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset`}
        >
          <Import className="h-4 w-4" />
          Import tasks...
          {importShortcut && (
            <span className="ml-auto text-surface-500 text-xs dark:text-surface-400">
              {importShortcut}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onOpenSettings?.()}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-200 dark:hover:bg-surface-700' : ''} outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset`}
        >
          <Settings className="h-4 w-4" />
          Settings
          {settingsShortcut && (
            <span className="ml-auto text-surface-500 text-xs dark:text-surface-400">
              {settingsShortcut}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
