import ChevronDown from 'lucide-react/icons/chevron-down';
import Info from 'lucide-react/icons/info';
import { useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import { getPredefinedServerUrl } from '$constants/settings';
import type { ServerType } from '$types';

interface AdvancedSectionProps {
  serverType: ServerType;
  principalUrl: string;
  onPrincipalUrlChange: (v: string) => void;
  calendarHomeUrl: string;
  onCalendarHomeUrlChange: (v: string) => void;
  initialOpen?: boolean;
}

export const AdvancedSection = ({
  serverType,
  principalUrl,
  onPrincipalUrlChange,
  calendarHomeUrl,
  onCalendarHomeUrlChange,
  initialOpen = false,
}: AdvancedSectionProps) => {
  const [open, setOpen] = useState(initialOpen);

  if (getPredefinedServerUrl(serverType)) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
        Advanced
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <label
              htmlFor="principal-url"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Principal URL
            </label>
            <ComposedInput
              id="principal-url"
              type="url"
              value={principalUrl}
              onChange={onPrincipalUrlChange}
              placeholder="https://caldav.example.com/principals/user/"
              className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
            />
            <p className="mt-1.5 text-xs flex flex-row text-surface-500 dark:text-surface-400">
              <Info className="inline w-3.5 h-3.5 mr-1 shrink-0 text-surface-400" />
              Override the auto-discovered principal URL.
            </p>
          </div>
          <div>
            <label
              htmlFor="calendar-home-url"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Calendar Home URL
            </label>
            <ComposedInput
              id="calendar-home-url"
              type="url"
              value={calendarHomeUrl}
              onChange={onCalendarHomeUrlChange}
              placeholder="https://caldav.example.com/calendars/user/"
              className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
            />
            <p className="mt-1.5 text-xs flex flex-row text-surface-500 dark:text-surface-400">
              <Info className="inline w-3.5 h-3.5 mr-1 shrink-0 text-surface-400" />
              Skip auto-discovery entirely and use this URL directly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
