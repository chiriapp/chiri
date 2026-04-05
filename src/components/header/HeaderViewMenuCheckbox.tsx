import Check from 'lucide-react/icons/check';

export const HeaderViewMenuCheckbox = ({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-between gap-2.5 py-1.5 text-sm text-surface-700 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset rounded-sm"
  >
    <span>{label}</span>
    <div
      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
        checked ? 'bg-primary-500 border-primary-500' : 'border-surface-300 dark:border-surface-600'
      }`}
    >
      {checked && <Check className="w-3 h-3 text-primary-contrast" strokeWidth={3} />}
    </div>
  </button>
);
