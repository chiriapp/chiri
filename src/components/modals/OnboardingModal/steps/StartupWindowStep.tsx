import AlertTriangle from 'lucide-react/icons/alert-triangle';
import EyeOff from 'lucide-react/icons/eye-off';
import Loader2 from 'lucide-react/icons/loader-2';
import LogIn from 'lucide-react/icons/log-in';
import PanelTop from 'lucide-react/icons/panel-top';
import Rocket from 'lucide-react/icons/rocket';
import { ToggleRow } from '$components/modals/OnboardingModal/ToggleRow';
import { TrayHostWarning } from '$components/TrayHostWarning';

interface StartupWindowStepProps {
  autostartEnabled: boolean | null;
  autostartPending: boolean;
  autostartError: string | null;
  onAutostartChange: (enabled: boolean) => void;
  startHiddenOptionsDisabled: boolean;
  showWindowOnLoginLaunch: boolean;
  onShowWindowOnLoginLaunchChange: (enabled: boolean) => void;
  showWindowOnNormalLaunch: boolean;
  onShowWindowOnNormalLaunchChange: (enabled: boolean) => void;
  enableSystemTray: boolean;
  onEnableSystemTrayChange: (enabled: boolean) => void;
}

export const StartupWindowStep = ({
  autostartEnabled,
  autostartPending,
  autostartError,
  onAutostartChange,
  startHiddenOptionsDisabled,
  showWindowOnLoginLaunch,
  onShowWindowOnLoginLaunchChange,
  showWindowOnNormalLaunch,
  onShowWindowOnNormalLaunchChange,
  enableSystemTray,
  onEnableSystemTrayChange,
}: StartupWindowStepProps) => (
  <div className="flex flex-1 flex-col justify-between gap-5">
    <div>
      <h2 className="font-semibold text-2xl text-surface-950 dark:text-surface-50">
        Startup & window
      </h2>
      <p className="mt-2 text-sm text-surface-600 leading-6 dark:text-surface-400">
        Choose how Chiri starts up and behaves in the background.
      </p>
    </div>

    <section className="space-y-2 rounded-lg border border-surface-200 p-3 dark:border-surface-700">
      <ToggleRow
        icon={
          autostartEnabled === null || autostartPending ? (
            <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
          ) : (
            <Rocket className="h-4 w-4" />
          )
        }
        label="Launch at login"
        description="Start Chiri automatically when you sign in."
        checked={autostartEnabled ?? false}
        disabled={autostartEnabled === null || autostartPending}
        onChange={onAutostartChange}
      />
      <div className="border-surface-200 border-l-2 pl-4 dark:border-surface-600">
        <ToggleRow
          icon={<LogIn className="h-4 w-4" />}
          label="Start quietly in tray at login"
          description="Hide the main window when Chiri starts automatically. Requires system tray."
          checked={!showWindowOnLoginLaunch}
          disabled={autostartEnabled !== true || startHiddenOptionsDisabled}
          onChange={onShowWindowOnLoginLaunchChange}
        />
      </div>
      <ToggleRow
        icon={<EyeOff className="h-4 w-4" />}
        label="Start hidden on normal launch"
        description="Hide the main window when Chiri starts manually. Requires system tray."
        checked={!showWindowOnNormalLaunch}
        disabled={startHiddenOptionsDisabled}
        onChange={onShowWindowOnNormalLaunchChange}
      />
      <ToggleRow
        icon={<PanelTop className="h-4 w-4" />}
        label="Enable system tray"
        description="Let Chiri stay open in the background when you close the window."
        checked={enableSystemTray}
        onChange={onEnableSystemTrayChange}
      />
    </section>

    {autostartError && (
      <div className="flex gap-2 rounded-lg border border-semantic-error/30 bg-semantic-error/10 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semantic-error" />
        <p className="text-semantic-error text-xs">{autostartError}</p>
      </div>
    )}

    <TrayHostWarning />
  </div>
);
