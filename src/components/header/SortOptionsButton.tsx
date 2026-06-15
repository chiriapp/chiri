import type { SortMode } from '$types/sort';

export const SortOptionButton = ({
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
    className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
      isActive
        ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
        : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700'
    }`}
  >
    <span>{option.label}</span>
  </button>
);
