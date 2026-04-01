import { relaunch } from '@tauri-apps/plugin-process';
import AlertTriangle from 'lucide-react/icons/alert-triangle';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { usePlatform } from '$hooks/system/usePlatform';

export const SystemSettings = () => {
  const { isGNOME } = usePlatform();
  const {
    enableSystemTray,
    setEnableSystemTray,
    systemTrayAppliedValue,
    setSystemTrayAppliedValue,
  } = useSettingsStore();

  const systemTrayChanged = enableSystemTray !== systemTrayAppliedValue;

  const handleSystemTrayChange = (checked: boolean) => {
    setEnableSystemTray(checked);
  };

  const handleRestart = async () => {
    try {
      setSystemTrayAppliedValue(enableSystemTray);
      await relaunch();
    } catch (error) {
      console.error('Failed to relaunch app:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">System</h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Enable system tray</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Show app in system tray. Requires restart.
            </p>
          </div>
          <input
            type="checkbox"
            checked={enableSystemTray}
            onChange={(e) => handleSystemTrayChange(e.target.checked)}
            className="rounded border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none shrink-0"
          />
        </label>

        {isGNOME && (
          <div className="px-4 pb-4">
            <div className="flex gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-800/50">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>GNOME detected:</strong> System tray requires the{' '}
                <a
                  href="https://extensions.gnome.org/extension/615/appindicator-support/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-800 dark:hover:text-amber-200"
                >
                  AppIndicator and KStatusNotifierItem Support
                </a>{' '}
                extension. Without it, the tray icon will not appear.
              </p>
            </div>
          </div>
        )}

        {systemTrayChanged && (
          <>
            <div className="border-t border-surface-200 dark:border-surface-700" />
            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-blue-50 dark:bg-blue-950/50">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Restart required to apply changes
              </p>
              <button
                type="button"
                onClick={handleRestart}
                className="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset shrink-0"
              >
                Restart now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
