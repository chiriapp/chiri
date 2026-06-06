import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { relaunch } from '@tauri-apps/plugin-process';
import AlertTriangle from 'lucide-react/icons/alert-triangle';
import Loader2 from 'lucide-react/icons/loader-2';
import { AppSelect } from '$components/AppSelect';
import { useSettingsStore } from '$context/settingsContext';
import { useAutostart } from '$hooks/system/useAutostart';
import { usePlatform } from '$hooks/system/usePlatform';
import type { WindowDecorationsMode } from '$types/settings';
import { isLinuxPlatform, isMacPlatform } from '$utils/platform';

const formatRestartReasons = (reasons: string[]) => {
  if (reasons.length <= 1) return reasons[0] ?? 'changes';
  if (reasons.length === 2) return `${reasons[0]} and ${reasons[1]}`;

  return `${reasons.slice(0, -1).join(', ')}, and ${reasons[reasons.length - 1]}`;
};

export const SystemSettings = () => {
  const { isGNOME } = usePlatform();
  const autostart = useAutostart();
  const {
    enableSystemTray,
    setEnableSystemTray,
    showWindowOnLoginLaunch,
    setShowWindowOnLoginLaunch,
    hideDockIconWhenWindowClosed,
    setHideDockIconWhenWindowClosed,
    confirmBeforeQuit,
    setConfirmBeforeQuit,
    confirmBeforeQuitAppliedValue,
    setConfirmBeforeQuitAppliedValue,
    windowDecorationsMode,
    windowDecorationsAppliedValue,
    setWindowDecorationsMode,
    setWindowDecorationsAppliedValue,
  } = useSettingsStore();

  const isLinux = isLinuxPlatform();
  const isMac = isMacPlatform();

  const windowDecorationsChanged =
    isLinux && windowDecorationsMode !== windowDecorationsAppliedValue;
  const confirmBeforeQuitChanged = isMac && confirmBeforeQuit !== confirmBeforeQuitAppliedValue;
  const restartReasons = [
    ...(windowDecorationsChanged ? ['window decoration'] : []),
    ...(confirmBeforeQuitChanged ? ['quit warning'] : []),
  ];
  const restartRequired = restartReasons.length > 0;
  const restartRequiredMessage = `Restart to apply ${formatRestartReasons(restartReasons)} changes`;
  const launchAtLoginLoading = autostart.enabled === null;
  const launchAtLoginBusy = launchAtLoginLoading || autostart.pending;
  const launchAtLoginDescription = launchAtLoginLoading
    ? 'Checking login item status...'
    : autostart.pending
      ? 'Updating login item...'
      : 'Start Chiri automatically when you sign in';
  const launchAtLoginSpinnerClass =
    autostart.pending && autostart.enabled === true
      ? 'text-primary-500 dark:text-primary-400'
      : 'text-surface-500 dark:text-surface-400';
  const startQuietlyAtLoginDisabled = autostart.enabled !== true || !enableSystemTray;

  const handleSystemTrayChange = (checked: boolean) => {
    setEnableSystemTray(checked);
  };

  const handleHideDockIconWhenWindowClosedChange = async (checked: boolean) => {
    setHideDockIconWhenWindowClosed(checked);
    try {
      await invoke('set_hide_dock_icon_when_window_closed', { enabled: checked });
    } catch (error) {
      console.error('Failed to apply Dock icon preference:', error);
    }
  };

  const handleWindowDecorationsChange = async (mode: WindowDecorationsMode) => {
    setWindowDecorationsMode(mode);
    // 'auto' can only be re-applied by restarting. the Rust startup hook is
    // the only thing that runs the per-DE titlebar logic. for 'on'/'off' we
    // can toggle live via the Rust WebviewWindow API
    if (mode !== 'auto') {
      try {
        await invoke('set_window_decorations', { enabled: mode === 'on' });
        setWindowDecorationsAppliedValue(mode);
      } catch (error) {
        console.error('Failed to apply window decorations override:', error);
      }
    }
  };

  const handleRestart = async () => {
    try {
      setWindowDecorationsAppliedValue(windowDecorationsMode);
      setConfirmBeforeQuitAppliedValue(confirmBeforeQuit);
      await relaunch();
    } catch (error) {
      console.error('Failed to relaunch app:', error);
    }
  };

  const handleOpenLoginItemsSettings = async () => {
    try {
      await openUrl('x-apple.systempreferences:com.apple.LoginItems-Settings.extension');
    } catch (error) {
      console.error('Failed to open Login Items & Extensions settings:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">System</h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <label
          className={`flex items-center justify-between p-4 ${launchAtLoginBusy ? 'cursor-wait' : ''}`}
        >
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Launch at login</p>
            <p className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
              {launchAtLoginBusy && (
                <Loader2 className={`size-3 shrink-0 animate-spin ${launchAtLoginSpinnerClass}`} />
              )}
              {launchAtLoginDescription}
            </p>
          </div>
          <input
            type="checkbox"
            checked={autostart.enabled ?? false}
            disabled={launchAtLoginBusy}
            onChange={(e) => autostart.setEnabled(e.target.checked)}
            className={`rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${launchAtLoginBusy ? 'checkbox-busy' : ''}`}
          />
        </label>

        {isMac && (
          <>
            <div className="px-4 pb-4">
              <div className="space-y-3 pl-4 border-l-2 border-surface-200 dark:border-surface-600">
                <label
                  className={`flex items-center justify-between ${startQuietlyAtLoginDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div>
                    <p className="text-sm text-surface-700 dark:text-surface-300">
                      Start quietly in tray at login
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      Hide the main window when Chiri starts automatically. Requires system tray.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!showWindowOnLoginLaunch}
                    disabled={startQuietlyAtLoginDisabled}
                    onChange={(e) => setShowWindowOnLoginLaunch(!e.target.checked)}
                    className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-surface-200 dark:border-surface-700" />

            <div className="px-4 py-3">
              <button
                type="button"
                onClick={handleOpenLoginItemsSettings}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                Open macOS Settings
              </button>
            </div>
          </>
        )}

        {autostart.error && (
          <div className="px-4 pb-4">
            <div className="flex gap-2 rounded-lg bg-semantic-error/10 p-3 border border-semantic-error/30">
              <AlertTriangle className="w-4 h-4 text-semantic-error shrink-0 mt-0.5" />
              <p className="text-xs text-semantic-error">{autostart.error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Enable system tray</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Lets Chiri run in the background with a tray icon.
            </p>
          </div>
          <input
            type="checkbox"
            checked={enableSystemTray}
            onChange={(e) => handleSystemTrayChange(e.target.checked)}
            className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden shrink-0"
          />
        </label>

        {isMac && (
          <div className="px-4 pb-4">
            <div className="space-y-3 pl-4 border-l-2 border-surface-200 dark:border-surface-600">
              <label
                className={`flex items-center justify-between ${!enableSystemTray ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">Hide Dock icon</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    Hide the Dock icon when all windows are closed
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={hideDockIconWhenWindowClosed}
                  disabled={!enableSystemTray}
                  onChange={(e) => handleHideDockIconWhenWindowClosedChange(e.target.checked)}
                  className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden shrink-0 disabled:opacity-50"
                />
              </label>
            </div>
          </div>
        )}

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
      </div>

      {isMac && (
        <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
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
              onChange={(e) => setConfirmBeforeQuit(e.target.checked)}
              className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden shrink-0"
            />
          </label>
        </div>
      )}

      {isLinux && (
        <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
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
        </div>
      )}

      {restartRequired && (
        <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-100 dark:bg-surface-700/50">
            <p className="text-sm text-surface-700 dark:text-surface-300">
              {restartRequiredMessage}
            </p>
            <button
              type="button"
              onClick={handleRestart}
              className="px-3 py-1.5 text-sm font-medium bg-primary-500 hover:bg-primary-600 text-primary-contrast rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset shrink-0"
            >
              Restart now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
