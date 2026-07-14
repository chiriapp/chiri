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
    className="group flex w-full items-center gap-3 px-4 py-3 text-left outline-hidden transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-surface-700/60"
  >
    <span className="shrink-0 text-surface-400 dark:text-surface-500">{icon}</span>

    <div className="min-w-0 flex-1">
      <p className="text-sm text-surface-800 dark:text-surface-200">{label}</p>
      {description && (
        <p className="mt-0.5 text-surface-500 text-xs dark:text-surface-400">{description}</p>
      )}
    </div>

    {loading ? (
      <Loader2 className="h-3.5 w-3.5 shrink-0 text-surface-400 motion-safe:animate-spin dark:text-surface-500" />
    ) : variant === 'internal' ? (
      <ChevronRight className="h-5 w-5 shrink-0 text-surface-400 transition-colors group-hover:text-surface-600 dark:text-surface-500 dark:group-hover:text-surface-300" />
    ) : (
      <ExternalLink className="h-4 w-4 shrink-0 text-surface-400 dark:text-surface-500" />
    )}
  </button>
);
