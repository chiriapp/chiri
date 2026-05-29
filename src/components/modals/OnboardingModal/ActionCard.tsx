import type { ReactNode } from 'react';

interface ActionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onClick: () => void;
  selected?: boolean;
  variant?: 'primary' | 'secondary';
}

export const ActionCard = ({
  icon,
  title,
  description,
  actionLabel,
  onClick,
  selected = false,
  variant = 'secondary',
}: ActionCardProps) => {
  const isPrimary = variant === 'primary' || selected;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group flex min-h-36 flex-col rounded-lg border p-3 text-left transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
        isPrimary
          ? 'border-primary-500/60 bg-primary-500/10 hover:bg-primary-500/15'
          : 'border-surface-200 bg-white hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:hover:bg-surface-700'
      }`}
    >
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${
          isPrimary
            ? 'bg-primary-500 text-primary-contrast'
            : 'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-200'
        }`}
      >
        {icon}
      </div>

      <span className="text-base font-semibold text-surface-900 dark:text-surface-100">
        {title}
      </span>
      <span className="mt-2 text-sm leading-5 text-surface-600 dark:text-surface-400">
        {description}
      </span>
      {actionLabel && (
        <span
          className={`mt-auto pt-4 text-sm font-medium ${
            isPrimary
              ? 'text-primary-700 dark:text-primary-300'
              : 'text-surface-700 dark:text-surface-300'
          }`}
        >
          {actionLabel}
        </span>
      )}
    </button>
  );
};
