import ArrowLeft from 'lucide-react/icons/arrow-left';
import ArrowRight from 'lucide-react/icons/arrow-right';
import User from 'lucide-react/icons/user';
import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/context/settingsContext';
import { ONBOARDING_STEPS } from '@/data/onboarding';
import { useAccounts } from '@/hooks/queries';
import { ModalWrapper } from '../ModalWrapper';

interface OnboardingModalProps {
  onComplete: () => void;
  onAddAccount: () => void;
}

export function OnboardingModal({ onComplete, onAddAccount }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [initialAccountCount, setInitialAccountCount] = useState<number | null>(null);
  const { setOnboardingCompleted } = useSettingsStore();
  const { data: accounts = [] } = useAccounts();

  // Track initial account count and advance step when an account is added
  useEffect(() => {
    if (currentStep === 1) {
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
  const isAccountStep = currentStep === 1;

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
      <div className="w-full max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
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

          {/* Progress dots */}
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

        <div className="text-center">
          {step.illustration}

          <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-3">
            {step.title}
          </h2>

          <p className="text-surface-600 dark:text-surface-400 mb-8 leading-relaxed">
            {step.description}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {isAccountStep ? (
            <>
              <button
                type="button"
                onClick={handleAddAccount}
                className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <User className="w-5 h-5" />
                Add CalDAV Account
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-full py-3 px-4 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 font-medium rounded-lg transition-colors"
              >
                I'll do this later
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLastStep ? 'Get Started' : 'Continue'}
            </button>
          )}

          {isFirstStep && (
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
            >
              Skip onboarding
            </button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}
