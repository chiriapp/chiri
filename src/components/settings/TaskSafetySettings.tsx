import { Select } from '$components/Select';
import { useSettingsStore } from '$context/settingsContext';
import type { SubtaskDeletionBehavior } from '$types/settings';
import { pluralize } from '$utils/misc';

const RETENTION_OPTIONS = [7, 14, 30, 60, 90];

export const TaskSafetySettings = () => {
  const {
    confirmBeforeMoveToRecentlyDeleted,
    setConfirmBeforeMoveToRecentlyDeleted,
    confirmBeforePermanentDelete,
    setConfirmBeforePermanentDelete,
    deleteSubtasksWithParent,
    setDeleteSubtasksWithParent,
    autoEmptyRecentlyDeleted,
    setAutoEmptyRecentlyDeleted,
    recentlyDeletedRetentionDays,
    setRecentlyDeletedRetentionDays,
  } = useSettingsStore();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Safety</h3>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Confirm before moving tasks to Recently Deleted
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Ask before soft-deleting tasks
            </p>
          </div>
          <input
            type="checkbox"
            checked={confirmBeforeMoveToRecentlyDeleted}
            onChange={(event) => setConfirmBeforeMoveToRecentlyDeleted(event.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <label className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Confirm before permanently deleting tasks
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Ask before removing tasks from Recently Deleted
            </p>
          </div>
          <input
            type="checkbox"
            checked={confirmBeforePermanentDelete}
            onChange={(event) => setConfirmBeforePermanentDelete(event.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">Tasks with subtasks</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Choose what happens to subtasks when their parent is deleted
            </p>
          </div>
          <Select
            value={deleteSubtasksWithParent}
            onChange={(event) =>
              setDeleteSubtasksWithParent(event.target.value as SubtaskDeletionBehavior)
            }
            className="shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          >
            <option value="delete">Delete subtasks</option>
            <option value="keep">Keep subtasks</option>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Auto-empty Recently Deleted
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Permanently delete old deleted tasks
            </p>
          </div>
          <input
            type="checkbox"
            checked={autoEmptyRecentlyDeleted}
            onChange={(event) => setAutoEmptyRecentlyDeleted(event.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>

        {autoEmptyRecentlyDeleted && (
          <div className="px-4 pb-4">
            <div className="border-surface-200 border-l-2 pl-4 dark:border-surface-600">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-surface-700 dark:text-surface-300">
                    Recently Deleted retention
                  </p>
                  <p className="text-surface-500 text-xs dark:text-surface-400">
                    Keep deleted tasks before permanent removal
                  </p>
                </div>
                <Select
                  value={recentlyDeletedRetentionDays.toString()}
                  onChange={(event) => setRecentlyDeletedRetentionDays(Number(event.target.value))}
                  className="shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
                >
                  {RETENTION_OPTIONS.map((days) => (
                    <option key={days} value={days}>
                      {days} {pluralize(days, 'day')}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
