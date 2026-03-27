import AlertTriangle from 'lucide-react/icons/alert-triangle';
import ArrowRight from 'lucide-react/icons/arrow-right';
import Bell from 'lucide-react/icons/bell';
import ChevronDown from 'lucide-react/icons/chevron-down';
import Monitor from 'lucide-react/icons/monitor';
import Palette from 'lucide-react/icons/palette';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import SkipForward from 'lucide-react/icons/skip-forward';
import User from 'lucide-react/icons/user';
import { useEffect, useRef, useState } from 'react';
import { AppSelect } from '$components/AppSelect';
import { MacNotificationPermissionCard } from '$components/MacNotificationPermissionCard';
import { ModalWrapper } from '$components/ModalWrapper';
import { ONBOARDING_STEPS } from '$data/onboarding';
import { SYNC_INTERVAL_OPTIONS } from '$data/settings';
import { THEME_OPTIONS } from '$data/theme';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useNotificationContext } from '$hooks/useNotificationContext';
import { usePlatform } from '$hooks/usePlatform';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { ACCENT_COLORS } from '$utils/constants';
import { isMacPlatform } from '$utils/platform';

interface OnboardingModalProps {
  onComplete: () => void;
  onAddAccount: () => void;
}

export const OnboardingModal = ({ onComplete, onAddAccount }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sync: false,
    appearance: false,
    system: false,
    notifications: false,
  });
  const initialAccountCountRef = useRef<number | null>(null);
  const {
    setOnboardingCompleted,
    autoSync,
    setAutoSync,
    syncInterval,
    setSyncInterval,
    syncOnStartup,
    setSyncOnStartup,
    checkForUpdatesAutomatically,
    setCheckForUpdatesAutomatically,
    accentColor,
    setAccentColor,
    theme,
    setTheme,
    enableSystemTray,
    setEnableSystemTray,
    notifications,
    setNotifications,
    notifyReminders,
    setNotifyReminders,
  } = useSettingsStore();
  const { data: accounts = [] } = useAccounts();
  const { isGNOME } = usePlatform();
  const isMac = isMacPlatform();
  const { permissionStatus, isCheckingPermission, requestPermission } = useNotificationContext();

  const macPermissionPending =
    isMac &&
    permissionStatus !== null &&
    permissionStatus !== 'granted' &&
    permissionStatus !== 'provisional';

  // Default tray to false on GNOME
  useEffect(() => {
    if (isGNOME && currentStep === 2) {
      setEnableSystemTray(false);
    }
  }, [isGNOME, currentStep, setEnableSystemTray]);

  // Track initial account count and advance step when an account is added
  if (currentStep === 1) {
    if (initialAccountCountRef.current === null) {
      initialAccountCountRef.current = accounts.length;
    } else if (accounts.length > initialAccountCountRef.current) {
      initialAccountCountRef.current = null;
      setCurrentStep(currentStep + 1);
    }
  } else {
    initialAccountCountRef.current = null;
  }

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const isAccountStep = currentStep === 1;
  const isSettingsStep = currentStep === 2;

  const handleNext = () => {
    if (isLastStep) {
      setOnboardingCompleted(true);
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleAddAccount = () => {
    onAddAccount();
  };

  const handleSkip = () => {
    setOnboardingCompleted(true);
    onComplete();
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const isCurrentlyExpanded = prev[section];
      // Close all sections, then open the clicked one (unless it was already open)
      return {
        sync: false,
        appearance: false,
        system: false,
        notifications: false,
        [section]: !isCurrentlyExpanded,
      };
    });
  };

  const footer = (
    <div className="w-full max-w-md mx-auto flex flex-col gap-3">
      {isAccountStep ? (
        <>
          <button
            type="button"
            onClick={handleAddAccount}
            className="w-full px-4 py-3 bg-primary-500 hover:bg-primary-600 text-primary-contrast font-medium rounded-lg transition-colors flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset"
          >
            <User className="w-5 h-5" />
            Add CalDAV Account
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="w-full px-4 py-3 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <ArrowRight className="w-5 h-5" />
            I'll do this later
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleNext}
          className="w-full px-4 py-3 bg-primary-500 hover:bg-primary-600 text-primary-contrast font-medium rounded-lg transition-colors flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset"
        >
          {isLastStep ? (
            <>
              <ArrowRight className="w-5 h-5" />
              Get Started
            </>
          ) : (
            <>
              <ArrowRight className="w-5 h-5" />
              Continue
            </>
          )}
        </button>
      )}

      {isFirstStep && (
        <button
          type="button"
          onClick={handleSkip}
          className="w-full px-4 py-3 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
        >
          <SkipForward className="w-5 h-5" />
          Skip onboarding
        </button>
      )}
    </div>
  );

  return (
    <ModalWrapper onClose={() => {}} preventClose footer={footer}>
      <div className="w-full max-w-md mx-auto">
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center justify-center gap-2">
            {ONBOARDING_STEPS.map((step, index) => (
              <div
                key={step.title}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-primary-500'
                    : index < currentStep
                      ? 'bg-primary-300 dark:bg-primary-700'
                      : 'bg-surface-300 dark:bg-surface-600'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="text-center">
          {step.illustration}

          <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-3">
            {step.title}
          </h2>

          <div className="text-surface-600 dark:text-surface-400 mb-6 leading-relaxed">
            {step.description}
          </div>
        </div>

        {isSettingsStep && (
          <div className="space-y-3">
            <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
              <button
                type="button"
                onClick={() => toggleSection('sync')}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-surface-600 dark:text-surface-400" />
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    Sync Settings
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-surface-600 dark:text-surface-400 transition-transform ${
                    expandedSections.sync ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSections.sync && (
                <div className="px-4 pb-4 space-y-2">
                  <label className="flex items-center justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-800 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                    <span className="text-sm text-surface-900 dark:text-surface-100">
                      Automatic syncing
                    </span>
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      className="w-5 h-5 rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                    />
                  </label>

                  <div className="p-2 rounded-lg bg-surface-50 dark:bg-surface-800">
                    <div className="text-sm text-surface-900 dark:text-surface-100 mb-2">
                      Sync interval
                    </div>
                    <AppSelect
                      value={syncInterval}
                      onChange={(e) => setSyncInterval(Number(e.target.value))}
                      disabled={!autoSync}
                      className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {SYNC_INTERVAL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </AppSelect>
                  </div>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-800 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                    <span className="text-sm text-surface-900 dark:text-surface-100">
                      Sync on startup
                    </span>
                    <input
                      type="checkbox"
                      checked={syncOnStartup}
                      onChange={(e) => setSyncOnStartup(e.target.checked)}
                      className="w-5 h-5 rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
              <button
                type="button"
                onClick={() => toggleSection('appearance')}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-surface-600 dark:text-surface-400" />
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    Appearance
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-surface-600 dark:text-surface-400 transition-transform ${
                    expandedSections.appearance ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedSections.appearance && (
                <div className="px-3 pb-3">
                  <div className="p-2 rounded-lg bg-surface-50 dark:bg-surface-800">
                    <div className="text-sm text-surface-900 dark:text-surface-100 mb-3">
                      Accent color
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {ACCENT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setAccentColor(color.value)}
                          className={`w-8 h-8 rounded-full border-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 ${
                            accentColor === color.value
                              ? 'border-surface-800 dark:border-white scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                          aria-label={`Select ${color.name} accent color`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-surface-50 dark:bg-surface-800">
                    <div className="text-sm text-surface-900 dark:text-surface-100 mb-3">Theme</div>
                    <div className="flex gap-2">
                      {THEME_OPTIONS.map((option) => (
                        <button
                          type="button"
                          key={option.value}
                          onClick={() => setTheme(option.value)}
                          className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-lg border text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                            theme === option.value
                              ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                              : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400'
                          }`}
                        >
                          {option.icon}
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
              <button
                type="button"
                onClick={() => toggleSection('system')}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-surface-600 dark:text-surface-400" />
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    System
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-surface-600 dark:text-surface-400 transition-transform ${
                    expandedSections.system ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSections.system && (
                <div className="px-4 pb-4 space-y-2">
                  <div>
                    <label className="flex items-center justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-800 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                      <span className="text-sm text-surface-900 dark:text-surface-100">
                        Enable system tray icon
                      </span>
                      <input
                        type="checkbox"
                        checked={enableSystemTray}
                        onChange={(e) => setEnableSystemTray(e.target.checked)}
                        className="w-5 h-5 rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                      />
                    </label>

                    {isGNOME && enableSystemTray && (
                      <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <div className="flex gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-800 dark:text-amber-200">
                            <strong>GNOME Desktop:</strong> Requires{' '}
                            <a
                              href="https://extensions.gnome.org/extension/615/appindicator-support/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-amber-900 dark:hover:text-amber-100"
                            >
                              AppIndicator extension
                            </a>
                            .
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-800 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                    <span className="text-sm text-surface-900 dark:text-surface-100">
                      Check for updates automatically
                    </span>
                    <input
                      type="checkbox"
                      checked={checkForUpdatesAutomatically}
                      onChange={(e) => setCheckForUpdatesAutomatically(e.target.checked)}
                      className="w-5 h-5 rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
              <button
                type="button"
                onClick={() => toggleSection('notifications')}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-surface-600 dark:text-surface-400" />
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    Notifications
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-surface-600 dark:text-surface-400 transition-transform ${
                    expandedSections.notifications ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSections.notifications && (
                <div className="px-4 pb-4 space-y-2">
                  <label
                    className={`flex items-center justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors ${
                      macPermissionPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <div>
                      <span className="text-sm text-surface-900 dark:text-surface-100">
                        Desktop notifications
                      </span>
                      {macPermissionPending && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Notification permission is required first.
                        </p>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications}
                      onChange={(e) => setNotifications(e.target.checked)}
                      disabled={macPermissionPending}
                      className="w-5 h-5 rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-800 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                    <span className="text-sm text-surface-900 dark:text-surface-100">
                      Notify for reminders
                    </span>
                    <input
                      type="checkbox"
                      checked={notifyReminders}
                      onChange={(e) => setNotifyReminders(e.target.checked)}
                      disabled={!notifications}
                      className="w-5 h-5 rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </label>

                  {isMac && permissionStatus !== null && (
                    <MacNotificationPermissionCard
                      permissionStatus={permissionStatus}
                      isCheckingPermission={isCheckingPermission}
                      requestPermission={requestPermission}
                      density="compact"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
};
