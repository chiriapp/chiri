import { useQueryClient } from '@tanstack/react-query';
import ArrowLeft from 'lucide-react/icons/arrow-left';
import CheckCircle from 'lucide-react/icons/check-circle';
import Cloud from 'lucide-react/icons/cloud';
import KeyRound from 'lucide-react/icons/key-round';
import { useRef, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { CredentialsForm } from '$components/modals/account/CredentialsForm';
import type {
  QuickConnectFlowHandle,
  QuickConnectLoginStep,
} from '$components/modals/account/QuickConnectFlow';
import { QuickConnectFlow } from '$components/modals/account/QuickConnectFlow';
import { ServerTypePicker } from '$components/modals/account/ServerTypePicker';
import { getPredefinedServerUrl, SERVER_TYPE_OPTIONS } from '$constants/settings';
import { useAddCalendar, useCreateAccount, useUpdateAccount } from '$hooks/queries/useAccounts';
import { useConfirmDialog } from '$hooks/store/useConfirmDialog';
import { CalDAVClient } from '$lib/caldav';
import { loggers } from '$lib/logger';
import { ensureTagExists } from '$lib/store/sync';
import { createTask } from '$lib/store/tasks';
import { isCertError, tauriRequest } from '$lib/tauri-http';
import type { Account, Calendar, ServerType } from '$types';
import { generateUUID, isVikunjaServer } from '$utils/misc';
import type { CalDAVConfig } from '$utils/mobileconfig';

const log = loggers.account;

type Step = 'pick-type' | 'connect-method' | 'quick-connect' | 'credentials';

const QUICK_CONNECT_SERVER_TYPES = new Set<ServerType>(['nextcloud', 'rustical']);

interface AccountModalProps {
  account: Account | null;
  onClose: () => void;
  preloadedConfig?: CalDAVConfig;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This modal owns a multi-step account setup flow whose branches share state and confirmation dialogs.
export const AccountModal = ({ account, onClose, preloadedConfig }: AccountModalProps) => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const addCalendarMutation = useAddCalendar();

  const hasInitialType = !!(account || preloadedConfig);
  const [step, setStep] = useState<Step>(hasInitialType ? 'credentials' : 'pick-type');

  const [name, setName] = useState(() => preloadedConfig?.accountName || account?.name || '');
  const [icon, setIcon] = useState(() => account?.icon || 'user');
  const [emoji, setEmoji] = useState(() => account?.emoji || '');
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
  const [principalUrl, setPrincipalUrl] = useState(() => account?.principalUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testedConnectionId, setTestedConnectionId] = useState<string | null>(null);
  const [testedCalendars, setTestedCalendars] = useState<Calendar[]>([]);
  const [error, setError] = useState('');
  const [quickConnectLoginStep, setQuickConnectLoginStep] =
    useState<QuickConnectLoginStep>('input');
  const [navDirection, setNavDirection] = useState<'forward' | 'back' | null>(null);
  const [quickConnectButtonState, setQuickConnectButtonState] = useState({
    disabled: true,
    loading: false,
  });
  const quickConnectRef = useRef<QuickConnectFlowHandle>(null);

  const [acceptInvalidCerts, setAcceptInvalidCerts] = useState(
    () => account?.acceptInvalidCerts ?? false,
  );

  // Reset test state when credentials change
  const [prevCredentials, setPrevCredentials] = useState({
    serverUrl,
    username,
    password,
    calendarHomeUrl,
    principalUrl,
  });
  if (
    serverUrl !== prevCredentials.serverUrl ||
    username !== prevCredentials.username ||
    password !== prevCredentials.password ||
    calendarHomeUrl !== prevCredentials.calendarHomeUrl ||
    principalUrl !== prevCredentials.principalUrl
  ) {
    setPrevCredentials({ serverUrl, username, password, calendarHomeUrl, principalUrl });
    setTestSuccess(false);
    setTestedConnectionId(null);
    setTestedCalendars([]);
  }

  const handleSelectServerType = (type: ServerType) => {
    setServerType(type);
    const predefined = getPredefinedServerUrl(type);
    if (predefined) {
      setServerUrl(predefined);
    } else {
      setServerUrl('');
    }
    setNavDirection('forward');
    setStep(QUICK_CONNECT_SERVER_TYPES.has(type) ? 'connect-method' : 'credentials');
  };

  const handleBack = () => {
    setError('');
    setTestSuccess(false);
    setTestedConnectionId(null);
    setTestedCalendars([]);
    setNavDirection('back');
    setStep(QUICK_CONNECT_SERVER_TYPES.has(serverType) ? 'connect-method' : 'pick-type');
  };

  const handleBackToTypePicker = () => {
    setError('');
    setNavDirection('back');
    setStep('pick-type');
  };

  const handleBackFromQuickConnect = () => {
    setQuickConnectLoginStep('input');
    setNavDirection('back');
    setStep('connect-method');
  };

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
            This app may not work reliably with Vikunja and you may even encounter data loss.
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

  const fetchTasksForCalendar = async (accountId: string, calendar: Calendar) => {
    try {
      const remoteTasks = await CalDAVClient.getForAccount(accountId).fetchTasks(calendar);

      if (!remoteTasks) {
        log.warn(`No tasks fetched from ${calendar.displayName}`);
        return;
      }

      log.info(`Fetched ${remoteTasks.length} tasks from ${calendar.displayName}`);

      for (const remoteTask of remoteTasks) {
        let tagIds: string[] = [];
        if (remoteTask.categoryId) {
          const categoryNames = remoteTask.categoryId
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          tagIds = categoryNames.map((name: string) => ensureTagExists(name));
        }

        createTask({
          ...remoteTask,
          tags: tagIds,
        });
      }
    } catch (error) {
      log.error(`Failed to fetch tasks for calendar ${calendar.displayName}:`, error);
    }
  };

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
            Do you want to proceed anyway?
          </p>
        </div>
      ),
      confirmLabel: 'Trust and connect',
      cancelLabel: 'Cancel',
      destructive: true,
    });
  };

  const connectWithCertHandling = async (accountId: string, effectivePassword: string) => {
    const tryConnect = (withInvalidCerts?: boolean) =>
      CalDAVClient.connect(
        accountId,
        serverUrl,
        username,
        effectivePassword,
        serverType,
        calendarHomeUrl.trim() || undefined,
        principalUrl.trim() || undefined,
        withInvalidCerts,
      );

    try {
      return await tryConnect(acceptInvalidCerts || undefined);
    } catch (err) {
      const looksLikeNetworkError =
        isCertError(err) ||
        (typeof err === 'string' && err.includes('error sending request for url'));

      if (!looksLikeNetworkError) throw err;

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

      if (isVikunjaServer(connectionInfo.calendarHome)) {
        const proceed = await showVikunjaWarning();

        if (!proceed) {
          CalDAVClient.disconnect(tempId);
          setIsTesting(false);
          return;
        }
      }

      log.debug(`Fetching calendars...`);
      const calendars = await CalDAVClient.getForAccount(tempId).fetchCalendars();
      log.info(`Connection test successful - found ${calendars.length} calendars`);

      setTestedConnectionId(tempId);
      setTestedCalendars(calendars);
      setTestSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to CalDAV server');
      log.error('Connection test failed:', err);
      setTestedConnectionId(null);
      setTestedCalendars([]);
    } finally {
      setIsTesting(false);
    }
  };

  const updateExistingAccount = async (effectivePassword: string | undefined) => {
    if (effectivePassword) {
      log.debug(`Testing connection to ${serverUrl}...`);
      const result = await connectWithCertHandling(account!.id, effectivePassword);
      if (!result) return false;
    }

    updateAccountMutation.mutate({
      id: account!.id,
      updates: {
        name,
        icon,
        emoji,
        serverUrl,
        username,
        password: effectivePassword || account!.password,
        serverType,
        calendarHomeUrl: calendarHomeUrl.trim() || undefined,
        principalUrl: principalUrl.trim() || undefined,
        acceptInvalidCerts: acceptInvalidCerts || undefined,
      },
    });

    return true;
  };

  const connectAndFetchCalendars = async (effectivePassword: string) => {
    if (testSuccess && testedConnectionId && testedCalendars.length > 0) {
      log.debug('Reusing tested connection...');
      return { tempId: testedConnectionId, calendars: testedCalendars };
    }

    const tempId = generateUUID();

    log.debug(`Connecting to ${serverUrl}...`);
    const connectionInfo = await connectWithCertHandling(tempId, effectivePassword);
    if (!connectionInfo) return null;

    if (isVikunjaServer(connectionInfo.calendarHome)) {
      const proceed = await showVikunjaWarning();

      if (!proceed) {
        CalDAVClient.disconnect(tempId);
        return null;
      }
    }

    log.debug(`Fetching calendars...`);
    const calendars = await CalDAVClient.getForAccount(tempId).fetchCalendars();
    log.info(`Found ${calendars.length} calendars:`, calendars);

    return { tempId, calendars };
  };

  const createNewAccount = async (effectivePassword: string) => {
    const accountSetup = await connectAndFetchCalendars(effectivePassword);
    if (!accountSetup) return false;

    const { tempId, calendars } = accountSetup;
    createAccountMutation.mutate(
      {
        id: tempId,
        name,
        icon,
        emoji,
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

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const effectivePassword = password || account?.password;

      if (account) {
        const didUpdate = await updateExistingAccount(effectivePassword);
        if (!didUpdate) setIsLoading(false);
      } else {
        if (!effectivePassword) {
          throw new Error('Password is required');
        }

        const didStartCreate = await createNewAccount(effectivePassword);
        if (!didStartCreate) setIsLoading(false);
        return;
      }

      onClose();
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to CalDAV server');
      log.error('Failed to connect:', err);
      setIsLoading(false);
    }
  };

  const serverTypeLabel =
    SERVER_TYPE_OPTIONS.find((o) => o.value === serverType)?.label ?? serverType;
  const modalTitle = account
    ? 'Edit Account'
    : step === 'pick-type'
      ? 'Add CalDAV Account'
      : serverType === 'generic'
        ? 'Add Generic CalDAV Account'
        : `Add ${serverTypeLabel} Account`;

  const modalDescription =
    step === 'pick-type' ? 'Choose your server type to get started.' : undefined;

  const isQuickConnectInProgress = step === 'quick-connect' && quickConnectLoginStep !== 'input';

  const backButton =
    !account && step !== 'pick-type' && !isQuickConnectInProgress ? (
      <ModalButton
        variant="secondary"
        onClick={
          step === 'credentials'
            ? handleBack
            : step === 'quick-connect'
              ? handleBackFromQuickConnect
              : handleBackToTypePicker
        }
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </ModalButton>
    ) : undefined;

  return (
    <ModalWrapper
      onClose={onClose}
      title={modalTitle}
      description={modalDescription}
      size={step === 'pick-type' ? 'xl' : 'md'}
      zIndex="z-60"
      contentPadding={false}
      preventClose={quickConnectLoginStep === 'processing'}
      footerLeft={backButton}
      footer={
        step === 'quick-connect' && quickConnectLoginStep === 'input' ? (
          <ModalButton
            onClick={() => quickConnectRef.current?.connect()}
            disabled={quickConnectButtonState.disabled}
            loading={quickConnectButtonState.loading}
          >
            Connect
          </ModalButton>
        ) : step === 'credentials' ? (
          <>
            <ModalButton
              variant="secondary"
              onClick={handleTestConnection}
              disabled={
                isTesting ||
                isLoading ||
                testSuccess ||
                !serverUrl.trim() ||
                !username.trim() ||
                (!password.trim() && !account?.password)
              }
              loading={isTesting}
            >
              {testSuccess && <CheckCircle className="w-4 h-4 text-semantic-success" />}
              {testSuccess ? 'Success' : isTesting ? 'Testing...' : 'Test connection'}
            </ModalButton>
            <ModalButton
              onClick={handleSubmit}
              disabled={
                isLoading ||
                !name.trim() ||
                !serverUrl.trim() ||
                !username.trim() ||
                (!account && !password.trim())
              }
              loading={isLoading}
            >
              {account ? 'Save' : 'Add Account'}
            </ModalButton>
          </>
        ) : undefined
      }
    >
      <div
        key={step}
        className={
          navDirection === 'forward'
            ? 'animate-step-forward'
            : navDirection === 'back'
              ? 'animate-step-back'
              : undefined
        }
      >
        {step === 'pick-type' && <ServerTypePicker onSelect={handleSelectServerType} />}

        {step === 'connect-method' && (
          <div className="p-4 space-y-3">
            <button
              type="button"
              onClick={() => {
                setNavDirection('forward');
                setStep('quick-connect');
              }}
              className="group w-full flex items-center gap-4 px-4 py-4 text-left rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700/50 hover:border-surface-300 dark:hover:border-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <div className="size-9 rounded-lg bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300 flex items-center justify-center shrink-0">
                <Cloud className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                  Login via server URL
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  Authenticate through your browser
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setNavDirection('forward');
                setStep('credentials');
              }}
              className="group w-full flex items-center gap-4 px-4 py-4 text-left rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-700/50 hover:border-surface-300 dark:hover:border-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <div className="size-9 rounded-lg bg-surface-200 dark:bg-surface-600 text-surface-600 dark:text-surface-300 flex items-center justify-center shrink-0">
                <KeyRound className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                  Manually add credentials
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  Enter your username and password
                </div>
              </div>
            </button>
          </div>
        )}

        {step === 'quick-connect' && (
          <QuickConnectFlow
            ref={quickConnectRef}
            serverType={serverType as 'nextcloud' | 'rustical'}
            onSuccess={onClose}
            onStepChange={setQuickConnectLoginStep}
            onConnectStateChange={setQuickConnectButtonState}
          />
        )}

        {step === 'credentials' && (
          <CredentialsForm
            serverType={serverType}
            name={name}
            onNameChange={setName}
            icon={icon}
            onIconChange={setIcon}
            emoji={emoji}
            onEmojiChange={setEmoji}
            serverUrl={serverUrl}
            onServerUrlChange={setServerUrl}
            username={username}
            onUsernameChange={setUsername}
            password={password}
            onPasswordChange={setPassword}
            principalUrl={principalUrl}
            onPrincipalUrlChange={setPrincipalUrl}
            calendarHomeUrl={calendarHomeUrl}
            onCalendarHomeUrlChange={setCalendarHomeUrl}
            account={account}
            error={error}
            testSuccess={testSuccess}
            testedCalendarCount={testedCalendars.length}
            testedPushSupportedCount={testedCalendars.filter((c) => c.pushSupported).length}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </ModalWrapper>
  );
};
