import Cloud from 'lucide-react/icons/cloud';
import HardDrive from 'lucide-react/icons/hard-drive';
import Sparkles from 'lucide-react/icons/sparkles';
import AppIcon from '$components/Icon';

export const WelcomeStep = () => (
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
        <div className="font-medium text-sm text-surface-900 dark:text-surface-100">Sync ready</div>
      </div>
      <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
        <Sparkles className="mb-3 h-5 w-5 text-primary-500" />
        <div className="font-medium text-sm text-surface-900 dark:text-surface-100">No fuss</div>
      </div>
    </div>
  </div>
);
