import ArrowLeft from 'lucide-react/icons/arrow-left';
import ArrowRight from 'lucide-react/icons/arrow-right';
import User from 'lucide-react/icons/user';
import { useEffect, useState } from 'react';
import { ModalWrapper } from '$components/ModalWrapper';
import { ONBOARDING_STEPS } from '$data/onboarding';
import { SYNC_INTERVAL_OPTIONS } from '$data/settings';
import { THEME_OPTIONS } from '$data/theme';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useSettingsStore } from '$hooks/useSettingsStore';
import { ACCENT_COLORS } from '$utils/constants';

interface OnboardingModalProps {
  onComplete: () => void;
  onAddAccount: () => void;
}

export const OnboardingModal = ({ onComplete, onAddAccount }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [initialAccountCount, setInitialAccountCount] = useState<number | null>(null);
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
  } = useSettingsStore();
  const { data: accounts = [] } = useAccounts();

  // Track initial account count and advance step when an account is added
  useEffect(() => {
    if (currentStep === 2) {
      // Just entered account step, record the current account count
      if (initialAccountCount === null) {
        setInitialAccountCount(accounts.length);
      }
      // If account count increased, advance to next step
      else if (accounts.length > initialAccountCount) {
        setCurrentStep(currentStep + 1);
        // Reset for potential future use
        setInitialAccountCount(null);
      }
    } else {
      // Reset when leaving the account step
      setInitialAccountCount(null);
    }
  }, [accounts, currentStep, initialAccountCount]);

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const isAccountStep = currentStep === 2;
  const isSettingsStep = currentStep === 3;

  const handleNext = () => {
    if (isLastStep) {
      setOnboardingCompleted(true);
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddAccount = () => {
    onAddAccount();
  };

  const handleSkip = () => {
    setOnboardingCompleted(true);
    onComplete();
  };

  return (
    <ModalWrapper onClose={() => {}} preventClose>
      <div className="w-full max-w-md mx-auto max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={isFirstStep}
            className={`p-2 rounded-lg transition-colors ${
              isFirstStep
                ? 'text-surface-300 dark:text-surface-600 cursor-not-allowed'
                : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'
            }`}
            title="Previous step"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center gap-2">
            {ONBOARDING_STEPS.map((step, index) => (
              <div
                key={`step-${index}-${step.title}`}
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

          <button
            type="button"
            onClick={handleNext}
            disabled={isLastStep}
            className={`p-2 rounded-lg transition-colors ${
              isLastStep
                ? 'text-surface-300 dark:text-surface-600 cursor-not-allowed'
                : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'
            }`}
            title="Next step"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0">
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
            <div className="space-y-4">
              <label className="flex items-center justify-between rounded-lg bg-surface-50 dark:bg-surface-800 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-750 transition-colors">
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  Automatic syncing
                </span>
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-5 h-5 rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                />
              </label>

              <div className="rounded-lg bg-surface-50 dark:bg-surface-800">
                <div className="block text-sm font-medium text-surface-900 dark:text-surface-100 mb-2">
                  Sync interval
                </div>
                <select
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  disabled={!autoSync}
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {SYNC_INTERVAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center justify-between rounded-lg bg-surface-50 dark:bg-surface-800 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-750 transition-colors">
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  Sync on startup
                </span>
                <input
                  type="checkbox"
                  checked={syncOnStartup}
                  onChange={(e) => setSyncOnStartup(e.target.checked)}
                  className="w-5 h-5 rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between rounded-lg bg-surface-50 dark:bg-surface-800 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-750 transition-colors">
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  Check for updates automatically
                </span>
                <input
                  type="checkbox"
                  checked={checkForUpdatesAutomatically}
                  onChange={(e) => setCheckForUpdatesAutomatically(e.target.checked)}
                  className="w-5 h-5 rounded border-surface-300 dark:border-surface-600 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                />
              </label>

              <div className="rounded-lg bg-surface-50 dark:bg-surface-800">
                <div className="block text-sm font-medium text-surface-900 dark:text-surface-100 mb-3">
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

              <div className="rounded-lg bg-surface-50 dark:bg-surface-800">
                <div className="block text-sm font-medium text-surface-900 dark:text-surface-100 mb-3">
                  Appearance
                </div>
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

        <div className="flex flex-col gap-3 mt-4">
          {isAccountStep ? (
            <>
              <button
                type="button"
                onClick={handleAddAccount}
                className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 text-primary-contrast font-medium rounded-lg transition-colors flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset"
              >
                <User className="w-5 h-5" />
                Add CalDAV Account
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-full py-3 px-4 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 font-medium rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                I'll do this later
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 text-primary-contrast font-medium rounded-lg transition-colors flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset"
            >
              {isLastStep ? 'Get Started' : 'Continue'}
            </button>
          )}

          {isFirstStep && (
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-3 px-4 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 font-medium rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              Skip onboarding
            </button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
};
