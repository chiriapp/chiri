import { useQueryClient } from '@tanstack/react-query';
import CheckCircle from 'lucide-react/icons/check-circle';
import ChevronDown from 'lucide-react/icons/chevron-down';
import Cloud from 'lucide-react/icons/cloud';
import Info from 'lucide-react/icons/info';
import Loader2 from 'lucide-react/icons/loader-2';
import X from 'lucide-react/icons/x';
import { useRef, useState } from 'react';
import { AppSelect } from '$components/AppSelect';
import { ComposedInput } from '$components/ComposedInput';
import { ModalBackdrop } from '$components/ModalBackdrop';
import { NextcloudLoginModal } from '$components/modals/NextcloudLoginModal';
import { RusticalLoginModal } from '$components/modals/RusticalLoginModal';
import {
  getPredefinedServerUrl,
  getServerTypeDescription,
  SERVER_TYPE_GROUPS,
} from '$constants/settings';
import { useAddCalendar, useCreateAccount, useUpdateAccount } from '$hooks/queries/useAccounts';
import { useConfirmDialog } from '$hooks/store/useConfirmDialog';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';
import { CalDAVClient } from '$lib/caldav';
import { loggers } from '$lib/logger';
import { ensureTagExists } from '$lib/store/sync';
import { createTask } from '$lib/store/tasks';
import { isCertError, tauriRequest } from '$lib/tauri-http';
import type { Account, Calendar, ServerType } from '$types';
import { generateUUID, isVikunjaServer, pluralize } from '$utils/misc';
import type { CalDAVConfig } from '$utils/mobileconfig';

const log = loggers.account;

interface AccountModalProps {
  account: Account | null;
  onClose: () => void;
  preloadedConfig?: CalDAVConfig;
}

export const AccountModal = ({ account, onClose, preloadedConfig }: AccountModalProps) => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const addCalendarMutation = useAddCalendar();

  const [name, setName] = useState(() => preloadedConfig?.accountName || account?.name || '');
  const [serverUrl, setServerUrl] = useState(
    () => preloadedConfig?.serverUrl || account?.serverUrl || '',
  );
  const [username, setUsername] = useState(
    () => preloadedConfig?.username || account?.username || '',
  );
  const [password, setPassword] = useState(() => preloadedConfig?.password || '');
  const [serverType, setServerType] = useState<ServerType>(
    () => preloadedConfig?.serverType || account?.serverType || 'generic',
  );
  const [calendarHomeUrl, setCalendarHomeUrl] = useState(() => account?.calendarHomeUrl || '');
  const [showAdvanced, setShowAdvanced] = useState(() => !!account?.calendarHomeUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testedConnectionId, setTestedConnectionId] = useState<string | null>(null);
  const [testedCalendars, setTestedCalendars] = useState<Calendar[]>([]);
  const [error, setError] = useState('');
  const [showNextcloudLogin, setShowNextcloudLogin] = useState(false);
  const [showRusticalLogin, setShowRusticalLogin] = useState(false);
  const [acceptInvalidCerts, setAcceptInvalidCerts] = useState(
    () => account?.acceptInvalidCerts ?? false,
  );
  const focusTrapRef = useFocusTrap();
  const nameInputFocusedRef = useRef(false);

  // handle ESC key to close modal
  useModalEscapeKey(onClose);

  // Reset test state when credentials change
  const [prevCredentials, setPrevCredentials] = useState({
    serverUrl,
    username,
    password,
    calendarHomeUrl,
  });
  if (
    serverUrl !== prevCredentials.serverUrl ||
    username !== prevCredentials.username ||
    password !== prevCredentials.password ||
    calendarHomeUrl !== prevCredentials.calendarHomeUrl
  ) {
    setPrevCredentials({ serverUrl, username, password, calendarHomeUrl });
    setTestSuccess(false);
    setTestedConnectionId(null);
    setTestedCalendars([]);
  }

  /**
   * show warning dialog for Vikunja servers
   */
  const showVikunjaWarning = async () => {
    return await confirm({
      title: 'Vikunja server detected',
      message: (
        <div className="space-y-3">
          <p>
            This appears to be a{' '}
            <strong className="font-semibold text-surface-800 dark:text-surface-200">
              Vikunja server
            </strong>
            .
          </p>
          <p>Vikunja has several CalDAV bugs that cause unpredictable behavior.</p>
          <p className="font-extrabold text-base text-surface-700 dark:text-surface-300">
            ⚠️ This app may not work reliably with Vikunja and you may even encounter data loss. ⚠️
          </p>
          <p className="font-bold text-surface-800 dark:text-surface-200">
            It's recommend you try other CalDAV servers (like RustiCal, Fastmail, Baikal, Radicale,
            etc.) instead.
          </p>
          <p>Do you want to continue anyway?</p>
        </div>
      ),
      confirmLabel: 'Continue (dangerous)',
      cancelLabel: 'Cancel',
      destructive: true,
      delayConfirmSeconds: 20,
    });
  };

  /**
   * show warning dialog for untrusted/self-signed server certificates
   */
  const showCertTrustDialog = async () => {
    return await confirm({
      title: 'Untrusted certificate',
      message: (
        <div className="space-y-3">
          <p>
            The server's SSL/TLS certificate is not trusted. This could be because it's self-signed
            or from an unknown certificate authority.
          </p>

          <p>
            Connecting to a server with an untrusted certificate could allow attackers to intercept
            your data if you're on an untrusted network.
          </p>

          <p className="font-bold text-surface-800 dark:text-surface-200">
            Only proceed if you trust the server and understand the risks.
          </p>
        </div>
      ),

      confirmLabel: 'Connect anyway',
      cancelLabel: 'Cancel',
      destructive: true,
    });
  };

  /**
   * fetch tasks for a calendar and store them locally
   */
  const fetchTasksForCalendar = async (accountId: string, calendar: Calendar) => {
    try {
      const remoteTasks = await CalDAVClient.getForAccount(accountId).fetchTasks(calendar);

      if (!remoteTasks) {
        log.warn(`No tasks fetched from ${calendar.displayName}`);
        return;
      }

      log.info(`Fetched ${remoteTasks.length} tasks from ${calendar.displayName}`);

      for (const remoteTask of remoteTasks) {
        // Extract category/tag from the task and create if needed
        let tagIds: string[] = [];
        if (remoteTask.categoryId) {
          const categoryNames = remoteTask.categoryId
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          tagIds = categoryNames.map((name: string) => ensureTagExists(name));
        }

        // Add the task with tags
        createTask({
          ...remoteTask,
          tags: tagIds,
        });
      }
    } catch (error) {
      log.error(`Failed to fetch tasks for calendar ${calendar.displayName}:`, error);
    }
  };

  /**
   * Connects to the CalDAV server with automatic cert trust detection.
   * If the connection fails with a network error and the server is reachable
   * with cert validation bypassed, prompts the user to trust the certificate.
   * Returns null if the user declined the cert trust dialog.
   */
  const connectWithCertHandling = async (accountId: string, effectivePassword: string) => {
    const tryConnect = (withInvalidCerts?: boolean) =>
      CalDAVClient.connect(
        accountId,
        serverUrl,
        username,
        effectivePassword,
        serverType,
        calendarHomeUrl.trim() || undefined,
        withInvalidCerts,
      );

    try {
      return await tryConnect(acceptInvalidCerts || undefined);
    } catch (err) {
      const looksLikeNetworkError =
        isCertError(err) ||
        (typeof err === 'string' && err.includes('error sending request for url'));

      if (!looksLikeNetworkError) throw err;

      // Probe with cert bypass — any HTTP response means the server is reachable
      // and the failure was a cert trust issue rather than genuine unreachability.
      let serverReachable = false;
      try {
        await tauriRequest(serverUrl, 'OPTIONS', {
          username,
          password: effectivePassword,
          acceptInvalidCerts: true,
        });
        serverReachable = true;
      } catch {
        // Also failed with bypass - genuinely unreachable.
      }

      if (!serverReachable) throw err;

      const proceed = await showCertTrustDialog();
      if (!proceed) return null;

      setAcceptInvalidCerts(true);
      return await tryConnect(true);
    }
  };

  const handleTestConnection = async () => {
    setError('');
    setTestSuccess(false);
    setTestedConnectionId(null);
    setTestedCalendars([]);
    setIsTesting(true);

    try {
      const effectivePassword = password || account?.password;

      if (!effectivePassword) {
        throw new Error('Password is required to test connection');
      }

      if (!serverUrl.trim() || !username.trim()) {
        throw new Error('Server URL and username are required');
      }

      const tempId = generateUUID();
      log.debug(`Testing connection to ${serverUrl}...`);

      const connectionInfo = await connectWithCertHandling(tempId, effectivePassword);
      if (!connectionInfo) {
        setIsTesting(false);
        return;
      }

      // Check if this is a Vikunja server and warn the user
      if (isVikunjaServer(connectionInfo.calendarHome)) {
        const proceed = await showVikunjaWarning();

        if (!proceed) {
          // User cancelled, disconnect and return
          CalDAVClient.disconnect(tempId);
          setIsTesting(false);
          return;
        }
      }

      // Fetch calendars to verify full connection
      log.debug(`Fetching calendars...`);
      const calendars = await CalDAVClient.getForAccount(tempId).fetchCalendars();
      log.info(`Connection test successful - found ${calendars.length} calendars`);

      // Store the connection info for reuse
      setTestedConnectionId(tempId);
      setTestedCalendars(calendars);
      setTestSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to CalDAV server');
      log.error('Connection test failed:', err);
      // Clean up failed connection
      setTestedConnectionId(null);
      setTestedCalendars([]);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreateAccount = async (effectivePassword: string) => {
    let tempId: string;
    let calendars: Calendar[];

    // If we already tested the connection successfully, reuse it
    if (testSuccess && testedConnectionId && testedCalendars.length > 0) {
      log.debug('Reusing tested connection...');
      tempId = testedConnectionId;
      calendars = testedCalendars;
    } else {
      tempId = generateUUID();

      log.debug(`Connecting to ${serverUrl}...`);
      const connectionInfo = await connectWithCertHandling(tempId, effectivePassword);
      if (!connectionInfo) {
        setIsLoading(false);
        return;
      }

      if (isVikunjaServer(connectionInfo.calendarHome)) {
        const proceed = await showVikunjaWarning();
        if (!proceed) {
          CalDAVClient.disconnect(tempId);
          setIsLoading(false);
          return;
        }
      }

      log.debug(`Fetching calendars...`);
      calendars = await CalDAVClient.getForAccount(tempId).fetchCalendars();
      log.info(`Found ${calendars.length} calendars:`, calendars);
    }

    createAccountMutation.mutate(
      {
        id: tempId, // use the same ID so the caldavService connection maps correctly
        name,
        serverUrl,
        username,
        password: effectivePassword,
        serverType,
        calendarHomeUrl: calendarHomeUrl.trim() || undefined,
        acceptInvalidCerts: acceptInvalidCerts || undefined,
      },
      {
        onSuccess: async (newAccount) => {
          try {
            for (const calendar of calendars) {
              addCalendarMutation.mutate({ accountId: newAccount.id, calendarData: calendar });
            }
            log.debug('Fetching tasks for all calendars...');
            for (const calendar of calendars) {
              await fetchTasksForCalendar(newAccount.id, calendar);
            }
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['tags'] });
            onClose();
          } catch (error) {
            log.error('Error setting up account:', error);
            onClose();
          } finally {
            setIsLoading(false);
          }
        },
        onError: (error) => {
          log.error('Error creating account:', error);
          setError(error instanceof Error ? error.message : 'Failed to create account');
          setIsLoading(false);
        },
      },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const effectivePassword = password || account?.password;

      if (account) {
        if (effectivePassword) {
          log.debug(`Testing connection to ${serverUrl}...`);
          const result = await connectWithCertHandling(account.id, effectivePassword);
          if (!result) {
            setIsLoading(false);
            return;
          }
        }

        updateAccountMutation.mutate({
          id: account.id,
          updates: {
            name,
            serverUrl,
            username,
            password: effectivePassword || account.password,
            serverType,
            calendarHomeUrl: calendarHomeUrl.trim() || undefined,
            acceptInvalidCerts: acceptInvalidCerts || undefined,
          },
        });

        onClose();
        setIsLoading(false);
      } else {
        if (!effectivePassword) throw new Error('Password is required');
        await handleCreateAccount(effectivePassword);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to CalDAV server');
      log.error('Failed to connect:', err);
      setIsLoading(false);
    }
  };

  return (
    <>
      {showNextcloudLogin && (
        <NextcloudLoginModal onClose={() => setShowNextcloudLogin(false)} onSuccess={onClose} />
      )}

      {showRusticalLogin && (
        <RusticalLoginModal onClose={() => setShowRusticalLogin(false)} onSuccess={onClose} />
      )}

      {!showNextcloudLogin && !showRusticalLogin && (
        <ModalBackdrop zIndex="z-[60]">
          <div
            ref={focusTrapRef}
            className="relative bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-md animate-scale-in"
          >
            <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
              <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
                {account ? 'Edit Account' : 'Add CalDAV Account'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 max-h-[calc(90vh-4rem)]">
              <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div>
                  <label
                    htmlFor="account-name"
                    className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
                  >
                    Account Display Name
                  </label>
                  <ComposedInput
                    id="account-name"
                    type="text"
                    ref={(el) => {
                      if (el && !nameInputFocusedRef.current) {
                        nameInputFocusedRef.current = true;
                        setTimeout(() => el.focus(), 100);
                      }
                    }}
                    value={name}
                    onChange={setName}
                    placeholder="My CalDAV Account"
                    required
                    className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="server-type"
                    className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
                  >
                    Server Type
                  </label>
                  <AppSelect
                    id="server-type"
                    value={serverType}
                    onChange={(e) => {
                      const newType = e.target.value as ServerType;
                      setServerType(newType);
                    }}
                    className="w-full text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
                  >
                    {SERVER_TYPE_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </AppSelect>
                  <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                    {getServerTypeDescription(serverType)}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="server-url"
                    className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
                  >
                    Server URL
                  </label>
                  <ComposedInput
                    id="server-url"
                    type="url"
                    value={serverUrl}
                    onChange={setServerUrl}
                    placeholder="https://caldav.example.com"
                    required
                    disabled={!!getPredefinedServerUrl(serverType)}
                    className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {serverType === 'generic' && (
                    <p className="mt-2 text-xs flex flex-row text-surface-500 dark:text-surface-400">
                      <Info className="inline w-3.5 h-3.5 mr-1 text-surface-400" />
                      The app will attempt to auto-discover for base URLs.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
                  >
                    Username
                  </label>
                  <ComposedInput
                    id="username"
                    type="text"
                    value={username}
                    onChange={setUsername}
                    placeholder="user@example.com"
                    required
                    className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
                  >
                    Password
                  </label>
                  <ComposedInput
                    id="password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder={account ? '(unchanged)' : 'Enter password'}
                    required={!account}
                    className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? '' : '-rotate-90'}`}
                    />
                    Advanced
                  </button>
                  {showAdvanced && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label
                          htmlFor="calendar-home-url"
                          className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
                        >
                          Calendar Home URL
                        </label>
                        <ComposedInput
                          id="calendar-home-url"
                          type="url"
                          value={calendarHomeUrl}
                          onChange={setCalendarHomeUrl}
                          placeholder="https://caldav.example.com/calendars/user/"
                          className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-none focus:border-primary-300 dark:focus:border-primary-400 focus:bg-white dark:focus:bg-primary-900/30 transition-colors"
                        />
                        <p className="mt-1.5 text-xs flex flex-row text-surface-500 dark:text-surface-400">
                          <Info className="inline w-3.5 h-3.5 mr-1 shrink-0 text-surface-400" />
                          Use this if auto-discovery is not possible.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                    {error}
                  </div>
                )}

                {testSuccess && (
                  <div className="p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                    <div>
                      <div className="font-medium">Connection verified!</div>
                      {testedCalendars.length > 0 && (
                        <div className="text-xs mt-0.5">
                          Found {testedCalendars.length}{' '}
                          {pluralize(testedCalendars.length, 'calendar')}.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!account && serverType === 'nextcloud' && (
                  <div className="pt-3 border-surface-200 dark:border-surface-700">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
                      <span className="text-xs text-surface-400 dark:text-surface-500">
                        Quick connect
                      </span>
                      <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNextcloudLogin(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                    >
                      <Cloud className="w-4 h-4" />
                      Use Nextcloud Login Flow
                    </button>
                    <p className="mt-2 text-xs text-center text-surface-500 dark:text-surface-400">
                      Automatically authenticate via browser
                    </p>
                  </div>
                )}

                {!account && serverType === 'rustical' && (
                  <div className="pt-3 border-surface-200 dark:border-surface-700">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
                      <span className="text-xs text-surface-400 dark:text-surface-500">
                        Quick connect
                      </span>
                      <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRusticalLogin(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                    >
                      <Cloud className="w-4 h-4" />
                      Use RustiCal Login Flow
                    </button>
                    <p className="mt-2 text-xs text-center text-surface-500 dark:text-surface-400">
                      Automatically authenticate via browser
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-3 p-4 pt-3 border-t border-surface-200 dark:border-surface-700 shrink-0">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={
                    isTesting ||
                    isLoading ||
                    testSuccess ||
                    !serverUrl.trim() ||
                    !username.trim() ||
                    (!password.trim() && !account?.password)
                  }
                  className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                >
                  {isTesting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {testSuccess && (
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  )}
                  {testSuccess ? 'Success' : isTesting ? 'Testing...' : 'Test connection'}
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      !name.trim() ||
                      !serverUrl.trim() ||
                      !username.trim() ||
                      (!account && !password.trim())
                    }
                    className="px-4 py-2 text-sm font-medium text-primary-contrast bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {account ? 'Save' : testSuccess ? 'Add Account' : 'Add Account'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </ModalBackdrop>
      )}
    </>
  );
};
