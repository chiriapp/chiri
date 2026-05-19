import { useQueryClient } from '@tanstack/react-query';
import Loader2 from 'lucide-react/icons/loader-2';
import { useState } from 'react';
import { useAddCalendar, useCreateAccount } from '$hooks/queries/useAccounts';
import { useSyncQuery } from '$hooks/queries/useSync';
import {
  FASTMAIL_CALDAV_URL,
  type FastmailTokens,
  startFastmailOAuth,
  usernameFromPrincipalUrl,
} from '$lib/auth/fastmail';
import { CalDAVClient } from '$lib/caldav';
import { loggers } from '$lib/logger';
import { ensureTagExists } from '$lib/store/sync';
import { createTask } from '$lib/store/tasks';

const log = loggers.account;

interface FastmailOAuthStepProps {
  onSuccess: () => void;
}

type Phase = 'idle' | 'browser' | 'connecting' | 'done';

export const FastmailOAuthStep = ({ onSuccess }: FastmailOAuthStepProps) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const createAccountMutation = useCreateAccount();
  const addCalendarMutation = useAddCalendar();
  const { syncAll } = useSyncQuery();

  const handleConnect = async () => {
    setError('');
    setPhase('browser');

    let tokens: FastmailTokens;
    try {
      tokens = await startFastmailOAuth();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authorization failed');
      setPhase('idle');
      return;
    }

    setPhase('connecting');

    try {
      const accountId = crypto.randomUUID();
      const { accessToken, refreshToken, tokenExpiry } = tokens;

      // connect to CalDAV: principal URL contains the username (email)
      const { principalUrl, displayName } = await CalDAVClient.connectWithBearer(
        accountId,
        FASTMAIL_CALDAV_URL,
        '',
        accessToken,
        'fastmail',
      );

      const username = usernameFromPrincipalUrl(principalUrl);

      log.info('[FastmailOAuth] Fetching calendars');
      const calendars = await CalDAVClient.getForAccount(accountId).fetchCalendars();
      log.info(`[FastmailOAuth] Found ${calendars.length} calendars`);

      createAccountMutation.mutate(
        {
          id: accountId,
          name: `${displayName || username} (Fastmail)`,
          icon: 'user',
          caldav: {
            serverUrl: FASTMAIL_CALDAV_URL,
            username,
            password: accessToken,
            serverType: 'fastmail',
            authType: 'oauth',
            refreshToken,
            tokenExpiry,
          },
        },
        {
          onSuccess: async (newAccount) => {
            try {
              for (const calendar of calendars) {
                addCalendarMutation.mutate({ accountId: newAccount.id, calendarData: calendar });
              }

              log.debug('[FastmailOAuth] Fetching initial tasks');
              for (const calendar of calendars) {
                try {
                  const remoteTasks = await CalDAVClient.getForAccount(newAccount.id).fetchTasks(
                    calendar,
                  );
                  if (!remoteTasks) continue;
                  for (const remoteTask of remoteTasks) {
                    let tagIds: string[] = [];
                    if (remoteTask.categoryId) {
                      const names = remoteTask.categoryId
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter(Boolean);
                      tagIds = names.map((name: string) => ensureTagExists(name));
                    }
                    createTask({ ...remoteTask, tags: tagIds });
                  }
                } catch (e) {
                  log.error(
                    `[FastmailOAuth] Failed to fetch tasks for ${calendar.displayName}:`,
                    e,
                  );
                }
              }

              queryClient.invalidateQueries({ queryKey: ['tasks'] });
              queryClient.invalidateQueries({ queryKey: ['tags'] });

              setPhase('done');

              // kick off a background sync
              syncAll({
                source: 'account-setup-fastmail',
                reason: 'completed Fastmail OAuth account creation',
                where: 'FastmailOAuthStep',
              });

              onSuccess();
            } catch (e) {
              log.error('[FastmailOAuth] Post-create setup failed:', e);
              onSuccess(); // still close, account was created
            }
          },
          onError: (e) => {
            setError(e instanceof Error ? e.message : 'Failed to create account');
            setPhase('idle');
          },
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect to Fastmail');
      setPhase('idle');
    }
  };

  const isLoading = phase === 'browser' || phase === 'connecting';

  const statusText =
    phase === 'browser'
      ? 'Waiting for authorization in browser…'
      : phase === 'connecting'
        ? 'Setting up account…'
        : null;

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-surface-600 dark:text-surface-400">
          Chiri will open your browser to authorize with Fastmail. Once you approve access, you'll
          be returned here automatically.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-semantic-error/10 border border-semantic-error/20 px-3 py-2 text-sm text-semantic-error">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleConnect}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {statusText}
          </>
        ) : (
          'Connect with Fastmail'
        )}
      </button>

      {phase === 'browser' && (
        <p className="text-xs text-center text-surface-500 dark:text-surface-400">
          Complete authorization in your browser, then return here.
        </p>
      )}
    </div>
  );
};
