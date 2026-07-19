import AlertTriangle from 'lucide-react/icons/alert-triangle';
import ArrowLeft from 'lucide-react/icons/arrow-left';
import ArrowRight from 'lucide-react/icons/arrow-right';
import Bell from 'lucide-react/icons/bell';
import BellOff from 'lucide-react/icons/bell-off';
import Check from 'lucide-react/icons/check';
import Clock from 'lucide-react/icons/clock';
import Cloud from 'lucide-react/icons/cloud';
import EyeOff from 'lucide-react/icons/eye-off';
import HardDrive from 'lucide-react/icons/hard-drive';
import Hash from 'lucide-react/icons/hash';
import Loader2 from 'lucide-react/icons/loader-2';
import LogIn from 'lucide-react/icons/log-in';
import PanelTop from 'lucide-react/icons/panel-top';
import Rocket from 'lucide-react/icons/rocket';
import Sparkles from 'lucide-react/icons/sparkles';
import { useEffect, useRef, useState } from 'react';
import AppIcon from '$components/Icon';
import { MacNotificationCard } from '$components/MacNotificationCard';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { ActionCard } from '$components/modals/OnboardingModal/ActionCard';
import { OnboardingAppearanceSettings } from '$components/modals/OnboardingModal/AppearanceSettings';
import { RegionTimeSettings } from '$components/modals/OnboardingModal/RegionTimeSettings';
import { ToggleRow } from '$components/modals/OnboardingModal/ToggleRow';
import { TrayHostWarning } from '$components/TrayHostWarning';
import { useNotificationContext } from '$context/notificationContext';
import { useSettingsStore } from '$context/settingsContext';
import { useAutostart } from '$hooks/system/useAutostart';
import { useTrayHostAvailability } from '$hooks/system/useTrayHostAvailability';
import { isMacPlatform } from '$utils/platform';

interface OnboardingModalProps {
  hasCalDAVAccount: boolean;
  onAddAccount: () => void;
}

type TaskHome = 'local' | 'caldav';

const STEP_COUNT = 7;
const STEP_IDS = [
  'welcome',
  'home',
  'theme',
  'region-time',
  'notifications',
  'startup-window',
  'ready',
] as const;

export const OnboardingModal = ({ hasCalDAVAccount, onAddAccount }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [taskHome, setTaskHome] = useState<TaskHome>('caldav');
  const [caldavConnectionRequested, setCaldavConnectionRequested] = useState(false);
  const appliedMacNotificationDefaultsRef = useRef(false);
  const {
    setOnboardingCompleted,
    notifications,
    setNotifications,
    notifyReminders,
    setNotifyReminders,
    notifyOverdue,
    setNotifyOverdue,
    setShowAppIconBadge,
    showAppIconBadge,
    enableSystemTray,
    setEnableSystemTray,
    showWindowOnNormalLaunch,
    setShowWindowOnNormalLaunch,
    showWindowOnLoginLaunch,
    setShowWindowOnLoginLaunch,
  } = useSettingsStore();
  const { permissionStatus, isCheckingPermission, requestPermission } = useNotificationContext();
  const autostart = useAutostart();
  const { isAvailable: isTrayHostAvailable } = useTrayHostAvailability();
  const startHiddenOptionsDisabled = !enableSystemTray || isTrayHostAvailable === false;

  const isMac = isMacPlatform();
  const macPermissionPending =
    isMac &&
    permissionStatus !== null &&
    permissionStatus !== 'granted' &&
    permissionStatus !== 'provisional';
  const isLastStep = currentStep === STEP_COUNT - 1;

  useEffect(() => {
    if (!isMac || currentStep !== 4 || appliedMacNotificationDefaultsRef.current) return;

    appliedMacNotificationDefaultsRef.current = true;
    setNotifications(false);
    setNotifyReminders(false);
    setNotifyOverdue(false);
  }, [currentStep, isMac, setNotifications, setNotifyOverdue, setNotifyReminders]);

  useEffect(() => {
    if (
      !caldavConnectionRequested ||
      !hasCalDAVAccount ||
      currentStep !== 1 ||
      taskHome !== 'caldav'
    ) {
      return;
    }

    setCaldavConnectionRequested(false);
    setCurrentStep(2);
  }, [caldavConnectionRequested, currentStep, hasCalDAVAccount, taskHome]);

  const completeOnboarding = () => {
    setOnboardingCompleted(true);
  };

  const finishOnboarding = () => {
    completeOnboarding();
  };

  const connectCalDAVNow = () => {
    setCaldavConnectionRequested(true);
    onAddAccount();
  };

  const handleNext = () => {
    if (isLastStep) {
      finishOnboarding();
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, STEP_COUNT - 1));
  };

  const handleBack = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const handleNotificationsChange = (enabled: boolean) => {
    setNotifications(enabled);
    if (!enabled) {
      setNotifyReminders(false);
      setNotifyOverdue(false);
    }
  };

  const needsCalDAVConnection = currentStep === 1 && taskHome === 'caldav' && !hasCalDAVAccount;
  const hasConnectedCalDAVHome = taskHome === 'caldav' && hasCalDAVAccount;
  const primaryLabel = needsCalDAVConnection
    ? 'Connect account'
    : isLastStep
      ? 'Start Chiri'
      : 'Continue';

  const footerButtonClassName = 'h-9';
  const footerLeft = (
    <ModalButton
      variant="secondary"
      onClick={handleBack}
      disabled={currentStep === 0}
      className={`${footerButtonClassName} ${currentStep === 0 ? 'pointer-events-none invisible' : ''}`}
      aria-hidden={currentStep === 0}
      tabIndex={currentStep === 0 ? -1 : undefined}
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </ModalButton>
  );

  return (
    <ModalWrapper
      onClose={() => {}}
      preventClose
      zIndex="z-60"
      className="max-w-2xl"
      backdropClassName="bg-black/35 backdrop-blur-md"
      dialogAnimationDelayMs={0}
      footerLeft={footerLeft}
      footer={
        <ModalButton
          onClick={needsCalDAVConnection ? connectCalDAVNow : handleNext}
          className={footerButtonClassName}
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" />
        </ModalButton>
      }
    >
      <div className="mx-auto flex min-h-90 w-full max-w-2xl flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {STEP_IDS.map((stepId, index) => (
              <div
                key={stepId}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-primary-500'
                    : index < currentStep
                      ? 'w-2 bg-primary-400'
                      : 'w-2 bg-surface-300 dark:bg-surface-600'
                }`}
              />
            ))}
          </div>
          <div className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5 font-medium text-surface-600 text-xs dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400">
            Step {currentStep + 1} of {STEP_COUNT}
          </div>
        </div>

        {currentStep === 0 && (
          <div className="flex flex-1 flex-col justify-between gap-6">
            <div className="flex flex-col gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary-500 text-primary-contrast shadow-sm">
                <AppIcon className="h-8 w-8" />
              </div>
              <div>
                <h2 className="font-semibold text-3xl text-surface-950 dark:text-surface-50">
                  Welcome to Chiri
                </h2>
                <p className="mt-3 max-w-xl text-sm text-surface-600 leading-6 dark:text-surface-400">
                  A cross-platform CalDAV task management app for desktop
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
                <HardDrive className="mb-3 h-5 w-5 text-primary-500" />
                <div className="font-medium text-sm text-surface-900 dark:text-surface-100">
                  Local first
                </div>
              </div>
              <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
                <Cloud className="mb-3 h-5 w-5 text-primary-500" />
                <div className="font-medium text-sm text-surface-900 dark:text-surface-100">
                  Sync ready
                </div>
              </div>
              <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
                <Sparkles className="mb-3 h-5 w-5 text-primary-500" />
                <div className="font-medium text-sm text-surface-900 dark:text-surface-100">
                  No fuss
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="flex flex-1 flex-col justify-between gap-5">
            <div>
              <h2 className="font-semibold text-2xl text-surface-950 dark:text-surface-50">
                Choose where tasks live
              </h2>
              <p className="mt-2 text-sm text-surface-600 leading-6 dark:text-surface-400">
                Connect your CalDAV account now, or keep tasks local and add sync later.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ActionCard
                icon={<Cloud className="h-6 w-6" />}
                title="CalDAV sync"
                description="Sync tasks with Nextcloud, Fastmail, Radicale, Baikal, RustiCal, or another CalDAV server."
                selected={taskHome === 'caldav'}
                onClick={() => setTaskHome('caldav')}
              />
              <ActionCard
                icon={<HardDrive className="h-6 w-6" />}
                title="Local-only"
                description="Keep tasks on this device and add sync later from settings."
                selected={taskHome === 'local'}
                onClick={() => setTaskHome('local')}
              />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="flex flex-1 flex-col justify-between gap-5">
            <div>
              <h2 className="font-semibold text-2xl text-surface-950 dark:text-surface-50">
                Set the vibe
              </h2>
              <p className="mt-2 text-sm text-surface-600 leading-6 dark:text-surface-400">
                Pick the default theme and colors before Chiri opens.
              </p>
            </div>

            <OnboardingAppearanceSettings />
          </div>
        )}

        {currentStep === 3 && (
          <div className="flex flex-1 flex-col justify-between gap-5">
            <div>
              <h2 className="font-semibold text-2xl text-surface-950 dark:text-surface-50">
                Set your defaults
              </h2>
              <p className="mt-2 text-sm text-surface-600 leading-6 dark:text-surface-400">
                Review the date and time defaults Chiri picked up from your system.
              </p>
            </div>

            <RegionTimeSettings />
          </div>
        )}

        {currentStep === 4 && (
          <div className="flex flex-1 flex-col justify-between gap-5">
            <div>
              <h2 className="font-semibold text-2xl text-surface-950 dark:text-surface-50">
                Notifications
              </h2>
              <p className="mt-2 text-sm text-surface-600 leading-6 dark:text-surface-400">
                Choose how Chiri nudges you about due tasks.
              </p>
            </div>

            {isMac && permissionStatus !== null && (
              <MacNotificationCard
                permissionStatus={permissionStatus}
                isCheckingPermission={isCheckingPermission}
                requestPermission={requestPermission}
                density="compact"
              />
            )}

            <section className="space-y-2 rounded-lg border border-surface-200 p-3 dark:border-surface-700">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary-500" />
                <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-100">
                  Alerts
                </h3>
              </div>
              <ToggleRow
                icon={<Bell className="h-4 w-4" />}
                label="Desktop notifications"
                description="Allow Chiri to send system notifications."
                checked={notifications}
                disabled={macPermissionPending}
                onChange={handleNotificationsChange}
              />
              {notifications && (
                <div className="space-y-2 border-surface-200 border-l-2 pl-4 dark:border-surface-600">
                  <ToggleRow
                    icon={<BellOff className="h-4 w-4" />}
                    label="Reminder alerts"
                    description="Use reminder times saved on tasks."
                    checked={notifyReminders}
                    disabled={macPermissionPending}
                    onChange={setNotifyReminders}
                  />
                  <ToggleRow
                    icon={<Clock className="h-4 w-4" />}
                    label="Overdue tasks"
                    description="Notify when a task's due date has passed."
                    checked={notifyOverdue}
                    disabled={macPermissionPending}
                    onChange={setNotifyOverdue}
                  />
                </div>
              )}
            </section>

            <section className="space-y-2 rounded-lg border border-surface-200 p-3 dark:border-surface-700">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary-500" />
                <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-100">
                  Badge
                </h3>
              </div>
              <ToggleRow
                icon={<Hash className="h-4 w-4" />}
                label="App icon badge count"
                description="Show the number of overdue tasks on the app icon."
                checked={showAppIconBadge}
                onChange={setShowAppIconBadge}
              />
            </section>
          </div>
        )}

        {currentStep === 5 && (
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
                  autostart.enabled === null || autostart.pending ? (
                    <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                  ) : (
                    <Rocket className="h-4 w-4" />
                  )
                }
                label="Launch at login"
                description="Start Chiri automatically when you sign in."
                checked={autostart.enabled ?? false}
                disabled={autostart.enabled === null || autostart.pending}
                onChange={(checked) => autostart.setEnabled(checked)}
              />
              <div className="border-surface-200 border-l-2 pl-4 dark:border-surface-600">
                <ToggleRow
                  icon={<LogIn className="h-4 w-4" />}
                  label="Start quietly in tray at login"
                  description="Hide the main window when Chiri starts automatically. Requires system tray."
                  checked={!showWindowOnLoginLaunch}
                  disabled={autostart.enabled !== true || startHiddenOptionsDisabled}
                  onChange={(checked) => setShowWindowOnLoginLaunch(!checked)}
                />
              </div>
              <ToggleRow
                icon={<EyeOff className="h-4 w-4" />}
                label="Start hidden on normal launch"
                description="Hide the main window when Chiri starts manually. Requires system tray."
                checked={!showWindowOnNormalLaunch}
                disabled={startHiddenOptionsDisabled}
                onChange={(checked) => setShowWindowOnNormalLaunch(!checked)}
              />
              <ToggleRow
                icon={<PanelTop className="h-4 w-4" />}
                label="Enable system tray"
                description="Let Chiri stay open in the background when you close the window."
                checked={enableSystemTray}
                onChange={setEnableSystemTray}
              />
            </section>

            {autostart.error && (
              <div className="flex gap-2 rounded-lg border border-semantic-error/30 bg-semantic-error/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-semantic-error" />
                <p className="text-semantic-error text-xs">{autostart.error}</p>
              </div>
            )}

            <TrayHostWarning />
          </div>
        )}

        {currentStep === 6 && (
          <div className="flex flex-1 flex-col justify-between gap-6">
            <div className="flex flex-col gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary-500 text-primary-contrast">
                <Check className="h-8 w-8" />
              </div>
              <div>
                <h2 className="font-semibold text-2xl text-surface-950 dark:text-surface-50">
                  Ready when you are
                </h2>
                <p className="mt-2 text-sm text-surface-600 leading-6 dark:text-surface-400">
                  {hasConnectedCalDAVHome
                    ? 'Finish setup and Chiri will open with your synced task lists.'
                    : 'Finish setup and Chiri will open straight into your local task list.'}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
              <div className="flex items-center gap-3">
                {hasConnectedCalDAVHome ? (
                  <Cloud className="h-5 w-5 text-primary-500" />
                ) : (
                  <HardDrive className="h-5 w-5 text-primary-500" />
                )}
                <div>
                  <div className="font-semibold text-sm text-surface-900 dark:text-surface-100">
                    {hasConnectedCalDAVHome ? 'CalDAV sync' : 'Local-only'}
                  </div>
                  <div className="mt-1 text-surface-500 text-xs dark:text-surface-400">
                    {hasConnectedCalDAVHome
                      ? 'Your account is connected and ready to sync.'
                      : 'No account needed. Sync can be added later.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
};
