export const ViewMenuCheckbox = ({
  label,
  checked,
  disabled,
  onClick,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <label
    className={`flex w-full items-center justify-between gap-2.5 rounded-sm py-1.5 text-sm ${
      disabled
        ? 'cursor-not-allowed text-surface-500 dark:text-surface-500'
        : 'cursor-pointer text-surface-700 hover:text-surface-900 dark:text-surface-300 dark:hover:text-surface-100'
    }`}
  >
    <span>{label}</span>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onClick}
      className="shrink-0 rounded-sm border-surface-300 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:border-surface-600"
    />
  </label>
);
