import { invoke } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import AlertTriangle from 'lucide-react/icons/alert-triangle';
import { AppSelect } from '$components/AppSelect';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { usePlatform } from '$hooks/system/usePlatform';
import type { WindowDecorationsMode } from '$types/settings';
import { isLinuxPlatform } from '$utils/platform';

export const SystemSettings = () => {
  const { isGNOME } = usePlatform();
  const {
    enableSystemTray,
    setEnableSystemTray,
    systemTrayAppliedValue,
    setSystemTrayAppliedValue,
    windowDecorationsMode,
    setWindowDecorationsMode,
  } = useSettingsStore();

  const isLinux = isLinuxPlatform();

  const systemTrayChanged = enableSystemTray !== systemTrayAppliedValue;

  const handleSystemTrayChange = (checked: boolean) => {
    setEnableSystemTray(checked);
  };

  const handleWindowDecorationsChange = async (mode: WindowDecorationsMode) => {
    setWindowDecorationsMode(mode);
    // 'auto' can only be re-applied by restarting. the Rust startup hook is
    // the only thing that runs the per-DE titlebar logic. for 'on'/'off' we
    // can toggle live via the Rust WebviewWindow API
    if (mode !== 'auto') {
      try {
        await invoke('set_window_decorations', { enabled: mode === 'on' });
      } catch (error) {
        console.error('Failed to apply window decorations override:', error);
      }
    }
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
            className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden shrink-0"
          />
        </label>

        {isGNOME && (
          <div className="px-4 pb-4">
            <div className="flex gap-2 rounded-lg bg-semantic-warning/10 p-3 border border-semantic-warning/30">
              <AlertTriangle className="w-4 h-4 text-semantic-warning shrink-0 mt-0.5" />
              <p className="text-xs text-semantic-warning">
                <strong>GNOME detected:</strong> System tray requires the{' '}
                <a
                  href="https://extensions.gnome.org/extension/615/appindicator-support/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-80"
                >
                  AppIndicator and KStatusNotifierItem Support
                </a>{' '}
                extension. Without it, the tray icon will not appear.
              </p>
            </div>
          </div>
        )}

        {isLinux && (
          <>
            <div className="border-t border-surface-200 dark:border-surface-700" />
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm text-surface-700 dark:text-surface-300">
                  Enable window decorations
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  Show title bar and borders on Linux. If changed, overrides the default
                  auto-detection.
                </p>
              </div>
              <AppSelect
                value={windowDecorationsMode}
                onChange={(e) =>
                  handleWindowDecorationsChange(e.target.value as WindowDecorationsMode)
                }
                className="text-sm border border-transparent bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg outline-none focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors shrink-0"
              >
                <option value="auto">Auto (detect)</option>
                <option value="on">Always show</option>
                <option value="off">Always hide</option>
              </AppSelect>
            </div>
          </>
        )}

        {systemTrayChanged && (
          <>
            <div className="border-t border-surface-200 dark:border-surface-700" />
            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-100 dark:bg-surface-700/50">
              <p className="text-sm text-surface-700 dark:text-surface-300">
                Restart required to apply changes
              </p>
              <button
                type="button"
                onClick={handleRestart}
                className="px-3 py-1.5 text-sm font-medium bg-primary-500 hover:bg-primary-600 text-primary-contrast rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset shrink-0"
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
