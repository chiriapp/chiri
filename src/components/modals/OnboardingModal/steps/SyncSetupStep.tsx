import Cloud from 'lucide-react/icons/cloud';
import HardDrive from 'lucide-react/icons/hard-drive';
import { ActionCard } from '$components/modals/OnboardingModal/ActionCard';

export type TaskHome = 'local' | 'caldav';

interface SyncSetupStepProps {
  taskHome: TaskHome;
  hasConnectedCalDAVHome: boolean;
  calDAVAccountCount: number;
  onTaskHomeChange: (home: TaskHome) => void;
}

export const SyncSetupStep = ({
  taskHome,
  hasConnectedCalDAVHome,
  calDAVAccountCount,
  onTaskHomeChange,
}: SyncSetupStepProps) => (
  <div className="flex flex-1 flex-col justify-end gap-5">
    {hasConnectedCalDAVHome ? (
      <div className="space-y-2">
        <p className="text-surface-500 text-xs dark:text-surface-400">Summary</p>
        <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <Cloud className="h-5 w-5 text-primary-ink" />
            <div>
              <div className="font-semibold text-sm text-surface-900 dark:text-surface-100">
                CalDAV sync
              </div>
              <div className="mt-1 text-surface-500 text-xs dark:text-surface-400">
                {calDAVAccountCount} {calDAVAccountCount === 1 ? 'account' : 'accounts'} connected
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="grid gap-3 md:grid-cols-2">
        <ActionCard
          icon={<Cloud className="h-6 w-6" />}
          title="CalDAV sync"
          description="Sync tasks with CalDAV servers like Nextcloud, Fastmail, Radicale, and more."
          selected={taskHome === 'caldav'}
          onClick={() => onTaskHomeChange('caldav')}
        />
        <ActionCard
          icon={<HardDrive className="h-6 w-6" />}
          title="Local-only"
          description="Keep tasks on this device and add sync later from settings."
          selected={taskHome === 'local'}
          onClick={() => onTaskHomeChange('local')}
        />
      </div>
    )}
  </div>
);
