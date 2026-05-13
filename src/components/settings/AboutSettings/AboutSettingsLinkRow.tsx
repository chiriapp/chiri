import ChevronRight from 'lucide-react/icons/chevron-right';
import ExternalLink from 'lucide-react/icons/external-link';
import Loader2 from 'lucide-react/icons/loader-2';
import type { ReactNode } from 'react';

interface AboutSettingsLinkRowProps {
  icon: ReactNode;
  label: string;
  description?: string;
  loading?: boolean;
  /** 'internal' shows a chevron (in-app navigation); 'external' shows a persistent ExternalLink */
  variant?: 'internal' | 'external';
  onClick: () => void;
}

export const AboutSettingsLinkRow = ({
  icon,
  label,
  description,
  loading,
  variant = 'external',
  onClick,
}: AboutSettingsLinkRowProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-100 dark:hover:bg-surface-700/60 transition-colors group outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
  >
    <span className="text-surface-400 dark:text-surface-500 shrink-0">{icon}</span>

    <div className="flex-1 min-w-0">
      <p className="text-sm text-surface-800 dark:text-surface-200">{label}</p>
      {description && (
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{description}</p>
      )}
    </div>

    {loading ? (
      <Loader2 className="w-3.5 h-3.5 text-surface-400 dark:text-surface-500 animate-spin shrink-0" />
    ) : variant === 'internal' ? (
      <ChevronRight className="w-5 h-5 text-surface-400 dark:text-surface-500 group-hover:text-surface-600 dark:group-hover:text-surface-300 transition-colors shrink-0" />
    ) : (
      <ExternalLink className="w-4 h-4 text-surface-400 dark:text-surface-500 shrink-0" />
    )}
  </button>
);
