import ArrowRight from 'lucide-react/icons/arrow-right';
import Cloud from 'lucide-react/icons/cloud';
import Globe from 'lucide-react/icons/globe';
import Server from 'lucide-react/icons/server';
import type { ServerType } from '$types';

interface ServerTypeCard {
  value: ServerType;
  label: string;
  description?: string;
}

interface ServerTypeCategory {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  servers: ServerTypeCard[];
}

const CATEGORIES: ServerTypeCategory[] = [
  {
    title: 'Managed',
    subtitle: 'Hosted CalDAV providers',
    icon: <Cloud className="size-5" />,
    iconBg: 'bg-semantic-info/15 text-semantic-info',
    servers: [
      { value: 'fastmail', label: 'Fastmail' },
      { value: 'fruux', label: 'fruux' },
      { value: 'mailbox', label: 'Mailbox.org' },
      { value: 'migadu', label: 'Migadu' },
      { value: 'purelymail', label: 'Purelymail' },
      { value: 'runbox', label: 'Runbox' },
    ],
  },
  {
    title: 'Self-Hosted',
    subtitle: 'Run your own server',
    icon: <Server className="size-5" />,
    iconBg: 'bg-primary-500/15 text-primary-500',
    servers: [
      { value: 'baikal', label: 'Baikal', description: 'Basic & Digest auth' },
      { value: 'nextcloud', label: 'Nextcloud', description: 'Supports quick connect' },
      { value: 'radicale', label: 'Radicale' },
      { value: 'rustical', label: 'RustiCal', description: 'Supports quick connect' },
      {
        value: 'vikunja',
        label: 'Vikunja',
        description: 'Limited support',
      },
    ],
  },
  {
    title: 'Generic',
    subtitle: 'If your server is not listed, try using the generic option',
    icon: <Globe className="size-5" />,
    iconBg: 'bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300',
    servers: [
      {
        value: 'generic',
        label: 'Generic server',
      },
    ],
  },
];

interface ServerTypePickerProps {
  onSelect: (type: ServerType) => void;
}

export const ServerTypePicker = ({ onSelect }: ServerTypePickerProps) => {
  return (
    <div className="p-4 space-y-5">
      {CATEGORIES.map((category) => (
        <div key={category.title}>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div
              className={`size-7 rounded-lg flex items-center justify-center ${category.iconBg}`}
            >
              {category.icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 leading-tight">
                {category.title}
              </h3>
              <p className="text-xs text-surface-700 dark:text-surface-400 leading-tight">
                {category.subtitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {category.servers.map((server) => (
              <button
                key={server.value}
                type="button"
                onClick={() => onSelect(server.value)}
                className="group flex items-center justify-between gap-2 px-3 py-2.5 text-left rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700/50 hover:border-surface-300 dark:hover:border-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">
                    {server.label}
                  </div>
                  {server.description && (
                    <div className="text-[11px] text-surface-500 dark:text-surface-400 truncate">
                      {server.description}
                    </div>
                  )}
                </div>
                <ArrowRight className="size-3.5 shrink-0 text-surface-300 dark:text-surface-500 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
