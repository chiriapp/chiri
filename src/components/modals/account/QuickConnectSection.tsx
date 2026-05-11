import Cloud from 'lucide-react/icons/cloud';
import type { ServerType } from '$types';

interface QuickConnectConfig {
  label: string;
  description: string;
  buttonClassName: string;
}

const QUICK_CONNECT_CONFIG: Partial<Record<ServerType, QuickConnectConfig>> = {
  nextcloud: {
    label: 'Use Nextcloud Login Flow',
    description: 'Automatically authenticate via browser',
    buttonClassName:
      'bg-semantic-info/10 hover:bg-semantic-info/20 border border-semantic-info/30 text-surface-800 dark:text-surface-200 [&_svg]:text-semantic-info',
  },
  rustical: {
    label: 'Use RustiCal Login Flow',
    description: 'Automatically authenticate via browser',
    buttonClassName:
      'bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30 text-surface-800 dark:text-surface-200 [&_svg]:text-primary-500',
  },
};

interface QuickConnectSectionProps {
  serverType: ServerType;
  onClick: () => void;
}

export const QuickConnectSection = ({ serverType, onClick }: QuickConnectSectionProps) => {
  const config = QUICK_CONNECT_CONFIG[serverType];
  if (!config) return null;

  return (
    <div className="pt-3 border-surface-200 dark:border-surface-700">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
        <span className="text-xs text-surface-400 dark:text-surface-500">Quick connect</span>
        <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${config.buttonClassName}`}
      >
        <Cloud className="w-4 h-4" />
        {config.label}
      </button>
      <p className="mt-2 text-xs text-center text-surface-500 dark:text-surface-400">
        {config.description}
      </p>
    </div>
  );
};
