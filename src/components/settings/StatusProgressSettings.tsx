import HelpCircle from 'lucide-react/icons/help-circle';
import { Select } from '$components/Select';
import { Tooltip } from '$components/Tooltip';
import { useSettingsStore } from '$context/settingsContext';
import { isProgressIncrement } from '$types/settings/categories/statusProgress';

export const StatusProgressSettings = () => {
  const {
    syncStatusProgress,
    setSyncStatusProgress,
    progressIncrement,
    setProgressIncrement,
    completeInProcessTasks,
    setCompleteInProcessTasks,
  } = useSettingsStore();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">
        Status & progress
      </h3>

      <div className="overflow-hidden rounded-lg border border-surface-300 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label
          htmlFor="sync-status-progress"
          className="flex cursor-pointer items-start justify-between gap-4 p-4"
        >
          <div className="min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm text-surface-700 dark:text-surface-300">
                  Keep status, progress, and completion in sync
                </span>
                <Tooltip
                  content="0% means Needs Action, 1-99% means In Process, and 100% means Completed."
                  position="top"
                  allowInModal
                >
                  <button
                    type="button"
                    aria-label="Status and progress synchronization rules"
                    onClick={(event) => event.preventDefault()}
                    className="flex size-5 shrink-0 items-center justify-center rounded-md p-0 text-surface-500 leading-none outline-hidden transition-colors hover:text-surface-600 focus-visible:bg-primary-500/15 focus-visible:text-primary-ink dark:text-surface-500 dark:focus-visible:bg-primary-400/15 dark:focus-visible:text-primary-400 dark:hover:text-surface-300"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Changing a task&apos;s status or progress updates the related fields automatically
              </p>
            </div>
          </div>
          <input
            id="sync-status-progress"
            type="checkbox"
            checked={syncStatusProgress}
            onChange={(event) => setSyncStatusProgress(event.target.checked)}
            className="mt-0.5 shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-ink focus:ring-offset-2"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-300 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label htmlFor="progress-increment" className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">Progress increment</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              How much the progress slider changes at each step
            </p>
          </div>
          <Select
            id="progress-increment"
            value={String(progressIncrement)}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (isProgressIncrement(value)) {
                setProgressIncrement(value);
              }
            }}
            className="shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-ink focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          >
            <option value="1">1%</option>
            <option value="5">5%</option>
            <option value="10">10%</option>
            <option value="25">25%</option>
          </Select>
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-300 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label
          htmlFor="complete-in-process-tasks"
          className="flex items-center justify-between gap-4 p-4"
        >
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">
              When checking off an "In Process" task
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Choose what the checkbox does
            </p>
          </div>
          <Select
            id="complete-in-process-tasks"
            value={completeInProcessTasks ? 'complete' : 'needs-action'}
            onChange={(event) => setCompleteInProcessTasks(event.target.value === 'complete')}
            className="shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-ink focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          >
            <option value="complete">Complete the task</option>
            <option value="needs-action">Back to "Needs Action"</option>
          </Select>
        </label>
      </div>
    </div>
  );
};
