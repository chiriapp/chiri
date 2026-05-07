import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';

interface SidebarAccountsContextMenuProps {
  onClose: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const SidebarAccountsContextMenu = ({
  onClose,
  onExpandAll,
  onCollapseAll,
}: SidebarAccountsContextMenuProps) => (
  <>
    <button
      type="button"
      onClick={() => {
        onExpandAll();
        onClose();
      }}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-t-md outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
    >
      <ChevronDown className="w-4 h-4" />
      Expand All
    </button>

    <div className="border-t border-surface-200 dark:border-surface-700" />

    <button
      type="button"
      onClick={() => {
        onCollapseAll();
        onClose();
      }}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
    >
      <ChevronRight className="w-4 h-4" />
      Collapse All
    </button>
  </>
);
