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
        className="flex items-center gap-1 rounded text-surface-500 text-xs outline-none transition-colors hover:text-surface-700 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-surface-400 dark:hover:text-surface-200"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
        Advanced
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <label
              htmlFor="principal-url"
              className="mb-1 block font-medium text-sm text-surface-700 dark:text-surface-300"
            >
              Principal URL
            </label>
            <ComposedInput
              id="principal-url"
              type="text"
              value={principalUrl}
              onChange={onPrincipalUrlChange}
              placeholder="/principals/user/ or https://caldav.example.com/principals/user/"
              className="w-full rounded-lg border border-transparent bg-surface-100 px-3 py-2 text-sm text-surface-800 transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
            />
            <p className="mt-1.5 flex flex-row text-surface-500 text-xs dark:text-surface-400">
              <Info className="mr-1 inline h-3.5 w-3.5 shrink-0 text-surface-400" />
              Overrides the auto-discovered principal URL. May be absolute or server-relative.
            </p>
          </div>
          <div>
            <label
              htmlFor="calendar-home-url"
              className="mb-1 block font-medium text-sm text-surface-700 dark:text-surface-300"
            >
              Calendar Home URL
            </label>
            <ComposedInput
              id="calendar-home-url"
              type="url"
              value={calendarHomeUrl}
              onChange={onCalendarHomeUrlChange}
              placeholder="https://caldav.example.com/calendars/user/"
              className="w-full rounded-lg border border-transparent bg-surface-100 px-3 py-2 text-sm text-surface-800 transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
            />
            <p className="mt-1.5 flex flex-row text-surface-500 text-xs dark:text-surface-400">
              <Info className="mr-1 inline h-3.5 w-3.5 shrink-0 text-surface-400" />
              Uses calendar home URLs directly, bypassing auto-discovery.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
