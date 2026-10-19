import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConfirmOptions } from '$context/confirmDialogContext';
import { useConnectionStore } from '$context/connectionContext';
import {
  ConnectionTestCancelledError,
  connectWithCertHandling as connectWithCertHandlingOperation,
  runConnectionTest,
} from '$lib/account/test';
import { CalDAVClient } from '$lib/caldav';
import type { CalDAVSetupError, CalDAVSetupNotice } from '$lib/caldav/setup';
import { getCalDAVErrorInfo } from '$lib/caldav/setup';
import { isValidPrincipalUrlOverride, parseCalDAVServerUrl } from '$lib/caldav/utils';
import { getServerWarning, getUrlWarning, toConfirmOptions } from '$lib/caldav/warnings';
import type { HttpRequestContext } from '$lib/http';
import { loggers } from '$lib/logger';
import type { Account, AccountDraft } from '$types/account';
import type { Calendar } from '$types/calendar';
import { generateUUID } from '$utils/misc';

const log = loggers.account;

interface UseAccountConnectionTestOptions {
  account: Account | null;
  draft: AccountDraft;
  enforceVapid: boolean;
  updateDraft: (updates: Partial<AccountDraft>) => void;
  confirm: (options?: ConfirmOptions) => Promise<boolean>;
}

export const useAccountConnectionTest = ({
  account,
  draft,
  enforceVapid,
  updateDraft,
  confirm,
}: UseAccountConnectionTestOptions) => {
  const { testingAccountIds, beginTesting, endTesting } = useConnectionStore();
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testConnectionId, setTestConnectionId] = useState<string | null>(null);
  const [testedCalendars, setTestedCalendars] = useState<Calendar[]>([]);
  const [setupError, setSetupError] = useState<CalDAVSetupError | null>(null);
  const [setupNotice, setSetupNotice] = useState<CalDAVSetupNotice | null>(null);
  const activeTestConnectionIdRef = useRef<string | null>(null);
  const activeTestStateIdRef = useRef<string | null>(null);
  const activeTestAbortControllerRef = useRef<AbortController | null>(null);
  const testRunIdRef = useRef(0);

  const confirmCertificateTrust = useCallback(
    () =>
      confirm({
        title: 'Untrusted certificate',
        message: (
          <div className="space-y-3">
            <p>
              The server's SSL/TLS certificate is not trusted. This could be because it's
              self-signed or from an unknown certificate authority.
            </p>
            <p>
              Connecting to a server with an untrusted certificate could allow attackers to
              intercept your data if you're on an untrusted network.
            </p>
            <p className="font-bold text-surface-800 dark:text-surface-200">
              Do you want to proceed anyway?
            </p>
          </div>
        ),
        confirmLabel: 'Trust and connect',
        cancelLabel: 'Cancel',
        destructive: true,
      }),
    [confirm],
  );

  const clearTestConnection = useCallback(() => {
    const connectionId = activeTestConnectionIdRef.current ?? testConnectionId;
    if (connectionId) {
      CalDAVClient.disconnect(connectionId);
    }
    activeTestConnectionIdRef.current = null;
    setTestConnectionId(null);
    setTestSuccess(false);
    setTestedCalendars([]);
    setSetupNotice(null);
  }, [testConnectionId]);

  const cancelTestConnection = useCallback(() => {
    testRunIdRef.current += 1;
    activeTestAbortControllerRef.current?.abort();
    activeTestAbortControllerRef.current = null;
    const testStateId = activeTestStateIdRef.current;
    if (testStateId) {
      log.debug(`Cancelling connection test for ${testStateId}...`);
      activeTestStateIdRef.current = null;
      endTesting(testStateId);
    }
    clearTestConnection();
  }, [clearTestConnection, endTesting]);

  const validateServerUrlScheme = useCallback(() => {
    const result = parseCalDAVServerUrl(draft.serverUrl);
    if (result.ok) return true;

    if (result.reason === 'missing-url') {
      setSetupError({
        title: 'Server URL required',
        message: 'Enter the CalDAV server URL for this account.',
        hint: 'Use a full URL like https://caldav.example.com.',
      });
      return false;
    }

    if (result.reason === 'unsupported-scheme' || result.reason === 'invalid-url') {
      setSetupError({
        title: 'URL scheme required',
        message: 'Server URL must start with http:// or https://.',
        hint: 'Add the scheme explicitly, for example https://caldav.example.com.',
      });
      return false;
    }

    setSetupError({
      title: 'Invalid server URL',
      message: 'Server URL must be a valid HTTP(S) URL without embedded credentials.',
      hint:
        result.reason === 'invalid-port'
          ? 'Use a port between 1 and 65535, or omit the port.'
          : 'Use a full URL like https://caldav.example.com.',
    });
    return false;
  }, [draft.serverUrl]);

  const validatePrincipalUrl = useCallback(
    (baseUrl: string) => {
      if (isValidPrincipalUrlOverride(draft.principalUrl, baseUrl)) return true;

      setSetupError({
        title: 'Invalid principal URL',
        message: 'Principal URL must be an HTTP(S) URL or a server-relative path.',
        hint: 'Use a path like /principals/alice/ or a full URL like https://caldav.example.com/principals/alice/.',
      });
      return false;
    },
    [draft.principalUrl],
  );

  const confirmServerWarning = useCallback(
    async (calendarHome?: string) => {
      const warning = getServerWarning(draft.serverType, { calendarHome });
      if (!warning) return true;
      return await confirm(toConfirmOptions(warning));
    },
    [confirm, draft.serverType],
  );

  const confirmServerUrlWarning = useCallback(
    async (url: string) => {
      const warning = getUrlWarning(url);
      if (!warning) return true;
      return await confirm(toConfirmOptions(warning));
    },
    [confirm],
  );

  const connectWithCertHandling = useCallback(
    (
      accountId: string,
      effectivePassword: string,
      trimmedServerUrl: string,
      context?: HttpRequestContext,
    ) =>
      connectWithCertHandlingOperation(
        { account, draft, updateDraft, confirmCertificateTrust },
        accountId,
        effectivePassword,
        trimmedServerUrl,
        context,
      ),
    [account, confirmCertificateTrust, draft, updateDraft],
  );

  const testConnection = useCallback(async () => {
    cancelTestConnection();
    const probeConnectionId = generateUUID();
    const testStateId = account?.id ?? probeConnectionId;
    const isTestStarted = beginTesting(testStateId);

    if (!isTestStarted) {
      setSetupError({
        title: 'Connection test already in progress',
        message: 'This account is already being tested elsewhere.',
        hint: 'Wait for the other connection test to finish, then try again.',
      });
      return;
    }

    const testRunId = testRunIdRef.current;
    const assertTestActive = () => {
      if (testRunIdRef.current !== testRunId) {
        throw new ConnectionTestCancelledError();
      }
    };

    setSetupError(null);
    setSetupNotice(null);
    setTestedCalendars([]);
    setIsTesting(true);
    activeTestConnectionIdRef.current = probeConnectionId;
    activeTestStateIdRef.current = testStateId;
    const abortController = new AbortController();
    activeTestAbortControllerRef.current = abortController;
    const requestContext: HttpRequestContext = {
      operationId: `account-connection-test:${testStateId}:${testRunId}`,
      signal: abortController.signal,
    };
    let keepTestConnection = false;

    try {
      const result = await runConnectionTest({
        account,
        draft,
        enforceVapid,
        probeConnectionId,
        context: requestContext,
        connect: connectWithCertHandling,
        validateServerUrlScheme,
        validatePrincipalUrl,
        confirmServerWarning,
        confirmServerUrlWarning,
        assertActive: assertTestActive,
      });

      if (!result) return;

      setTestConnectionId(probeConnectionId);
      setTestedCalendars(result.calendars);
      setSetupNotice(result.notice);
      setTestSuccess(true);
      keepTestConnection = true;
    } catch (err) {
      if (err instanceof ConnectionTestCancelledError || abortController.signal.aborted) {
        log.info('Connection test cancelled; ignoring the result.');
        return;
      }
      setSetupError(
        getCalDAVErrorInfo(
          err,
          'Failed to test CalDAV connection',
          draft.serverType,
          draft.serverUrl,
        ),
      );
      log.error('Connection test failed:', err);
    } finally {
      if (!keepTestConnection) {
        const ownsActiveTest =
          activeTestConnectionIdRef.current === probeConnectionId &&
          activeTestStateIdRef.current === testStateId;
        if (ownsActiveTest) {
          clearTestConnection();
        } else {
          CalDAVClient.disconnect(probeConnectionId);
        }
      }
      const isCurrentTest = testRunIdRef.current === testRunId;
      if (isCurrentTest) {
        setIsTesting(false);
      }
      if (isCurrentTest && activeTestStateIdRef.current === testStateId) {
        activeTestStateIdRef.current = null;
        endTesting(testStateId);
      }
      if (activeTestAbortControllerRef.current === abortController) {
        activeTestAbortControllerRef.current = null;
      }
    }
  }, [
    account,
    beginTesting,
    cancelTestConnection,
    clearTestConnection,
    confirmServerUrlWarning,
    confirmServerWarning,
    connectWithCertHandling,
    draft,
    enforceVapid,
    endTesting,
    validatePrincipalUrl,
    validateServerUrlScheme,
  ]);

  const connectionDraftKey = useMemo(
    () =>
      [
        draft.serverUrl,
        draft.username,
        draft.password,
        draft.calendarHomeUrl,
        draft.principalUrl,
      ].join('\u0000'),
    [draft.calendarHomeUrl, draft.password, draft.principalUrl, draft.serverUrl, draft.username],
  );
  const previousConnectionDraftKeyRef = useRef(connectionDraftKey);

  useEffect(() => {
    if (previousConnectionDraftKeyRef.current === connectionDraftKey) return;
    previousConnectionDraftKeyRef.current = connectionDraftKey;
    cancelTestConnection();
  }, [cancelTestConnection, connectionDraftKey]);

  return {
    isTesting,
    testSuccess,
    testConnectionId,
    testedCalendars,
    setupError,
    setupNotice,
    setSetupError,
    setSetupNotice,
    testingAccountIds,
    clearTestConnection,
    cancelTestConnection,
    testConnection,
    connectWithCertHandling,
    validateServerUrlScheme,
    validatePrincipalUrl,
    confirmServerWarning,
    confirmServerUrlWarning,
  };
};
