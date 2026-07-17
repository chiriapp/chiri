import RotateCcw from 'lucide-react/icons/rotate-ccw';
import { Select } from '$components/Select';
import { TaskDefaultsColorPicker } from '$components/settings/TaskDefaultsSettings/TaskDefaultsColorPicker';
import { useSettingsStore } from '$context/settingsContext';
import { defaultState } from '$context/settingsDefaults';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useColorPresets } from '$hooks/ui/useColorPresets';
import { useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';

export const TaskDefaultsCalendarSection = () => {
  const {
    defaultCalendarId,
    setDefaultCalendarId,
    preferCalDAVCalendarForNewTasks,
    setPreferCalDAVCalendarForNewTasks,
    defaultCalendarColor,
    setDefaultCalendarColor,
  } = useSettingsStore();
  const colorPresets = useColorPresets();
  const resolvedAccentColor = useResolvedAccentColor();
  const { data: accounts = [] } = useAccounts();
  const accountsWithCalendars = accounts.filter((account) => account.calendars.length > 0);

  const handleReset = () => {
    setDefaultCalendarId(defaultState.defaultCalendarId);
    setPreferCalDAVCalendarForNewTasks(defaultState.preferCalDAVCalendarForNewTasks);
    setDefaultCalendarColor(defaultState.defaultCalendarColor);
  };

  const hasChanged =
    defaultCalendarId !== defaultState.defaultCalendarId ||
    preferCalDAVCalendarForNewTasks !== defaultState.preferCalDAVCalendarForNewTasks ||
    defaultCalendarColor !== defaultState.defaultCalendarColor;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Calendar</h4>
        {hasChanged && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-surface-500 text-xs outline-hidden transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Default calendar for new tasks
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Applied when creating a new task
            </p>
          </div>
          <Select
            value={defaultCalendarId || ''}
            onChange={(e) => setDefaultCalendarId(e.target.value || null)}
            disabled={accountsWithCalendars.length === 0}
            className="max-w-50 shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          >
            {accountsWithCalendars.length === 0 ? (
              <option value="">No accounts available</option>
            ) : (
              <>
                <option value="">Use first calendar</option>
                {accountsWithCalendars.map((account) => (
                  <optgroup key={account.id} label={account.name}>
                    {account.calendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.displayName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </>
            )}
          </Select>
        </div>

        {!defaultCalendarId && (
          <div className="px-4 pb-4">
            <div className="border-surface-200 border-l-2 pl-4 dark:border-surface-600">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">Prefer CalDAV</p>
                  <p className="text-surface-500 text-xs dark:text-surface-400">
                    When an account is added, prefer using the first remote calendar instead of
                    local
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferCalDAVCalendarForNewTasks}
                  onChange={(e) => setPreferCalDAVCalendarForNewTasks(e.target.checked)}
                  className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                />
              </label>
            </div>
          </div>
        )}

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <TaskDefaultsColorPicker
          label="Default calendar color"
          value={defaultCalendarColor}
          onChange={setDefaultCalendarColor}
          presets={colorPresets}
          accentColor={resolvedAccentColor}
        />
      </div>
    </div>
  );
};
