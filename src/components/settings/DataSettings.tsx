import { appLogDir } from '@tauri-apps/api/path';
import { openPath } from '@tauri-apps/plugin-opener';
import Download from 'lucide-react/icons/download';
import FileText from 'lucide-react/icons/file-text';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Upload from 'lucide-react/icons/upload';
import { useConfirmDialog } from '$context/confirmDialogContext';
import { useSettingsStore } from '$context/settingsContext';
import { useDatabaseDeletion } from '$hooks/deletion/useDatabaseDeletion';
import { setEditorOpen } from '$lib/store/ui';
import { exportSettingsToFile, importSettingsFromFile } from '$utils/settings';

interface DataSettingsProps {
  onClose: () => void;
}

export const DataSettings = ({ onClose }: DataSettingsProps) => {
  const { exportSettings, importSettings, resetSettings } = useSettingsStore();
  const { confirm, close } = useConfirmDialog();
  const { deleteLocalDatabase } = useDatabaseDeletion();

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

    close();
    if (confirmed) {
      // close the task editor if open
      setEditorOpen(false);
      // reset settings
      resetSettings();
      // close the settings modal (and any other modals)
      onClose();
    }
  };

  const handleResetDatabase = async () => {
    await deleteLocalDatabase();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">
        Data & diagnostics
      </h3>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Export settings</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Save your preferences to a file
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const json = exportSettings();
              await exportSettingsToFile(json);
            }}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Import settings</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Restore preferences from a backup file
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await importSettingsFromFile(importSettings);
            }}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
        </div>

        <div className="border-surface-200 border-t px-4 py-3 dark:border-surface-700">
          <p className="text-surface-400 text-xs dark:text-surface-500">
            Account credentials and task data are not included.
          </p>
        </div>
      </div>

      <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Diagnostics</h4>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">App logs</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Open the folder containing log files
            </p>
          </div>
          <button
            type="button"
            onClick={async () => openPath(await appLogDir())}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
          >
            <FileText className="h-4 w-4" />
            Open folder
          </button>
        </div>
      </div>

      <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Reset</h4>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Reset preferences</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Restore all preferences to their default values
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetPreferences}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-semantic-error text-sm">Reset database</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Deletes all local data. Only use this as a last resort.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDatabase}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-semantic-error px-3 py-1.5 text-primary-contrast text-sm outline-hidden transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-semantic-error focus-visible:ring-inset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
