import ArrowLeft from 'lucide-react/icons/arrow-left';
import { useEffect, useRef, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { OnboardingModalFooter } from '$components/modals/OnboardingModal/OnboardingModalFooter';
import { NotificationsStep } from '$components/modals/OnboardingModal/steps/NotificationsStep';
import { ReadyStep } from '$components/modals/OnboardingModal/steps/ReadyStep';
import { RegionTimeStep } from '$components/modals/OnboardingModal/steps/RegionTimeStep';
import { StartupWindowStep } from '$components/modals/OnboardingModal/steps/StartupWindowStep';
import {
  SyncSetupStep,
  type TaskHome,
} from '$components/modals/OnboardingModal/steps/SyncSetupStep';
import { ThemeStep } from '$components/modals/OnboardingModal/steps/ThemeStep';
import { WelcomeStep } from '$components/modals/OnboardingModal/steps/WelcomeStep';
import { useNotificationContext } from '$context/notificationContext';
import { useSettingsStore } from '$context/settingsContext';
import { useAutostart } from '$hooks/system/useAutostart';
import { useTrayHostAvailability } from '$hooks/system/useTrayHostAvailability';
import { isMacPlatform } from '$utils/platform';

interface OnboardingModalProps {
  hasCalDAVAccount: boolean;
  calDAVAccountCount: number;
  onAddAccount: () => void;
}

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

export const OnboardingModal = ({
  hasCalDAVAccount,
  calDAVAccountCount,
  onAddAccount,
}: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [taskHome, setTaskHome] = useState<TaskHome>('caldav');
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

  const completeOnboarding = () => {
    setOnboardingCompleted(true);
  };

  const finishOnboarding = () => {
    completeOnboarding();
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
        <OnboardingModalFooter
          needsCalDAVConnection={needsCalDAVConnection}
          hasConnectedCalDAVHome={hasConnectedCalDAVHome}
          isHomeStep={currentStep === 1}
          primaryLabel={primaryLabel}
          footerButtonClassName={footerButtonClassName}
          onAddAccount={onAddAccount}
          onNext={handleNext}
        />
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

        {currentStep === 0 && <WelcomeStep />}

        {currentStep === 1 && (
          <SyncSetupStep
            taskHome={taskHome}
            hasConnectedCalDAVHome={hasConnectedCalDAVHome}
            calDAVAccountCount={calDAVAccountCount}
            onTaskHomeChange={setTaskHome}
          />
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

            <ThemeStep />
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

            <RegionTimeStep />
          </div>
        )}

        {currentStep === 4 && (
          <NotificationsStep
            isMac={isMac}
            permissionStatus={permissionStatus}
            isCheckingPermission={isCheckingPermission}
            requestPermission={requestPermission}
            macPermissionPending={macPermissionPending}
            notifications={notifications}
            onNotificationsChange={handleNotificationsChange}
            notifyReminders={notifyReminders}
            onNotifyRemindersChange={setNotifyReminders}
            notifyOverdue={notifyOverdue}
            onNotifyOverdueChange={setNotifyOverdue}
            showAppIconBadge={showAppIconBadge}
            onShowAppIconBadgeChange={setShowAppIconBadge}
          />
        )}

        {currentStep === 5 && (
          <StartupWindowStep
            autostartEnabled={autostart.enabled}
            autostartPending={autostart.pending}
            autostartError={autostart.error}
            onAutostartChange={(checked) => autostart.setEnabled(checked)}
            startHiddenOptionsDisabled={startHiddenOptionsDisabled}
            showWindowOnLoginLaunch={showWindowOnLoginLaunch}
            onShowWindowOnLoginLaunchChange={(checked) => setShowWindowOnLoginLaunch(!checked)}
            showWindowOnNormalLaunch={showWindowOnNormalLaunch}
            onShowWindowOnNormalLaunchChange={(checked) => setShowWindowOnNormalLaunch(!checked)}
            enableSystemTray={enableSystemTray}
            onEnableSystemTrayChange={setEnableSystemTray}
          />
        )}

        {currentStep === 6 && <ReadyStep hasConnectedCalDAVHome={hasConnectedCalDAVHome} />}
      </div>
    </ModalWrapper>
  );
};
