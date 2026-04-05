import type { SortMode } from '$types';

export const HeaderSortOptionButton = ({
  option,
  isActive,
  onClick,
}: {
  option: { value: SortMode; label: string };
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
      isActive
        ? 'text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
        : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
    }`}
  >
    <span>{option.label}</span>
  </button>
);
