import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';

interface SidebarAccountsSectionContextMenuProps {
  onClose: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const SidebarAccountsSectionContextMenu = ({
  onClose,
  onExpandAll,
  onCollapseAll,
}: SidebarAccountsSectionContextMenuProps) => (
  <>
    <button
      type="button"
      onClick={() => {
        onExpandAll();
        onClose();
      }}
      className="flex w-full items-center gap-2 rounded-t-md px-3 py-2 text-sm text-surface-700 outline-hidden hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-300 dark:hover:bg-surface-700"
    >
      <ChevronDown className="h-4 w-4" />
      Expand All
    </button>

    <div className="border-surface-200 border-t dark:border-surface-700" />

    <button
      type="button"
      onClick={() => {
        onCollapseAll();
        onClose();
      }}
      className="flex w-full items-center gap-2 rounded-b-md px-3 py-2 text-sm text-surface-700 outline-hidden hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-300 dark:hover:bg-surface-700"
    >
      <ChevronRight className="h-4 w-4" />
      Collapse All
    </button>
  </>
);
