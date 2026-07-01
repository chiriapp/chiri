import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { relaunch } from '@tauri-apps/plugin-process';
import AlertTriangle from 'lucide-react/icons/alert-triangle';
import Loader2 from 'lucide-react/icons/loader-2';
import { useSettingsStore } from '$context/settingsContext';
import { useAutostart } from '$hooks/system/useAutostart';
import { usePlatform } from '$hooks/system/usePlatform';
import { isMacPlatform } from '$utils/platform';

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
    windowDecorationStyle,
    setWindowDecorationStyle,
    confirmBeforeQuitAppliedValue,
    setConfirmBeforeQuitAppliedValue,
  } = useSettingsStore();

  const isMac = isMacPlatform();

  const confirmBeforeQuitChanged = isMac && confirmBeforeQuit !== confirmBeforeQuitAppliedValue;
  const restartReasons = [...(confirmBeforeQuitChanged ? ['quit warning'] : [])];
  const restartRequired = restartReasons.length > 0;
  const restartRequiredMessage = `Restart to apply ${formatRestartReasons(restartReasons)} changes`;
  const launchAtLoginLoading = autostart.enabled === null;
  const launchAtLoginBusy = launchAtLoginLoading || autostart.pending;
  const launchAtLoginDescription = launchAtLoginLoading
    ? 'Checking launch-at-login status...'
    : autostart.pending
      ? 'Updating launch-at-login...'
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

  const handleRestart = async () => {
    try {
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
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">System</h3>
      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label
          className={`flex items-center justify-between p-4 ${launchAtLoginBusy ? 'cursor-wait' : ''}`}
        >
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Launch at login</p>
            <p className="flex items-center gap-1.5 text-surface-500 text-xs dark:text-surface-400">
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
            className={`shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${launchAtLoginBusy ? 'checkbox-busy' : ''}`}
          />
        </label>

        <div className="px-4 pb-4">
          <div className="space-y-3 border-surface-200 border-l-2 pl-4 dark:border-surface-600">
            <label
              className={`flex items-center justify-between ${startQuietlyAtLoginDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <div>
                <p className="text-sm text-surface-700 dark:text-surface-300">
                  Start quietly in tray at login
                </p>
                <p className="text-surface-500 text-xs dark:text-surface-400">
                  Hide the main window when Chiri starts automatically. Requires system tray.
                </p>
              </div>
              <input
                type="checkbox"
                checked={!showWindowOnLoginLaunch}
                disabled={startQuietlyAtLoginDisabled}
                onChange={(e) => setShowWindowOnLoginLaunch(!e.target.checked)}
                className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
          </div>
        </div>

        {isMac && (
          <>
            <div className="border-surface-200 border-t dark:border-surface-700" />

            <div className="px-4 py-3">
              <button
                type="button"
                onClick={handleOpenLoginItemsSettings}
                className="inline-flex items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
              >
                Open macOS Settings
              </button>
            </div>
          </>
        )}

        {autostart.error && (
          <div className="px-4 pb-4">
            <div className="flex gap-2 rounded-lg border border-semantic-error/30 bg-semantic-error/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semantic-error" />
              <p className="text-semantic-error text-xs">{autostart.error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Enable system tray</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Lets Chiri run in the background with a tray icon.
            </p>
          </div>
          <input
            type="checkbox"
            checked={enableSystemTray}
            onChange={(e) => handleSystemTrayChange(e.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>

        {isMac && (
          <div className="px-4 pb-4">
            <div className="space-y-3 border-surface-200 border-l-2 pl-4 dark:border-surface-600">
              <label
                className={`flex items-center justify-between ${!enableSystemTray ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">Hide Dock icon</p>
                  <p className="text-surface-500 text-xs dark:text-surface-400">
                    Hide the Dock icon when all windows are closed
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={hideDockIconWhenWindowClosed}
                  disabled={!enableSystemTray}
                  onChange={(e) => handleHideDockIconWhenWindowClosedChange(e.target.checked)}
                  className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                />
              </label>
            </div>
          </div>
        )}

        {isGNOME && (
          <div className="px-4 pb-4">
            <div className="flex gap-2 rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semantic-warning" />
              <p className="text-semantic-warning text-xs">
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
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <label className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm text-surface-700 dark:text-surface-300">Window decorations</p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Choose between integrated or standard decorations
              </p>
            </div>
            <select
              value={windowDecorationStyle}
              onChange={(event) =>
                setWindowDecorationStyle(event.target.value as 'integrated' | 'native')
              }
              className="shrink-0 rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-sm text-surface-700 outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-200"
            >
              <option value="integrated">Integrated</option>
              <option value="native">Standard</option>
            </select>
          </label>
        </div>
      )}

      {isMac && (
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <label className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-surface-700 dark:text-surface-300">
                Show warning before quitting with ⌘Q
              </p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Hold or double press ⌘Q to quit. Requires restart.
              </p>
            </div>
            <input
              type="checkbox"
              checked={confirmBeforeQuit}
              onChange={(e) => setConfirmBeforeQuit(e.target.checked)}
              className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            />
          </label>
        </div>
      )}

      {restartRequired && (
        <div className="overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between gap-4 bg-surface-100 px-4 py-3 dark:bg-surface-700/50">
            <p className="text-sm text-surface-700 dark:text-surface-300">
              {restartRequiredMessage}
            </p>
            <button
              type="button"
              onClick={handleRestart}
              className="shrink-0 rounded-lg bg-primary-500 px-3 py-1.5 font-medium text-primary-contrast text-sm outline-hidden transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              Restart now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
