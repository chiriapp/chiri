import { Select } from '$components/Select';
import { useSettingsStore } from '$context/settingsContext';
import type { SubtaskDeletionBehavior } from '$types/settings';

export const BehaviorSettings = () => {
  const {
    confirmBeforeDeletion,
    setConfirmBeforeDeletion,
    confirmBeforePermanentDelete,
    setConfirmBeforePermanentDelete,
    confirmBeforeDeleteCalendar,
    setConfirmBeforeDeleteCalendar,
    confirmBeforeDeleteAccount,
    setConfirmBeforeDeleteAccount,
    confirmBeforeDeleteFilter,
    setConfirmBeforeDeleteFilter,
    confirmBeforeDeleteTag,
    setConfirmBeforeDeleteTag,
    deleteSubtasksWithParent,
    setDeleteSubtasksWithParent,
    defaultAccountsExpanded,
    setDefaultAccountsExpanded,
  } = useSettingsStore();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Deletion</h3>
      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Deletion confirmations</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Ask before deleting non-task items
            </p>
          </div>
          <input
            type="checkbox"
            checked={confirmBeforeDeletion}
            onChange={(e) => setConfirmBeforeDeletion(e.target.checked)}
            className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>

        {confirmBeforeDeletion && (
          <div className="px-4 pb-4">
            <div className="space-y-3 border-surface-200 border-l-2 pl-4 dark:border-surface-600">
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Accounts</p>
                  <p className="text-surface-500 text-xs dark:text-surface-400">
                    Removes CalDAV accounts and server tasks from Chiri
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={confirmBeforeDeleteAccount}
                  onChange={(e) => setConfirmBeforeDeleteAccount(e.target.checked)}
                  className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Calendars</p>
                  <p className="text-surface-500 text-xs dark:text-surface-400">
                    Deletes local and CalDAV calendars, as well as their tasks
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={confirmBeforeDeleteCalendar}
                  onChange={(e) => setConfirmBeforeDeleteCalendar(e.target.checked)}
                  className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Filters</p>
                  <p className="text-surface-500 text-xs dark:text-surface-400">
                    Affects saved filters, leaves tasks untouched
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={confirmBeforeDeleteFilter}
                  onChange={(e) => setConfirmBeforeDeleteFilter(e.target.checked)}
                  className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Tags</p>
                  <p className="text-surface-500 text-xs dark:text-surface-400">
                    Affects tags, leaves tasks untouched
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={confirmBeforeDeleteTag}
                  onChange={(e) => setConfirmBeforeDeleteTag(e.target.checked)}
                  className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                />
              </label>
            </div>
          </div>
        )}

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <label className="flex items-center justify-between p-4">
          <div>
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
            onChange={(e) => setConfirmBeforePermanentDelete(e.target.checked)}
            className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              When a deleted task has subtasks
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Choose whether subtasks move with it or stay in your lists
            </p>
          </div>
          <Select
            value={deleteSubtasksWithParent}
            onChange={(e) => setDeleteSubtasksWithParent(e.target.value as SubtaskDeletionBehavior)}
            className="shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          >
            <option value="delete">Move subtasks too</option>
            <option value="keep">Keep subtasks</option>
          </Select>
        </div>
      </div>

      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Sidebar</h3>
      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Expand new accounts in sidebar
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Show calendars when adding a new account
            </p>
          </div>
          <input
            type="checkbox"
            checked={defaultAccountsExpanded}
            onChange={(e) => setDefaultAccountsExpanded(e.target.checked)}
            className="rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>
      </div>
    </div>
  );
};
