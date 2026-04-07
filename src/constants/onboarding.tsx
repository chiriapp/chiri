import ArrowRight from 'lucide-react/icons/arrow-right';
import Calendar from 'lucide-react/icons/calendar';
import Check from 'lucide-react/icons/check';
import Settings from 'lucide-react/icons/settings';
import User from 'lucide-react/icons/user';
import AppIcon from '$components/Icon';
import type { OnboardingStep } from '$types/settings';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Chiri!',
    description: (
      <div className="space-y-3">
        <p>A cross-platform CalDAV task management app.</p>

        <p className="text-sm text-surface-500 dark:text-surface-400">
          Note: This app is in active development and may contain bugs. Please report issues on
          GitHub.
        </p>
      </div>
    ),
    icon: <AppIcon className="w-12 h-12 text-primary-500" />,
    illustration: (
      <div className="flex items-center justify-center gap-4 py-6">
        <div className="w-16 h-16 rounded-2xl bg-primary-500/15 flex items-center justify-center">
          <AppIcon className="w-8 h-8 text-primary-500 shrink-0" />
        </div>
      </div>
    ),
  },
  {
    title: 'Connect your CalDAV account',
    description:
      'Add your CalDAV account to manage and sync tasks. Almost every server implementation is supported.',
    icon: <User className="w-12 h-12 text-primary-500" />,
    illustration: (
      <div className="flex items-center justify-center gap-4 py-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <ArrowRight className="w-6 h-6 text-surface-400" />
        <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
      </div>
    ),
  },
  {
    title: 'Customize your experience',
    description: 'Configure these settings now, or adjust them later.',
    icon: <Settings className="w-12 h-12 text-primary-500" />,
    illustration: (
      <div className="flex items-center justify-center py-6">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Settings className="w-8 h-8 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
    ),
  },
  {
    title: "You're all set!",
    description: 'Start adding tasks and stay productive.',
    icon: <Check className="w-12 h-12 text-primary-500" />,
    illustration: (
      <div className="flex items-center justify-center py-8">
        <div className="w-20 h-20 rounded-full bg-primary-500 flex items-center justify-center">
          <Check className="w-10 h-10 text-primary-contrast" />
        </div>
      </div>
    ),
  },
];
