import { useQueryClient } from '@tanstack/react-query';
import ArrowLeft from 'lucide-react/icons/arrow-left';
import CheckCircle from 'lucide-react/icons/check-circle';
import Cloud from 'lucide-react/icons/cloud';
import KeyRound from 'lucide-react/icons/key-round';
import { type SyntheticEvent, useRef, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { CredentialsForm } from '$components/modals/AccountModal/CredentialsForm';
import { FastmailOAuthStep } from '$components/modals/AccountModal/FastmailOAuthStep';
import type {
  QuickConnectFlowHandle,
  QuickConnectLoginStep,
} from '$components/modals/AccountModal/QuickConnectFlow';
import { QuickConnectFlow } from '$components/modals/AccountModal/QuickConnectFlow';
import { ServerTypePicker } from '$components/modals/AccountModal/ServerTypePicker';
import { MobileConfigSignatureWarning } from '$components/modals/MobileConfigSignatureWarning';
import { getPredefinedServerUrl, SERVER_TYPE_OPTIONS } from '$constants/settings';
import { useConfirmDialog } from '$context/confirmDialogContext';
import { useAddCalendar, useCreateAccount, useUpdateAccount } from '$hooks/queries/useAccounts';
import { CalDAVClient } from '$lib/caldav';
import {
  type CalDAVSetupError,
  type CalDAVSetupNotice,
  getSetupErrorInfo,
  getSetupNotice,
  probeSetupVtodoCreationIfNeeded,
} from '$lib/caldav/setup';
import { hasHttpUrlScheme, isValidPrincipalUrlOverride } from '$lib/caldav/utils';
import { getServerWarning, getUrlWarning, toConfirmOptions } from '$lib/caldav/warnings';
import { loggers } from '$lib/logger';
import { ensureTagExists } from '$lib/store/sync';
import { createTask } from '$lib/store/tasks';
import { isCertError, tauriRequest } from '$lib/tauriHttp';
import type { Account, Calendar, ServerType } from '$types';
import type { MobileConfigImportSelection } from '$types/mobileconfig';
import { generateUUID } from '$utils/misc';

const log = loggers.account;

type Step = 'pick-type' | 'connect-method' | 'quick-connect' | 'credentials' | 'fastmail-oauth';

const QUICK_CONNECT_SERVER_TYPES = new Set<ServerType>(['nextcloud', 'rustical']);
const OAUTH_SERVER_TYPES = new Set<ServerType>(['fastmail']);
/** all server types that go through the connect-method chooser step */
const CONNECT_METHOD_SERVER_TYPES = new Set<ServerType>([
  ...QUICK_CONNECT_SERVER_TYPES,
  ...OAUTH_SERVER_TYPES,
]);

interface AccountModalProps {
  account: Account | null;
  onClose: () => void;
  onBackToConfigProfileChooser?: () => void;
  preloadedConfig?: MobileConfigImportSelection;
  zIndex?: 'z-60' | 'z-70';
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This modal owns a multi-step account setup flow whose branches share state and confirmation dialogs
export function AccountModal({
  account,
  onClose,
  onBackToConfigProfileChooser,
  preloadedConfig,
  zIndex = 'z-60',
}: AccountModalProps) {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const addCalendarMutation = useAddCalendar();
  const preloadedSettings = preloadedConfig?.settings;

  const hasInitialType = !!(account || preloadedConfig);
  const [step, setStep] = useState<Step>(hasInitialType ? 'credentials' : 'pick-type');

  const [name, setName] = useState(() => preloadedSettings?.accountName || account?.name || '');
  const [icon, setIcon] = useState(() => account?.icon || 'user');
  const [emoji, setEmoji] = useState(() => account?.emoji || '');
  const [serverUrl, setServerUrl] = useState(
    () => preloadedSettings?.serverUrl || account?.caldav?.serverUrl || '',
  );
  const [username, setUsername] = useState(
    () => preloadedSettings?.username || account?.caldav?.username || '',
  );
  const [password, setPassword] = useState(() => preloadedSettings?.password || '');
  const [serverType, setServerType] = useState<ServerType>(
    () => preloadedSettings?.serverType || account?.caldav?.serverType || 'generic',
  );
  const [calendarHomeUrl, setCalendarHomeUrl] = useState(
    () => account?.caldav?.calendarHomeUrl || '',
  );
  const [principalUrl, setPrincipalUrl] = useState(
    () => preloadedSettings?.principalUrl || account?.caldav?.principalUrl || '',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testedConnectionId, setTestedConnectionId] = useState<string | null>(null);
  const [testedCalendars, setTestedCalendars] = useState<Calendar[]>([]);
  const [setupError, setSetupError] = useState<CalDAVSetupError | null>(null);
  const [setupNotice, setSetupNotice] = useState<CalDAVSetupNotice | null>(null);
  const [quickConnectLoginStep, setQuickConnectLoginStep] =
    useState<QuickConnectLoginStep>('input');
  const [fastmailOAuthSetupInProgress, setFastmailOAuthSetupInProgress] = useState(false);
  const [navDirection, setNavDirection] = useState<'forward' | 'back' | null>(null);
  const [quickConnectButtonState, setQuickConnectButtonState] = useState({
    disabled: true,
    loading: false,
  });
  const quickConnectRef = useRef<QuickConnectFlowHandle>(null);

  const [acceptInvalidCerts, setAcceptInvalidCerts] = useState(
    () => account?.caldav?.acceptInvalidCerts ?? false,
  );

  // reset test state when credentials change
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
    setSetupNotice(null);
  }

  const handleSelectServerType = (type: ServerType) => {
    setServerType(type);
    setName('');
    setIcon('user');
    setEmoji('');
    setServerUrl(getPredefinedServerUrl(type) ?? '');
    setUsername('');
    setPassword('');
    setCalendarHomeUrl('');
    setPrincipalUrl('');
    setSetupError(null);
    setSetupNotice(null);
    setTestSuccess(false);
    setTestedConnectionId(null);
    setTestedCalendars([]);
    setAcceptInvalidCerts(false);
    setNavDirection('forward');
    setStep(CONNECT_METHOD_SERVER_TYPES.has(type) ? 'connect-method' : 'credentials');
  };

  const handleBack = () => {
    setSetupError(null);
    setSetupNotice(null);
    setTestSuccess(false);
    setTestedConnectionId(null);
    setTestedCalendars([]);
    setNavDirection('back');
    // credentials back-destination: connect-method for types that go through it, otherwise pick-type
    setStep(CONNECT_METHOD_SERVER_TYPES.has(serverType) ? 'connect-method' : 'pick-type');
  };

  const handleBackFromOAuth = () => {
    setFastmailOAuthSetupInProgress(false);
    setNavDirection('back');
    setStep('connect-method');
  };

  const handleBackToTypePicker = () => {
    setSetupError(null);
    setSetupNotice(null);
    setNavDirection('back');
    setStep('pick-type');
  };

  const handleBackFromQuickConnect = () => {
    setQuickConnectLoginStep('input');
    setNavDirection('back');
    setStep('connect-method');
  };

  const confirmServerWarning = async (calendarHome?: string) => {
    const warning = getServerWarning(serverType, { calendarHome });
    if (!warning) return true;

    return await confirm(toConfirmOptions(warning));
  };

  const validateServerUrlScheme = () => {
    if (hasHttpUrlScheme(serverUrl)) return true;

    setSetupError({
      title: 'URL scheme required',
      message: 'Server URL must start with http:// or https://.',
      hint: 'Add the scheme explicitly, for example https://caldav.example.com.',
    });
    return false;
  };

  const validatePrincipalUrl = (baseUrl: string) => {
    if (isValidPrincipalUrlOverride(principalUrl, baseUrl)) return true;

    setSetupError({
      title: 'Invalid principal URL',
      message: 'Principal URL must be an HTTP(S) URL or a server-relative path.',
      hint: 'Use a path like /principals/alice/ or a full URL like https://caldav.example.com/principals/alice/.',
    });
    return false;
  };

  const confirmServerUrlWarning = async (url: string) => {
    const warning = getUrlWarning(url);
    if (!warning) return true;

    return await confirm(toConfirmOptions(warning));
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

  const connectWithCertHandling = async (
    accountId: string,
    effectivePassword: string,
    trimmedServerUrl: string,
  ) => {
    const isOAuth = account?.caldav?.authType === 'oauth';
    const tryConnect = (withInvalidCerts?: boolean) =>
      CalDAVClient.connect(
        accountId,
        trimmedServerUrl,
        username,
        isOAuth ? '' : effectivePassword,
        serverType,
        calendarHomeUrl.trim() || undefined,
        principalUrl.trim() || undefined,
        withInvalidCerts,
        isOAuth ? effectivePassword : undefined,
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
        await tauriRequest(trimmedServerUrl, 'OPTIONS', {
          username,
          password: effectivePassword,
          acceptInvalidCerts: true,
        });
        serverReachable = true;
      } catch {
        // also failed with bypass - genuinely unreachable
      }

      if (!serverReachable) throw err;

      const proceed = await showCertTrustDialog();
      if (!proceed) return null;

      setAcceptInvalidCerts(true);
      return await tryConnect(true);
    }
  };

  const handleTestConnection = async () => {
    setSetupError(null);
    setSetupNotice(null);
    setTestSuccess(false);
    setTestedConnectionId(null);
    setTestedCalendars([]);
    setIsTesting(true);

    try {
      const effectivePassword = password || account?.caldav?.password;

      if (!effectivePassword) {
        throw new Error(
          account?.caldav?.authType === 'oauth'
            ? 'Access token missing, try reconnecting via OAuth'
            : 'Password is required to test connection',
        );
      }

      if (!serverUrl.trim() || !username.trim()) {
        throw new Error('Server URL and username are required');
      }

      if (!validateServerUrlScheme()) {
        setIsTesting(false);
        return;
      }

      const trimmedServerUrl = serverUrl.trim();
      if (!validatePrincipalUrl(trimmedServerUrl)) {
        setIsTesting(false);
        return;
      }

      const proceedWithUrl = await confirmServerUrlWarning(trimmedServerUrl);
      if (!proceedWithUrl) {
        setIsTesting(false);
        return;
      }

      const tempId = generateUUID();
      log.debug(`Testing connection to ${trimmedServerUrl}...`);

      const connectionInfo = await connectWithCertHandling(
        tempId,
        effectivePassword,
        trimmedServerUrl,
      );
      if (!connectionInfo) {
        setIsTesting(false);
        return;
      }

      const proceed = await confirmServerWarning(connectionInfo.calendarHome);

      if (!proceed) {
        CalDAVClient.disconnect(tempId);
        setIsTesting(false);
        return;
      }

      log.debug(`Fetching calendars...`);
      const client = CalDAVClient.getForAccount(tempId);
      const { calendars, diagnostics } = await client.discoverCalendars();
      const canCreateVtodoCalendar = await probeSetupVtodoCreationIfNeeded(client, diagnostics);
      log.info(`Connection test successful - found ${calendars.length} calendars`);

      setTestedConnectionId(tempId);
      setTestedCalendars(calendars);
      setSetupNotice(getSetupNotice(diagnostics, canCreateVtodoCalendar));
      setTestSuccess(true);
    } catch (err) {
      setSetupError(
        getSetupErrorInfo(err, 'Failed to test CalDAV connection', serverType, serverUrl),
      );
      log.error('Connection test failed:', err);
      setTestedConnectionId(null);
      setTestedCalendars([]);
      setSetupNotice(null);
    } finally {
      setIsTesting(false);
    }
  };

  const updateExistingAccount = async (effectivePassword: string | undefined) => {
    if (!validateServerUrlScheme()) return false;
    const trimmedServerUrl = serverUrl.trim();
    if (!validatePrincipalUrl(trimmedServerUrl)) return false;

    if (effectivePassword) {
      log.debug(`Testing connection to ${trimmedServerUrl}...`);
      const result = await connectWithCertHandling(
        account!.id,
        effectivePassword,
        trimmedServerUrl,
      );
      if (!result) return false;
    }

    updateAccountMutation.mutate({
      id: account!.id,
      updates: {
        name,
        icon,
        emoji,
        caldav: {
          serverUrl: trimmedServerUrl,
          username,
          password: effectivePassword || account!.caldav!.password,
          serverType,
          calendarHomeUrl: calendarHomeUrl.trim() || undefined,
          principalUrl: principalUrl.trim() || undefined,
          acceptInvalidCerts: acceptInvalidCerts || undefined,
          authType: account!.caldav!.authType,
          refreshToken: account!.caldav!.refreshToken,
          tokenExpiry: account!.caldav!.tokenExpiry,
        },
      },
    });

    return true;
  };

  const connectAndFetchCalendars = async (effectivePassword: string) => {
    if (!validateServerUrlScheme()) return null;
    const trimmedServerUrl = serverUrl.trim();
    if (!validatePrincipalUrl(trimmedServerUrl)) return null;

    if (testSuccess && testedConnectionId) {
      log.debug('Reusing tested connection...');
      return {
        tempId: testedConnectionId,
        calendars: testedCalendars,
        serverUrl: trimmedServerUrl,
      };
    }

    const tempId = generateUUID();

    log.debug(`Connecting to ${trimmedServerUrl}...`);
    const proceedWithUrl = await confirmServerUrlWarning(trimmedServerUrl);
    if (!proceedWithUrl) return null;

    const connectionInfo = await connectWithCertHandling(
      tempId,
      effectivePassword,
      trimmedServerUrl,
    );
    if (!connectionInfo) return null;

    const proceed = await confirmServerWarning(connectionInfo.calendarHome);

    if (!proceed) {
      CalDAVClient.disconnect(tempId);
      return null;
    }

    log.debug(`Fetching calendars...`);
    const client = CalDAVClient.getForAccount(tempId);
    const { calendars, diagnostics } = await client.discoverCalendars();
    const canCreateVtodoCalendar = await probeSetupVtodoCreationIfNeeded(client, diagnostics);
    log.info(`Found ${calendars.length} calendars:`, calendars);
    setSetupNotice(getSetupNotice(diagnostics, canCreateVtodoCalendar));

    return { tempId, calendars, serverUrl: trimmedServerUrl };
  };

  const createNewAccount = async (effectivePassword: string) => {
    const accountSetup = await connectAndFetchCalendars(effectivePassword);
    if (!accountSetup) return false;

    const { tempId, calendars, serverUrl: trimmedServerUrl } = accountSetup;
    createAccountMutation.mutate(
      {
        id: tempId,
        name,
        icon,
        emoji,
        caldav: {
          serverUrl: trimmedServerUrl,
          username,
          password: effectivePassword,
          serverType,
          calendarHomeUrl: calendarHomeUrl.trim() || undefined,
          principalUrl: principalUrl.trim() || undefined,
          acceptInvalidCerts: acceptInvalidCerts || undefined,
          authType: 'basic',
        },
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
          setSetupError(
            getSetupErrorInfo(error, 'Failed to create account', serverType, serverUrl),
          );
          setIsLoading(false);
        },
      },
    );

    return true;
  };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    setSetupError(null);
    setSetupNotice(null);
    setIsLoading(true);

    try {
      const effectivePassword = password || account?.caldav?.password;

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
      setSetupError(
        getSetupErrorInfo(err, 'Failed to connect to CalDAV server', serverType, serverUrl),
      );
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
        ? 'Add a CalDAV Account'
        : `Add ${serverTypeLabel} Account`;

  const modalDescription =
    step === 'pick-type' ? 'Choose your server type to get started.' : undefined;

  const isQuickConnectInProgress = step === 'quick-connect' && quickConnectLoginStep !== 'input';
  const preventClose = isQuickConnectInProgress || fastmailOAuthSetupInProgress;
  const stepAnimationClass =
    navDirection === 'forward'
      ? 'animate-step-forward'
      : navDirection === 'back'
        ? 'animate-step-back'
        : '';

  const backButton =
    !account && step !== 'pick-type' && !preventClose ? (
      <ModalButton
        variant="secondary"
        onClick={
          step === 'credentials' && onBackToConfigProfileChooser
            ? onBackToConfigProfileChooser
            : step === 'credentials'
              ? handleBack
              : step === 'quick-connect'
                ? handleBackFromQuickConnect
                : step === 'fastmail-oauth'
                  ? handleBackFromOAuth
                  : handleBackToTypePicker // connect-method goes back to pick-type
        }
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </ModalButton>
    ) : undefined;

  return (
    <ModalWrapper
      onClose={onClose}
      title={modalTitle}
      description={modalDescription}
      size={step === 'pick-type' ? 'xl' : 'md'}
      zIndex={zIndex}
      contentPadding={false}
      contentOverflow="auto"
      preventClose={preventClose}
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
                (!password.trim() && !account?.caldav?.password)
              }
              loading={isTesting}
            >
              {testSuccess && <CheckCircle className="h-4 w-4 text-semantic-success" />}
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
      <div key={step} className={stepAnimationClass}>
        {step === 'pick-type' && <ServerTypePicker onSelect={handleSelectServerType} />}

        {step === 'connect-method' && (
          <div className="space-y-3 p-4">
            <button
              type="button"
              onClick={() => {
                setNavDirection('forward');
                setStep(OAUTH_SERVER_TYPES.has(serverType) ? 'fastmail-oauth' : 'quick-connect');
              }}
              className="group flex w-full items-center gap-4 rounded-xl border border-surface-200 bg-surface-50 px-4 py-4 text-left outline-none transition-colors hover:border-surface-300 hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-700/50 dark:hover:border-surface-500 dark:hover:bg-surface-700"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-200 text-surface-600 dark:bg-surface-600 dark:text-surface-300">
                <Cloud className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-surface-800 dark:text-surface-200">
                  {OAUTH_SERVER_TYPES.has(serverType)
                    ? 'Log in with OAuth'
                    : 'Login via server URL'}
                </div>
                <div className="mt-0.5 text-surface-500 text-xs dark:text-surface-400">
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
              className="group flex w-full items-center gap-4 rounded-xl border border-surface-200 bg-surface-50 px-4 py-4 text-left outline-none transition-colors hover:border-surface-300 hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-700/50 dark:hover:border-surface-500 dark:hover:bg-surface-700"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-200 text-surface-600 dark:bg-surface-600 dark:text-surface-300">
                <KeyRound className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-surface-800 dark:text-surface-200">
                  Manually add credentials
                </div>
                <div className="mt-0.5 text-surface-500 text-xs dark:text-surface-400">
                  {OAUTH_SERVER_TYPES.has(serverType)
                    ? 'Enter your username and app password'
                    : 'Enter your username and password'}
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

        {step === 'fastmail-oauth' && (
          <FastmailOAuthStep
            onSuccess={onClose}
            onSetupInProgressChange={setFastmailOAuthSetupInProgress}
          />
        )}

        {step === 'credentials' && (
          <div>
            {preloadedConfig?.signature === 'signed-unverified' && (
              <div className="px-4 pt-4">
                <MobileConfigSignatureWarning signature={preloadedConfig.signature} />
              </div>
            )}
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
              error={setupError}
              setupNotice={setupNotice}
              testSuccess={testSuccess}
              testedCalendarCount={testedCalendars.length}
              testedPushSupportedCount={testedCalendars.filter((c) => c.pushSupported).length}
              onSubmit={handleSubmit}
            />
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}
