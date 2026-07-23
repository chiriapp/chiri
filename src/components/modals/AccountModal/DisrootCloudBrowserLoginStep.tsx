import { getCurrentWindow } from '@tauri-apps/api/window';
import Loader2 from 'lucide-react/icons/loader-2';
import { useEffect, useState } from 'react';
import { useSettingsStore } from '$context/settingsContext';
import { useAddCalendar, useCreateAccount } from '$hooks/queries/useAccounts';
import { useSyncQuery } from '$hooks/queries/useSync';
import { cancelNextcloudLogin, initiateNextcloudLogin } from '$lib/auth/nextcloud';
import { CalDAVClient } from '$lib/caldav';
import { loggers } from '$lib/logger';
import { generateUUID } from '$utils/misc';

const log = loggers.account;

const DISROOT_CLOUD_URL = 'https://cloud.disroot.org';

interface DisrootCloudBrowserLoginStepProps {
  onSuccess: () => void;
  onSetupInProgressChange: (inProgress: boolean) => void;
}

type Phase = 'idle' | 'browser' | 'connecting' | 'done';

export const DisrootCloudBrowserLoginStep = ({
  onSuccess,
  onSetupInProgressChange,
}: DisrootCloudBrowserLoginStepProps) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const createAccountMutation = useCreateAccount();
  const addCalendarMutation = useAddCalendar();
  const { syncAll } = useSyncQuery();
  const { enforceVapid } = useSettingsStore();

  useEffect(() => {
    return () => {
      cancelNextcloudLogin();
    };
  }, []);

  const handleConnect = async () => {
    setError('');
    setPhase('browser');

    try {
      log.info('[DisrootCloudBrowserLogin] Starting Nextcloud login flow', {
        serverUrl: DISROOT_CLOUD_URL,
      });
      const credentials = await initiateNextcloudLogin(DISROOT_CLOUD_URL);

      log.info('[DisrootCloudBrowserLogin] Login credentials received', {
        loginName: credentials.loginName,
      });

      try {
        await getCurrentWindow().setFocus();
      } catch (err) {
        log.warn('[DisrootCloudBrowserLogin] Failed to focus window after authentication', {
          error: err,
        });
      }

      setPhase('connecting');

      const accountId = generateUUID();
      const { displayName } = await CalDAVClient.connect(
        accountId,
        credentials.server,
        credentials.loginName,
        credentials.appPassword,
        'disrootCloud',
      );

      log.info('[DisrootCloudBrowserLogin] Fetching calendars');
      const calendars = await CalDAVClient.getForAccount(accountId).fetchCalendars(enforceVapid);
      log.info(`[DisrootCloudBrowserLogin] Found ${calendars.length} calendars`);

      await createAccountMutation.mutateAsync({
        id: accountId,
        name: `${displayName || credentials.loginName} (Disroot Cloud)`,
        icon: 'user',
        caldav: {
          serverUrl: credentials.server,
          username: credentials.loginName,
          password: credentials.appPassword,
          serverType: 'disrootCloud',
          authType: 'basic',
        },
      });

      if (calendars.length > 0) {
        for (const calendar of calendars) {
          await addCalendarMutation.mutateAsync({ accountId, calendarData: calendar });
        }
      }

      setPhase('done');

      await syncAll({
        source: 'account-setup-disrootCloud',
        reason: 'completed Disroot Cloud browser login account creation',
        where: 'DisrootCloudBrowserLoginStep',
      });

      onSuccess();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to connect to Disroot Cloud';
      log.error('[DisrootCloudBrowserLogin] Login failed', { error: e });
      setError(message);
      setPhase('idle');
    }
  };

  const isLoading = phase === 'browser' || phase === 'connecting';
  const isSetupInProgress = phase === 'connecting';

  useEffect(() => {
    onSetupInProgressChange(isSetupInProgress);
  }, [isSetupInProgress, onSetupInProgressChange]);

  const statusText =
    phase === 'browser'
      ? 'Waiting for authorization in browser…'
      : phase === 'connecting'
        ? 'Setting up account…'
        : null;

  return (
    <div className="space-y-4 p-6">
      <div className="space-y-1">
        <p className="text-sm text-surface-600 dark:text-surface-400">
          Chiri will open your browser to authorize with Disroot Cloud. Once you approve access,
          you'll be returned here automatically.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-semantic-error/20 bg-semantic-error/10 px-3 py-2 text-semantic-error text-sm">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleConnect}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 font-semibold text-primary-contrast text-sm outline-none transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
            {statusText}
          </>
        ) : (
          'Connect with Disroot Cloud'
        )}
      </button>

      {phase === 'browser' && (
        <p className="text-center text-surface-500 text-xs dark:text-surface-400">
          Complete authorization in your browser, then return here.
        </p>
      )}
    </div>
  );
};
