import ArrowLeft from 'lucide-react/icons/arrow-left';
import Check from 'lucide-react/icons/check';
import Cloud from 'lucide-react/icons/cloud';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import AppIcon from '$components/AppIcon';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { OnboardingModalFooter } from '$components/modals/OnboardingModal/OnboardingModalFooter';
import { OnboardingStepHeader } from '$components/modals/OnboardingModal/OnboardingStepHeader';
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
import { toastManager } from '$lib/toast-manager';
import { isMacPlatform } from '$utils/platform';

interface OnboardingModalProps {
  hasCalDAVAccount: boolean;
  calDAVAccountCount: number;
  isRerun: boolean;
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
const FINISH_ANIMATION_MS = 200;

const renderOnboardingStepHeader = (
  currentStep: number,
  hasConnectedCalDAVHome: boolean,
  calDAVAccountCount: number,
) => {
  switch (currentStep) {
    case 0:
      return (
        <OnboardingStepHeader
          icon={<AppIcon className="h-8 w-8" />}
          title="Welcome to Chiri"
          description="A cross-platform CalDAV task management app for desktop"
          titleClassName="font-semibold text-3xl text-surface-950 dark:text-surface-50"
          descriptionClassName="mt-3 max-w-xl text-sm text-surface-600 leading-6 dark:text-surface-400"
          iconWrapperClassName="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-primary-500 text-primary-contrast shadow-sm"
        />
      );
    case 1:
      return (
        <OnboardingStepHeader
          icon={hasConnectedCalDAVHome ? <Cloud className="h-8 w-8" /> : undefined}
          title={hasConnectedCalDAVHome ? 'Connected' : 'Choose where tasks live'}
          description={
            hasConnectedCalDAVHome
              ? `Your CalDAV ${calDAVAccountCount === 1 ? 'account has' : 'accounts have'} been added. You can add more accounts, or continue with onboarding.`
              : 'Connect your CalDAV account now, or keep tasks local and add sync later.'
          }
        />
      );
    case 2:
      return (
        <OnboardingStepHeader
          title="Set the vibe"
          description="Pick the default theme and colors before Chiri opens."
        />
      );
    case 3:
      return (
        <OnboardingStepHeader
          title="Set your defaults"
          description="Review the date and time defaults Chiri picked up from your system."
        />
      );
    case 4:
      return (
        <OnboardingStepHeader
          title="Notifications"
          description="Choose how Chiri nudges you about due tasks."
        />
      );
    case 5:
      return (
        <OnboardingStepHeader
          title="Startup & window"
          description="Choose how Chiri starts up and behaves in the background."
        />
      );
    case 6:
      return (
        <OnboardingStepHeader
          icon={<Check className="h-8 w-8" />}
          title="Ready when you are"
          description={
            hasConnectedCalDAVHome
              ? 'Finish setup and Chiri will open with your synced task lists.'
              : 'Finish setup and Chiri will open straight into your local task list.'
          }
        />
      );
    default:
      return null;
  }
};

export const OnboardingModal = ({
  hasCalDAVAccount,
  calDAVAccountCount,
  isRerun,
  onAddAccount,
}: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [taskHome, setTaskHome] = useState<TaskHome>('caldav');
  const [isFinishing, setIsFinishing] = useState(false);
  const appliedMacNotificationDefaultsRef = useRef(false);
  const finishTimeoutRef = useRef<number | null>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);
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
    return () => {
      if (finishTimeoutRef.current !== null) {
        window.clearTimeout(finishTimeoutRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    const content = stepContentRef.current;
    if (currentStep >= 0 && content) {
      content.scrollTop = 0;
    }
  }, [currentStep]);

  const completeOnboarding = () => {
    setOnboardingCompleted(true);
  };

  const finishOnboarding = (onComplete = completeOnboarding) => {
    if (isFinishing) return;

    setIsFinishing(true);
    finishTimeoutRef.current = window.setTimeout(onComplete, FINISH_ANIMATION_MS);
  };

  const handleSkip = () => {
    finishOnboarding(() => {
      completeOnboarding();
      if (!isRerun) {
        toastManager.info('Setup skipped', 'You can revisit these options in Settings.', {
          groupKey: 'onboarding-skipped',
        });
      }
    });
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
      className={`max-w-2xl transition-[opacity,transform] duration-200 ease-out ${isFinishing ? 'pointer-events-none scale-[0.98] opacity-0' : ''}`}
      contentPadding={false}
      contentOverflow="hidden"
      backdropClassName={`bg-surface-50 transition-opacity duration-200 ease-out dark:bg-surface-900 ${isFinishing ? 'opacity-0' : 'opacity-100'}`}
      animateBackdrop={false}
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
          onSkip={handleSkip}
        />
      }
    >
      <div className="mx-auto flex h-120 w-full max-w-2xl flex-col gap-5 px-4 pt-4">
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

        {renderOnboardingStepHeader(currentStep, hasConnectedCalDAVHome, calDAVAccountCount)}

        <div
          key={currentStep}
          ref={stepContentRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="flex min-h-full flex-col justify-end pb-4">
            {currentStep === 0 && <WelcomeStep />}

            {currentStep === 1 && (
              <SyncSetupStep
                taskHome={taskHome}
                hasConnectedCalDAVHome={hasConnectedCalDAVHome}
                calDAVAccountCount={calDAVAccountCount}
                onTaskHomeChange={setTaskHome}
              />
            )}

            {currentStep === 2 && <ThemeStep />}

            {currentStep === 3 && <RegionTimeStep />}

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
                enableSystemTray={enableSystemTray}
                onEnableSystemTrayChange={setEnableSystemTray}
              />
            )}

            {currentStep === 6 && <ReadyStep />}
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
};
