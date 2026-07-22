import Check from 'lucide-react/icons/check';

interface ReadyStepProps {
  hasConnectedCalDAVHome: boolean;
}

export const ReadyStep = ({ hasConnectedCalDAVHome }: ReadyStepProps) => (
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
  </div>
);
