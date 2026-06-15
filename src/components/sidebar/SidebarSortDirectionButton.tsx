import SortDesc from 'lucide-react/icons/arrow-down-wide-narrow';
import SortAsc from 'lucide-react/icons/arrow-up-narrow-wide';
import { Tooltip } from '$components/Tooltip';

interface SidebarSortDirectionButtonProps {
  direction: 'asc' | 'desc';
  disabled: boolean;
  onToggle: () => void;
}

export const SidebarSortDirectionButton = ({
  direction,
  disabled,
  onToggle,
}: SidebarSortDirectionButtonProps) => (
  <Tooltip
    content={disabled ? 'Not available for manual sorting' : ''}
    position="right"
    allowInModal
    className="whitespace-nowrap"
    triggerClassName="w-full"
  >
    <button
      type="button"
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
        disabled
          ? 'cursor-not-allowed text-surface-400 dark:text-surface-600'
          : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700'
      }`}
    >
      {direction === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
      <span>{direction === 'asc' ? 'Ascending' : 'Descending'}</span>
    </button>
  </Tooltip>
);
