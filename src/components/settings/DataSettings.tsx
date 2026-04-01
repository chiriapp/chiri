import { appLogDir } from '@tauri-apps/api/path';
import { openPath } from '@tauri-apps/plugin-opener';
import Download from 'lucide-react/icons/download';
import FileText from 'lucide-react/icons/file-text';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Upload from 'lucide-react/icons/upload';
import { useConfirmDialog } from '$hooks/store/useConfirmDialog';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { deleteDatabase } from '$lib/bootstrap';
import { exportSettingsToFile, importSettingsFromFile } from '$utils/settings';

export const DataSettings = () => {
  const { exportSettings, importSettings, resetSettings } = useSettingsStore();
  const { confirm } = useConfirmDialog();

  const handleResetPreferences = async () => {
    const confirmed = await confirm({
      title: 'Reset Preferences',
      message: (
        <p>
          <span className="font-bold">Are you sure?</span> This will restore all user preferences to
          their default values.
        </p>
      ),
      confirmLabel: 'Reset Preferences',
      destructive: true,
    });

    if (confirmed) resetSettings();
  };

  const handleResetDatabase = async () => {
    const confirmed = await confirm({
      title: 'Reset Database',
      message: (
        <div className="space-y-2">
          <p>
            <span className="font-bold">Are you sure?</span> This will not affect data on your
            CalDAV servers, but local data will be lost and accounts will need to be set up again.
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Not recommended unless you are experiencing issues or want to start fresh.
          </p>
        </div>
      ),
      confirmLabel: 'Reset Database',
      destructive: true,
      delayConfirmSeconds: 5,
    });

    if (confirmed) await deleteDatabase();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">Data</h3>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Export settings</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Save your preferences to a file
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const json = exportSettings();
              await exportSettingsToFile(json);
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset shrink-0"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Import settings</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Restore preferences from a backup file
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await importSettingsFromFile(importSettings);
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset shrink-0"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700 px-4 py-3">
          <p className="text-xs text-surface-400 dark:text-surface-500">
            Account credentials and task data are not included.
          </p>
        </div>
      </div>

      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">
        Diagnostics
      </h3>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">App logs</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Open the folder containing log files
            </p>
          </div>
          <button
            type="button"
            onClick={async () => openPath(await appLogDir())}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset shrink-0"
          >
            <FileText className="w-4 h-4" />
            Open folder
          </button>
        </div>
      </div>

      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">Reset</h3>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Reset preferences</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Restore all preferences to their default values
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetPreferences}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700" />

        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-red-600 dark:text-red-400">Reset database</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Deletes all local data. Only use this as a last resort.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDatabase}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-inset shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
