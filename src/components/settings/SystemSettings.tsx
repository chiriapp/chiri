import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { relaunch } from '@tauri-apps/plugin-process';
import AlertTriangle from 'lucide-react/icons/alert-triangle';
import Loader2 from 'lucide-react/icons/loader-2';
import { useEffect, useState } from 'react';
import { TrayHostWarning } from '$components/TrayHostWarning';
import { useSettingsStore } from '$context/settingsContext';
import { useAutostart } from '$hooks/system/useAutostart';
import { useTrayHostAvailability } from '$hooks/system/useTrayHostAvailability';
import {
  installAppImageDesktopIntegration,
  isAppImageDesktopFileInstalled,
  isAppImageInstall,
  isLinuxPlatform,
  isMacPlatform,
  removeAppImageDesktopIntegration,
} from '$utils/platform';
import { Select } from '../Select';

const formatRestartReasons = (reasons: string[]) => {
  if (reasons.length <= 1) return reasons[0] ?? 'changes';
  if (reasons.length === 2) return `${reasons[0]} and ${reasons[1]}`;

  return `${reasons.slice(0, -1).join(', ')}, and ${reasons[reasons.length - 1]}`;
};

export const SystemSettings = () => {
  const autostart = useAutostart();
  const isLinux = isLinuxPlatform();
  const isMac = isMacPlatform();
  const [isAppImage, setIsAppImage] = useState<boolean | null>(null);
  const [isDesktopFileInstalled, setIsDesktopFileInstalled] = useState<boolean | null>(null);
  const [isTogglingIntegration, setIsTogglingIntegration] = useState(false);
  const {
    enableSystemTray,
    setEnableSystemTray,
    enableSystemTrayExplicitlySet,
    setEnableSystemTrayExplicitlySet,
    showWindowOnNormalLaunch,
    setShowWindowOnNormalLaunch,
    showWindowOnLoginLaunch,
    setShowWindowOnLoginLaunch,
    restoreWindowState,
    setRestoreWindowState,
    hideDockIconWhenWindowClosed,
    setHideDockIconWhenWindowClosed,
    confirmBeforeQuit,
    setConfirmBeforeQuit,
    windowDecorationStyle,
    setWindowDecorationStyle,
    confirmBeforeQuitAppliedValue,
    setConfirmBeforeQuitAppliedValue,
  } = useSettingsStore();

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
  const { isAvailable: isTrayHostAvailable } = useTrayHostAvailability();
  const startHiddenOptionsDisabled = !enableSystemTray || isTrayHostAvailable === false;
  const startQuietlyAtLoginDisabled = autostart.enabled !== true || startHiddenOptionsDisabled;
  const startHiddenOnNormalLaunchDisabled = startHiddenOptionsDisabled;

  useEffect(() => {
    if (!isLinux) {
      setIsAppImage(false);
      return;
    }
    isAppImageInstall().then(setIsAppImage);
  }, [isLinux]);

  useEffect(() => {
    if (isAppImage !== true) {
      setIsDesktopFileInstalled(null);
      return;
    }
    isAppImageDesktopFileInstalled().then(setIsDesktopFileInstalled);
  }, [isAppImage]);

  const handleToggleDesktopIntegration = async () => {
    setIsTogglingIntegration(true);
    try {
      if (isDesktopFileInstalled) {
        const success = await removeAppImageDesktopIntegration();
        if (success) setIsDesktopFileInstalled(false);
      } else {
        const success = await installAppImageDesktopIntegration();
        if (success) setIsDesktopFileInstalled(true);
      }
    } finally {
      setIsTogglingIntegration(false);
    }
  };

  const handleSystemTrayChange = (checked: boolean) => {
    setEnableSystemTray(checked);
    if (!enableSystemTrayExplicitlySet) {
      setEnableSystemTrayExplicitlySet(true);
    }
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
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">
        Startup & window
      </h3>
      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label
          className={`flex items-center justify-between p-4 ${launchAtLoginBusy ? 'cursor-wait' : ''}`}
        >
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Launch at login</p>
            <p className="flex items-center gap-1.5 text-surface-500 text-xs dark:text-surface-400">
              {launchAtLoginBusy && (
                <Loader2
                  className={`size-3 shrink-0 motion-safe:animate-spin ${launchAtLoginSpinnerClass}`}
                />
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
        <label
          className={`flex items-center justify-between gap-4 ${startHiddenOnNormalLaunchDisabled ? 'cursor-not-allowed opacity-50' : ''} p-4`}
        >
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Start hidden on normal launch
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Hide the main window when Chiri starts manually. Requires system tray.
            </p>
          </div>
          <input
            type="checkbox"
            checked={!showWindowOnNormalLaunch}
            disabled={startHiddenOnNormalLaunchDisabled}
            onChange={(e) => setShowWindowOnNormalLaunch(!e.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Restore window size and position
            </p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Reopen Chiri where you left it
            </p>
          </div>
          <input
            type="checkbox"
            checked={restoreWindowState}
            onChange={(e) => setRestoreWindowState(e.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Enable system tray</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Lets Chiri run in the background with a tray icon
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

        <TrayHostWarning />
      </div>

      {isMac && (
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <label
            htmlFor="window-decoration-style"
            className="flex items-center justify-between gap-4 p-4"
          >
            <div>
              <p className="text-sm text-surface-700 dark:text-surface-300">Window decorations</p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Choose between integrated or standard decorations
              </p>
            </div>
            <Select
              id="window-decoration-style"
              value={windowDecorationStyle}
              onChange={(event) =>
                setWindowDecorationStyle(event.target.value as 'integrated' | 'native')
              }
              className="shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
            >
              <option value="integrated">Integrated</option>
              <option value="native">Standard</option>
            </Select>
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
      {isAppImage === true && (
        <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <label
            className={`flex items-center justify-between gap-4 p-4 ${isDesktopFileInstalled === null || isTogglingIntegration ? 'cursor-wait' : ''}`}
          >
            <div className="min-w-0">
              <p className="text-sm text-surface-700 dark:text-surface-300">Desktop integration</p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Show Chiri in the app menu
              </p>
            </div>
            <input
              type="checkbox"
              checked={isDesktopFileInstalled === true}
              disabled={isDesktopFileInstalled === null || isTogglingIntegration}
              onChange={() => void handleToggleDesktopIntegration()}
              className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
        </div>
      )}
    </div>
  );
};
