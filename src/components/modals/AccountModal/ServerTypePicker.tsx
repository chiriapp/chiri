import ArrowRight from 'lucide-react/icons/arrow-right';
import Cloud from 'lucide-react/icons/cloud';
import Globe from 'lucide-react/icons/globe';
import Server from 'lucide-react/icons/server';
import type { ServerType } from '$types';

interface ServerTypeCard {
  value: ServerType;
  label: string;
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
      { value: 'baikal', label: 'Baikal' },
      { value: 'nextcloud', label: 'Nextcloud' },
      { value: 'radicale', label: 'Radicale' },
      { value: 'rustical', label: 'RustiCal' },
      { value: 'vikunja', label: 'Vikunja' },
      { value: 'xandikos', label: 'Xandikos' },
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
    <div className="space-y-5 p-4">
      {CATEGORIES.map((category) => (
        <div key={category.title}>
          <div className="mb-2.5 flex items-center gap-2.5">
            <div
              className={`flex size-7 items-center justify-center rounded-lg ${category.iconBg}`}
            >
              {category.icon}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-surface-800 leading-tight dark:text-surface-200">
                {category.title}
              </h3>
              <p className="text-surface-700 text-xs leading-tight dark:text-surface-400">
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
                className="group flex items-center justify-between gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-left outline-none transition-colors hover:border-surface-300 hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-700/50 dark:hover:border-surface-500 dark:hover:bg-surface-700"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-sm text-surface-800 dark:text-surface-200">
                    {server.label}
                  </div>
                </div>
                <ArrowRight className="size-3.5 shrink-0 text-surface-300 transition-colors group-hover:text-primary-500 dark:text-surface-500 dark:group-hover:text-primary-400" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
