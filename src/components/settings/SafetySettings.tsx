import CalendarDays from 'lucide-react/icons/calendar-days';
import Cloud from 'lucide-react/icons/cloud';
import Filter from 'lucide-react/icons/filter';
import Tags from 'lucide-react/icons/tags';
import type { ReactNode } from 'react';
import { useSettingsStore } from '$context/settingsContext';

const formatDeletionDescription = (labels: string[]) => {
  if (labels.length <= 1) return labels[0] ?? '';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
};

export const SafetySettings = () => {
  const {
    confirmBeforeDeletion,
    setConfirmBeforeDeletion,
    confirmBeforeDeleteCalendar,
    setConfirmBeforeDeleteCalendar,
    confirmBeforeDeleteAccount,
    setConfirmBeforeDeleteAccount,
    confirmBeforeDeleteFilter,
    setConfirmBeforeDeleteFilter,
    confirmBeforeDeleteTag,
    setConfirmBeforeDeleteTag,
  } = useSettingsStore();
  const deletionConfirmations: Array<{
    label: string;
    description: string;
    icon: ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }> = [
    {
      label: 'Accounts',
      description: 'Removes CalDAV accounts and server tasks from Chiri',
      icon: <Cloud className="h-4 w-4" />,
      checked: confirmBeforeDeleteAccount,
      onChange: setConfirmBeforeDeleteAccount,
    },
    {
      label: 'Calendars',
      description: 'Deletes local and CalDAV calendars, as well as their tasks',
      icon: <CalendarDays className="h-4 w-4" />,
      checked: confirmBeforeDeleteCalendar,
      onChange: setConfirmBeforeDeleteCalendar,
    },
    {
      label: 'Filters',
      description: 'Affects saved filters, leaves tasks untouched',
      icon: <Filter className="h-4 w-4" />,
      checked: confirmBeforeDeleteFilter,
      onChange: setConfirmBeforeDeleteFilter,
    },
    {
      label: 'Tags',
      description: 'Affects tags, leaves tasks untouched',
      icon: <Tags className="h-4 w-4" />,
      checked: confirmBeforeDeleteTag,
      onChange: setConfirmBeforeDeleteTag,
    },
  ];
  const deletionDescription = formatDeletionDescription(
    deletionConfirmations.map((confirmation) => confirmation.label.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Safety</h3>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">Deletion confirmations</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Ask before deleting {deletionDescription}
            </p>
          </div>
          <input
            type="checkbox"
            checked={confirmBeforeDeletion}
            onChange={(event) => setConfirmBeforeDeletion(event.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>

        {confirmBeforeDeletion && (
          <div className="px-4 pb-4">
            <div className="space-y-3 border-surface-200 border-l-2 pl-4 dark:border-surface-600">
              {deletionConfirmations.map((confirmation) => (
                <label key={confirmation.label} className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 text-surface-400 dark:text-surface-500">
                      {confirmation.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-surface-600 dark:text-surface-400">
                        {confirmation.label}
                      </p>
                      <p className="text-surface-500 text-xs dark:text-surface-400">
                        {confirmation.description}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={confirmation.checked}
                    onChange={(event) => confirmation.onChange(event.target.checked)}
                    className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
