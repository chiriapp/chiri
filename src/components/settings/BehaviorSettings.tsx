import { relaunch } from '@tauri-apps/plugin-process';
import { AppSelect } from '$components/AppSelect';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import type { SubtaskDeletionBehavior } from '$types';
import { isMacPlatform } from '$utils/platform';

export const BehaviorSettings = () => {
  const {
    confirmBeforeDeletion,
    setConfirmBeforeDeletion,
    confirmBeforeDelete,
    setConfirmBeforeDelete,
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
    confirmBeforeQuit,
    setConfirmBeforeQuit,
    confirmBeforeQuitAppliedValue,
    setConfirmBeforeQuitAppliedValue,
  } = useSettingsStore();

  const isMac = isMacPlatform();
  const confirmBeforeQuitChanged = confirmBeforeQuit !== confirmBeforeQuitAppliedValue;

  const handleConfirmBeforeQuitChange = (checked: boolean) => {
    setConfirmBeforeQuit(checked);
  };

  const handleRestart = async () => {
    try {
      setConfirmBeforeQuitAppliedValue(confirmBeforeQuit);
      await relaunch();
    } catch (error) {
      console.error('Failed to relaunch app:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">Behavior</h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Confirm before deleting
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Ask for confirmation before any deletion
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
                <p className="text-sm text-surface-600 dark:text-surface-400">Accounts</p>
                <input
                  type="checkbox"
                  checked={confirmBeforeDeleteAccount}
                  onChange={(e) => setConfirmBeforeDeleteAccount(e.target.checked)}
                  className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
                />
              </label>
              <label className="flex items-center justify-between">
                <p className="text-sm text-surface-600 dark:text-surface-400">Calendars</p>
                <input
                  type="checkbox"
                  checked={confirmBeforeDeleteCalendar}
                  onChange={(e) => setConfirmBeforeDeleteCalendar(e.target.checked)}
                  className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
                />
              </label>
              <label className="flex items-center justify-between">
                <p className="text-sm text-surface-600 dark:text-surface-400">Tags</p>
                <input
                  type="checkbox"
                  checked={confirmBeforeDeleteTag}
                  onChange={(e) => setConfirmBeforeDeleteTag(e.target.checked)}
                  className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
                />
              </label>
              <label className="flex items-center justify-between">
                <p className="text-sm text-surface-600 dark:text-surface-400">Tasks</p>
                <input
                  type="checkbox"
                  checked={confirmBeforeDelete}
                  onChange={(e) => setConfirmBeforeDelete(e.target.checked)}
                  className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden"
                />
              </label>
            </div>
          </div>
        )}

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Deleting a task with subtasks
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              What happens to its subtasks
            </p>
          </div>
          <AppSelect
            value={deleteSubtasksWithParent}
            onChange={(e) => setDeleteSubtasksWithParent(e.target.value as SubtaskDeletionBehavior)}
            className="text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors shrink-0"
          >
            <option value="delete">Delete subtasks</option>
            <option value="keep">Keep subtasks</option>
          </AppSelect>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

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

        {isMac && (
          <>
            <div className="border-t border-surface-200 dark:border-surface-700" />
            <label className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-surface-700 dark:text-surface-300">
                  Show warning before quitting with ⌘Q
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  Hold or double press ⌘Q to quit. Requires restart.
                </p>
              </div>
              <input
                type="checkbox"
                checked={confirmBeforeQuit}
                onChange={(e) => handleConfirmBeforeQuitChange(e.target.checked)}
                className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden shrink-0"
              />
            </label>

            {confirmBeforeQuitChanged && (
              <>
                <div className="border-t border-surface-200 dark:border-surface-700" />
                <div className="flex items-center justify-between gap-4 px-4 py-3 bg-blue-50 dark:bg-blue-950/50">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Restart required to apply changes
                  </p>
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset shrink-0"
                  >
                    Restart now
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
