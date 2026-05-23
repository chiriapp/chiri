import { AppSelect } from '$components/AppSelect';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import type { SubtaskDeletionBehavior } from '$types';

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
    confirmBeforeDeleteTag,
    setConfirmBeforeDeleteTag,
    deleteSubtasksWithParent,
    setDeleteSubtasksWithParent,
    defaultAccountsExpanded,
    setDefaultAccountsExpanded,
  } = useSettingsStore();

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">Deletion</h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Deletion confirmations</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Ask before deleting non-task items
            </p>
          </div>
          <input
            type="checkbox"
            checked={confirmBeforeDeletion}
            onChange={(e) => setConfirmBeforeDeletion(e.target.checked)}
            className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
          />
        </label>

        {confirmBeforeDeletion && (
          <div className="px-4 pb-4">
            <div className="space-y-3 pl-4 border-l-2 border-surface-200 dark:border-surface-600">
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Accounts</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    Removes CalDAV accounts and server tasks from Chiri
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={confirmBeforeDeleteAccount}
                  onChange={(e) => setConfirmBeforeDeleteAccount(e.target.checked)}
                  className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Calendars</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    Deletes local and CalDAV calendars, as well as their tasks
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={confirmBeforeDeleteCalendar}
                  onChange={(e) => setConfirmBeforeDeleteCalendar(e.target.checked)}
                  className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Tags</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    Leaves tagged tasks untouched
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={confirmBeforeDeleteTag}
                  onChange={(e) => setConfirmBeforeDeleteTag(e.target.checked)}
                  className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
                />
              </label>
            </div>
          </div>
        )}

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Confirm before permanently deleting tasks
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Ask before removing tasks from Recently Deleted
            </p>
          </div>
          <input
            type="checkbox"
            checked={confirmBeforePermanentDelete}
            onChange={(e) => setConfirmBeforePermanentDelete(e.target.checked)}
            className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
          />
        </label>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              When a deleted task has subtasks
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Choose whether subtasks move with it or stay in your lists
            </p>
          </div>
          <AppSelect
            value={deleteSubtasksWithParent}
            onChange={(e) => setDeleteSubtasksWithParent(e.target.value as SubtaskDeletionBehavior)}
            className="text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors shrink-0"
          >
            <option value="delete">Move subtasks too</option>
            <option value="keep">Keep subtasks</option>
          </AppSelect>
        </div>
      </div>

      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">Sidebar</h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Expand new accounts in sidebar
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Show calendars when adding a new account
            </p>
          </div>
          <input
            type="checkbox"
            checked={defaultAccountsExpanded}
            onChange={(e) => setDefaultAccountsExpanded(e.target.checked)}
            className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
          />
        </label>
      </div>
    </div>
  );
};
