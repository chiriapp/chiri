import Download from 'lucide-react/icons/download';
import Import from 'lucide-react/icons/import';
import Settings from 'lucide-react/icons/settings';

interface SidebarFooterProps {
  updateAvailable?: boolean;
  onUpdateClick?: () => void;
  onOpenImport?: () => void;
  onOpenSettings?: () => void;
  settingsShortcut: string;
  isAnyModalOpen: boolean;
}

export const SidebarFooter = ({
  updateAvailable,
  onUpdateClick,
  onOpenImport,
  onOpenSettings,
  settingsShortcut,
  isAnyModalOpen,
}: SidebarFooterProps) => {
  return (
    <div className="relative flex flex-col justify-between border-t border-surface-200 bg-surface-100 p-2 dark:border-surface-700 dark:bg-surface-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-surface-100 dark:from-surface-900 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-surface-200 dark:bg-surface-700"
      />
      {updateAvailable && (
        <button
          type="button"
          onClick={() => onUpdateClick?.()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors font-medium outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
        >
          <Download className="w-4 h-4 text-primary-500" />
          Update available!
        </button>
      )}
      <button
        type="button"
        onClick={() => onOpenImport?.()}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-surface-600 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-200 dark:hover:bg-surface-700' : ''} transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
      >
        <Import className="w-4 h-4" />
        Import tasks...
      </button>
      <button
        type="button"
        onClick={() => onOpenSettings?.()}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-surface-600 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-200 dark:hover:bg-surface-700' : ''} transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
      >
        <Settings className="w-4 h-4" />
        Settings
        <span className="ml-auto text-xs text-surface-400">{settingsShortcut}</span>
      </button>
    </div>
  );
};
