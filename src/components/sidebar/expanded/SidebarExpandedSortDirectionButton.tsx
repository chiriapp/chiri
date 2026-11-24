import SortNeutral from 'lucide-react/icons/arrow-down-up';
import SortDesc from 'lucide-react/icons/arrow-down-wide-narrow';
import SortAsc from 'lucide-react/icons/arrow-up-narrow-wide';
import { Tooltip } from '$components/Tooltip';

interface SidebarSortDirectionButtonProps {
  direction: 'asc' | 'desc';
  disabled: boolean;
  onToggle: () => void;
}

export const SidebarExpandedSortDirectionButton = ({
  direction,
  disabled,
  onToggle,
}: SidebarSortDirectionButtonProps) => {
  const directionLabel = disabled
    ? 'Manual sorting'
    : direction === 'asc'
      ? 'Ascending'
      : 'Descending';

  return (
    <Tooltip
      content={disabled ? "Sort direction isn't used with manual sorting" : directionLabel}
      position="top"
      allowInModal
      className="whitespace-nowrap"
      triggerClassName="shrink-0"
    >
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        aria-label={disabled ? 'Sort direction unavailable' : `Sort direction: ${directionLabel}`}
        className={`flex size-7 shrink-0 items-center justify-center rounded-md p-1 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
          disabled
            ? 'cursor-not-allowed text-surface-400 dark:text-surface-600'
            : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700'
        }`}
      >
        {disabled ? (
          <SortNeutral className="h-4 w-4" />
        ) : direction === 'asc' ? (
          <SortAsc className="h-4 w-4" />
        ) : (
          <SortDesc className="h-4 w-4" />
        )}
      </button>
    </Tooltip>
  );
};
