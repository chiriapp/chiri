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
        ? 'bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100'
        : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700'
    }`}
  >
    <span>{option.label}</span>
  </button>
);
