import SortDesc from 'lucide-react/icons/arrow-down-wide-narrow';
import SortAsc from 'lucide-react/icons/arrow-up-narrow-wide';
import { Tooltip } from '$components/Tooltip';
import type { SortConfig } from '$types';

export const HeaderSortDirectionButton = ({
  sortConfig,
  onToggle,
}: {
  sortConfig: SortConfig;
  onToggle: () => void;
}) => {
  const isDisabled = sortConfig.mode === 'manual';
  const buttonClass = `w-full flex rounded-b-md items-center justify-between gap-2 px-3 py-1.5 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
    isDisabled
      ? 'text-surface-400 dark:text-surface-600 cursor-not-allowed'
      : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
  }`;

  return (
    <Tooltip
      content={isDisabled ? 'Not available for manual sorting' : ''}
      position="bottom"
      allowInModal
      className="whitespace-nowrap"
      triggerClassName="w-full"
    >
      <button
        type="button"
        onClick={isDisabled ? () => {} : onToggle}
        disabled={isDisabled}
        className={buttonClass}
      >
        <div className="flex items-center gap-2">
          {sortConfig.direction === 'asc' ? (
            <SortAsc className="w-4 h-4" />
          ) : (
            <SortDesc className="w-4 h-4" />
          )}
          <span>{sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}</span>
        </div>
      </button>
    </Tooltip>
  );
};
