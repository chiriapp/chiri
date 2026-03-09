import ChevronDown from 'lucide-react/icons/chevron-down';
import Download from 'lucide-react/icons/download';
import Upload from 'lucide-react/icons/upload';
import { useState } from 'react';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { exportSettingsToFile, importSettingsFromFile } from '$utils/settings';

export const DataSettings = () => {
  const { exportSettings, importSettings } = useSettingsStore();
  const [showIncluded, setShowIncluded] = useState(false);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">Data</h3>
      <div className="space-y-4 rounded-lg border border-surface-200 dark:border-surface-700 p-4 bg-white dark:bg-surface-800">
        <div>
          <h3 className="text-sm font-medium text-surface-800 dark:text-surface-200 mb-3">
            Settings Backup
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
            Export your settings to a file for backup or transfer to another device.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                const json = exportSettings();
                await exportSettingsToFile(json);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <Download className="w-4 h-4" />
              Export Settings
            </button>
            <button
              type="button"
              onClick={async () => {
                await importSettingsFromFile(importSettings);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <Upload className="w-4 h-4" />
              Import Settings
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
          <button
            type="button"
            onClick={() => setShowIncluded(!showIncluded)}
            className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <span>What's included?</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showIncluded ? 'rotate-180' : ''}`}
            />
          </button>

          {showIncluded && (
            <div className="px-4 pb-4 space-y-2 text-sm text-surface-600 dark:text-surface-400">
              <ul className="space-y-1">
                <li>• Appearance settings (theme, accent color)</li>
                <li>• Behavior preferences</li>
                <li>• Notification settings</li>
                <li>• Sync preferences</li>
              </ul>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Note: Account credentials and task data are not included in settings export.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
