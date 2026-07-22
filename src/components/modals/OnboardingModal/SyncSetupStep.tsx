import Cloud from 'lucide-react/icons/cloud';
import HardDrive from 'lucide-react/icons/hard-drive';
import { ActionCard } from './ActionCard';

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
  <div className="flex flex-1 flex-col justify-between gap-5">
    <div>
      {hasConnectedCalDAVHome && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary-500 text-primary-contrast">
          <Cloud className="h-8 w-8" />
        </div>
      )}
      <h2 className="font-semibold text-2xl text-surface-950 dark:text-surface-50">
        {hasConnectedCalDAVHome ? 'Connected' : 'Choose where tasks live'}
      </h2>
      <p className="mt-2 text-sm text-surface-600 leading-6 dark:text-surface-400">
        {hasConnectedCalDAVHome
          ? `Your CalDAV ${calDAVAccountCount === 1 ? 'account has' : 'accounts have'} been added. You can add more accounts, or continue with onboarding.`
          : 'Connect your CalDAV account now, or keep tasks local and add sync later.'}
      </p>
    </div>
    {hasConnectedCalDAVHome ? (
      <div className="space-y-2">
        <p className="text-surface-500 text-xs dark:text-surface-400">Summary</p>
        <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <Cloud className="h-5 w-5 text-primary-500" />
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
          description="Sync tasks with Nextcloud, Fastmail, Radicale, Baikal, RustiCal, or another CalDAV server."
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
