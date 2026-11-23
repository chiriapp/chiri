import type { ReactNode } from 'react';

interface ToggleRowProps {
  icon: ReactNode;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export const ToggleRow = ({
  icon,
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: ToggleRowProps) => {
  return (
    <label
      className={`flex items-center gap-3 rounded-lg border border-surface-200 p-2.5 transition-colors dark:border-surface-700 ${
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700'
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-200">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-sm text-surface-900 dark:text-surface-100">
          {label}
        </span>
        <span className="mt-0.5 block text-surface-500 text-xs leading-4 dark:text-surface-400">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="shrink-0 rounded-sm border-surface-300 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-offset-2"
      />
    </label>
  );
};
