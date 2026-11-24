import X from 'lucide-react/icons/x';
import type { ReactNode } from 'react';

interface ModalHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  preventClose: boolean;
  onClose: () => void;
}

export const ModalHeader = ({
  title,
  description,
  headerLeft,
  headerRight,
  preventClose,
  onClose,
}: ModalHeaderProps) => (
  <div
    className={`flex shrink-0 justify-between rounded-t-xl border-surface-300 border-b bg-white p-4 dark:border-surface-700 dark:bg-surface-800 ${description ? 'items-start' : 'items-center'}`}
  >
    <div className="flex min-w-0 items-center gap-3">
      {headerLeft}
      <div className="min-w-0">
        <h2 className="font-semibold text-lg text-surface-900 dark:text-surface-100">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">{description}</p>
        )}
      </div>
    </div>
    {(headerRight || !preventClose) && (
      <div className="flex shrink-0 items-center gap-2">
        {headerRight}
        {!preventClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-surface-500 outline-hidden transition-colors hover:bg-surface-100 hover:text-surface-700 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:hover:bg-surface-700 dark:hover:text-surface-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    )}
  </div>
);
