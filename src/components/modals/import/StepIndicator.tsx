import Check from 'lucide-react/icons/check';
import type { ImportStep } from '$types/import';

interface StepIndicatorProps {
  currentStep: ImportStep;
  hasFile: boolean;
  hasDestination: boolean;
}

const STEPS: { key: ImportStep; label: string }[] = [
  { key: 'upload', label: 'Select File' },
  { key: 'destination', label: 'Choose Destination' },
  { key: 'review', label: 'Review & Import' },
];

export const StepIndicator = ({ currentStep, hasFile, hasDestination }: StepIndicatorProps) => {
  const getStepStatus = (step: ImportStep): 'completed' | 'active' | 'pending' => {
    if (step === 'upload') {
      if (currentStep === 'upload') return 'active';
      return hasFile ? 'completed' : 'pending';
    }

    if (step === 'destination') {
      if (currentStep === 'destination') return 'active';
      if (currentStep === 'review') return hasDestination ? 'completed' : 'pending';
      return 'pending';
    }

    if (step === 'review') {
      if (currentStep === 'review') return 'active';
      return 'pending';
    }
    return 'pending';
  };

  return (
    <div className="flex items-center justify-center">
      {STEPS.map((step, index) => {
        const status = getStepStatus(step.key);
        return (
          <div key={step.key} className="flex items-center">
            {index > 0 && (
              <div
                className={`w-10 h-px mx-2 transition-colors ${
                  (index === 1 && (currentStep === 'destination' || currentStep === 'review')) ||
                  (index === 2 && currentStep === 'review')
                    ? 'bg-primary-400 dark:bg-primary-500'
                    : 'bg-surface-300 dark:bg-surface-600'
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  status === 'completed'
                    ? 'bg-primary-500 text-white'
                    : status === 'active'
                      ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500'
                      : 'bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400'
                }`}
              >
                {status === 'completed' ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline transition-colors ${
                  status === 'active'
                    ? 'text-primary-700 dark:text-primary-300'
                    : status === 'completed'
                      ? 'text-surface-700 dark:text-surface-300'
                      : 'text-surface-500 dark:text-surface-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
