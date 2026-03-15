import AlertTriangle from 'lucide-react/icons/alert-triangle';
import ArrowRight from 'lucide-react/icons/arrow-right';
import Calendar from 'lucide-react/icons/calendar';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import FolderKanban from 'lucide-react/icons/folder-kanban';
import Settings from 'lucide-react/icons/settings';
import Sparkles from 'lucide-react/icons/sparkles';
import User from 'lucide-react/icons/user';

export interface OnboardingStep {
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  illustration?: React.ReactNode;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Chiri',
    description:
      'A lightweight app that syncs with your CalDAV server. Keep your tasks organized across all your devices.',
    icon: <FolderKanban className="w-12 h-12 text-primary-500" />,
    illustration: (
      <div className="flex items-center justify-center gap-4 py-6">
        <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <FolderKanban className="w-8 h-8 text-primary-600 dark:text-primary-400" />
        </div>
      </div>
    ),
  },
  {
    title: 'Alpha software notice',
    description: (
      <div className="space-y-3">
        <p>
          This app is in active development. It should be *relatively* stable, but can contain
          missing features and occasionally you may run into a bug.
        </p>

        <p>If you encounter any issues, please report them to me on GitHub. I will answer ASAP.</p>
      </div>
    ),
    icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
    illustration: (
      <div className="flex flex-col items-center justify-center gap-6 py-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
      </div>
    ),
  },
  {
    title: 'Connect your CalDAV account',
    description:
      'Add your CalDAV server credentials to sync your tasks. We support Nextcloud, Fastmail, and any standard CalDAV server.',
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
    title: "You're All Set!",
    description:
      'Start adding tasks and stay productive. Your tasks will sync automatically in the background.',
    icon: <CheckCircle2 className="w-12 h-12 text-primary-500" />,
    illustration: (
      <div className="flex items-center justify-center py-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center animate-pulse">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
      </div>
    ),
  },
];
