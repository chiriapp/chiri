export const HeaderViewMenuCheckbox = ({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) => (
  <label className="w-full flex items-center justify-between gap-2.5 py-1.5 text-sm text-surface-700 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100 rounded-sm cursor-pointer">
    <span>{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={onClick}
      className="shrink-0 rounded-sm border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 focus:ring-inset outline-hidden"
    />
  </label>
);
