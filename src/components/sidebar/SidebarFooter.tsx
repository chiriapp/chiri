import Download from 'lucide-react/icons/download';
import Settings from 'lucide-react/icons/settings';

interface SidebarFooterProps {
  updateAvailable?: boolean;
  onUpdateClick?: () => void;
  onOpenSettings?: () => void;
  settingsShortcut: string;
  isAnyModalOpen: boolean;
}

export const SidebarFooter = ({
  updateAvailable,
  onUpdateClick,
  onOpenSettings,
  settingsShortcut,
  isAnyModalOpen,
}: SidebarFooterProps) => {
  return (
    <div className="border-t border-surface-200 dark:border-surface-700 flex flex-col justify-between p-2">
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
