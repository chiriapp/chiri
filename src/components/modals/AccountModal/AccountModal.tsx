import { useRef, useState } from 'react';
import { ModalWrapper } from '$components/ModalWrapper';
import { AccountModalBody } from '$components/modals/AccountModal/AccountModalBody';
import { renderAccountModalFooter } from '$components/modals/AccountModal/AccountModalFooter';
import type { DisrootCloudBrowserLoginStepHandle } from '$components/modals/AccountModal/steps/DisrootCloudBrowserLoginStep';
import type { FastmailOAuthStepHandle } from '$components/modals/AccountModal/steps/FastmailOAuthStep';
import type {
  QuickConnectFlowStepHandle,
  QuickConnectLoginStep,
} from '$components/modals/AccountModal/steps/QuickConnectFlowStep';
import type {
  StalwartOAuthLoginStep,
  StalwartOAuthStepHandle,
} from '$components/modals/AccountModal/steps/StalwartOAuthStep';
import { SERVER_TYPE_OPTIONS } from '$constants/settings';
import { useConfirmDialog } from '$context/confirmDialogContext';
import { useSettingsStore } from '$context/settingsContext';
import { useAccountConnectionTest } from '$hooks/account/useAccountConnectionTest';
import { useAccountDraft } from '$hooks/account/useAccountDraft';
import { useAccountSetup } from '$hooks/account/useAccountSetup';
import type { Account, ServerType } from '$types/account';
import type { MobileConfigImportSelection } from '$types/mobileconfig/import';

const QUICK_CONNECT_SERVER_TYPES: Partial<Record<ServerType, true>> = {
  nextcloud: true,
  rustical: true,
};
const OAUTH_SERVER_TYPES: Partial<Record<ServerType, true>> = {
  fastmail: true,
  stalwart: true,
};
const BROWSER_LOGIN_SERVER_TYPES: Partial<Record<ServerType, true>> = {
  disrootCloud: true,
};

/** all server types that go through the connect-method chooser step */
const CONNECT_METHOD_SERVER_TYPES: Partial<Record<ServerType, true>> = {
  ...QUICK_CONNECT_SERVER_TYPES,
  ...OAUTH_SERVER_TYPES,
  ...BROWSER_LOGIN_SERVER_TYPES,
};

export type AccountModalStep =
  | 'pick-type'
  | 'connect-method'
  | 'quick-connect'
  | 'credentials'
  | 'fastmail-oauth'
  | 'stalwart-oauth'
  | 'disrootCloud-browser';

interface AccountModalProps {
  account: Account | null;
  reauthorize?: boolean;
  onClose: () => void;
  onBackToConfigProfileChooser?: () => void;
  preloadedConfig?: MobileConfigImportSelection;
  zIndex?: 'z-60' | 'z-70';
}

export const AccountModal = ({
  account,
  reauthorize = false,
  onClose,
  onBackToConfigProfileChooser,
  preloadedConfig,
  zIndex = 'z-60',
}: AccountModalProps) => {
  const { confirm } = useConfirmDialog();
  const hasInitialType = !!(account || preloadedConfig);
  const [step, setStep] = useState<AccountModalStep>(
    reauthorize && account?.caldav?.serverType === 'fastmail'
      ? 'fastmail-oauth'
      : hasInitialType
        ? 'credentials'
        : 'pick-type',
  );
  const { draft, updateDraft, setDraftField, selectServerType, hasChanges } = useAccountDraft({
    account,
    preloadedConfig,
  });
  const [quickConnectLoginStep, setQuickConnectLoginStep] =
    useState<QuickConnectLoginStep>('input');
  const [stalwartOAuthLoginStep, setStalwartOAuthLoginStep] =
    useState<StalwartOAuthLoginStep>('input');
  const [fastmailOAuthSetupInProgress, setFastmailOAuthSetupInProgress] = useState(false);
  const [disrootCloudBrowserSetupInProgress, setDisrootCloudBrowserSetupInProgress] =
    useState(false);
  const [navDirection, setNavDirection] = useState<'forward' | 'back' | null>(null);
  const { enforceVapid } = useSettingsStore();
  const [quickConnectButtonState, setQuickConnectButtonState] = useState({
    disabled: true,
    loading: false,
  });
  const [stalwartOAuthButtonState, setStalwartOAuthButtonState] = useState({
    disabled: true,
    loading: false,
  });
  const [fastmailOAuthButtonState, setFastmailOAuthButtonState] = useState({
    disabled: false,
    loading: false,
  });
  const [disrootCloudButtonState, setDisrootCloudButtonState] = useState({
    disabled: false,
    loading: false,
  });
  const quickConnectRef = useRef<QuickConnectFlowStepHandle>(null);
  const fastmailRef = useRef<FastmailOAuthStepHandle>(null);
  const stalwartOAuthRef = useRef<StalwartOAuthStepHandle>(null);
  const disrootRef = useRef<DisrootCloudBrowserLoginStepHandle>(null);

  const {
    isTesting,
    testSuccess,
    testConnectionId,
    testedCalendars,
    setupError,
    setupNotice,
    setSetupError,
    setSetupNotice,
    testingAccountIds,
    cancelTestConnection,
    testConnection: handleTestConnection,
    connectWithCertHandling,
    validateServerUrlScheme,
    validatePrincipalUrl,
    confirmServerWarning,
    confirmServerUrlWarning,
  } = useAccountConnectionTest({
    account,
    draft,
    enforceVapid,
    updateDraft,
    confirm,
  });

  const { isLoading, handleSubmit } = useAccountSetup({
    account,
    draft,
    enforceVapid,
    testSuccess,
    testConnectionId,
    testedCalendars,
    connectWithCertHandling,
    validateServerUrlScheme,
    validatePrincipalUrl,
    confirmServerWarning,
    confirmServerUrlWarning,
    setSetupError,
    setSetupNotice,
    cancelTestConnection,
    onClose,
  });

  const handleSelectServerType = (serverType: ServerType) => {
    selectServerType(serverType);
    setSetupError(null);
    cancelTestConnection();
    setNavDirection('forward');
    setStep(CONNECT_METHOD_SERVER_TYPES[serverType] ? 'connect-method' : 'credentials');
  };

  const handleBack = () => {
    setSetupError(null);
    cancelTestConnection();
    setNavDirection('back');
    // credentials back-destination: connect-method for types that go through it, otherwise pick-type
    setStep(CONNECT_METHOD_SERVER_TYPES[draft.serverType] ? 'connect-method' : 'pick-type');
  };

  const handleSelectBrowserLogin = () => {
    setNavDirection('forward');
    if (draft.serverType === 'fastmail') {
      setStep('fastmail-oauth');
    } else if (draft.serverType === 'stalwart') {
      setStep('stalwart-oauth');
    } else if (BROWSER_LOGIN_SERVER_TYPES[draft.serverType]) {
      setStep('disrootCloud-browser');
    } else {
      setStep('quick-connect');
    }
  };

  const handleSelectCredentials = () => {
    setNavDirection('forward');
    setStep('credentials');
  };

  const handleBackFromOAuth = () => {
    if (step === 'fastmail-oauth') {
      const phase = fastmailRef.current?.getPhase();
      if (phase !== 'idle') {
        fastmailRef.current?.cancel();
        setFastmailOAuthSetupInProgress(false);
        setNavDirection('back');
        return;
      }
      fastmailRef.current?.cancel();
      setFastmailOAuthSetupInProgress(false);
    } else if (step === 'stalwart-oauth') {
      const phase = stalwartOAuthRef.current?.getPhase();
      if (phase !== 'idle') {
        stalwartOAuthRef.current?.cancel();
        setStalwartOAuthLoginStep('input');
        setNavDirection('back');
        return;
      }
      stalwartOAuthRef.current?.cancel();
      setStalwartOAuthLoginStep('input');
    }
    setNavDirection('back');
    setStep('connect-method');
  };

  const handleBackFromDisrootCloudBrowser = () => {
    const phase = disrootRef.current?.getPhase();
    if (phase !== 'idle') {
      disrootRef.current?.cancel();
      setDisrootCloudBrowserSetupInProgress(false);
      setNavDirection('back');
      return;
    }
    disrootRef.current?.cancel();
    setDisrootCloudBrowserSetupInProgress(false);
    setNavDirection('back');
    setStep('connect-method');
  };

  const handleBackToTypePicker = () => {
    setSetupError(null);
    cancelTestConnection();
    setNavDirection('back');
    setStep('pick-type');
  };

  const handleBackFromQuickConnect = () => {
    if (quickConnectLoginStep !== 'input') {
      quickConnectRef.current?.cancel();
      setQuickConnectLoginStep('input');
      setNavDirection('back');
      return;
    }
    quickConnectRef.current?.cancel();
    setQuickConnectLoginStep('input');
    setNavDirection('back');
    setStep('connect-method');
  };

  const handleBackAction = () => {
    if (step === 'credentials' && onBackToConfigProfileChooser) {
      onBackToConfigProfileChooser();
    } else if (step === 'credentials') {
      handleBack();
    } else if (step === 'quick-connect') {
      handleBackFromQuickConnect();
    } else if (step === 'fastmail-oauth' || step === 'stalwart-oauth') {
      handleBackFromOAuth();
    } else if (step === 'disrootCloud-browser') {
      handleBackFromDisrootCloudBrowser();
    } else {
      handleBackToTypePicker();
    }
  };

  const handleClose = () => {
    quickConnectRef.current?.cancel();
    fastmailRef.current?.cancel();
    stalwartOAuthRef.current?.cancel();
    disrootRef.current?.cancel();
    cancelTestConnection();
    onClose();
  };

  const serverTypeLabel =
    SERVER_TYPE_OPTIONS.find((option) => option.value === draft.serverType)?.label ??
    draft.serverType;
  const modalTitle =
    reauthorize && account?.caldav?.serverType === 'fastmail'
      ? 'Reconnect Fastmail'
      : account
        ? 'Edit Account'
        : step === 'pick-type'
          ? 'Add CalDAV Account'
          : draft.serverType === 'generic'
            ? 'Add a CalDAV Account'
            : `Add ${serverTypeLabel} Account`;
  const modalDescription =
    step === 'pick-type' ? 'Choose your server type to get started.' : undefined;
  const isProcessing =
    (step === 'quick-connect' && quickConnectLoginStep === 'processing') ||
    fastmailOAuthSetupInProgress ||
    stalwartOAuthLoginStep === 'processing' ||
    disrootCloudBrowserSetupInProgress;
  const stepAnimationClass =
    navDirection === 'forward'
      ? 'motion-safe:animate-step-forward'
      : navDirection === 'back'
        ? 'motion-safe:animate-step-back'
        : '';
  const isAccountTestInProgress = account ? account.id in testingAccountIds : false;

  const browserLoginDescription =
    draft.serverType === 'stalwart' || QUICK_CONNECT_SERVER_TYPES[draft.serverType]
      ? `Enter your ${serverTypeLabel} server URL to get started`
      : `Sign in to your ${serverTypeLabel} account`;
  const credentialsDescription =
    draft.serverType === 'stalwart' ||
    OAUTH_SERVER_TYPES[draft.serverType] ||
    BROWSER_LOGIN_SERVER_TYPES[draft.serverType]
      ? 'Enter your username and app password'
      : 'Enter your username and password';

  const footerProps = {
    account,
    draft,
    isLoading,
    isProcessing,
    isTesting,
    isAccountTestInProgress,
    testSuccess,
    hasChanges,
    quickConnectLoginStep,
    quickConnectButtonState,
    onQuickConnect: () => {
      quickConnectRef.current?.connect();
    },
    stalwartOAuthLoginStep,
    stalwartOAuthButtonState,
    onStalwartConnect: () => {
      stalwartOAuthRef.current?.connect();
    },
    fastmailOAuthButtonState,
    onFastmailConnect: () => {
      fastmailRef.current?.connect();
    },
    disrootCloudButtonState,
    onDisrootConnect: () => {
      disrootRef.current?.connect();
    },
    onTestConnection: handleTestConnection,
    onSubmit: handleSubmit,
    onClose: handleClose,
    onBack: handleBackAction,
  };

  return (
    <ModalWrapper
      onClose={handleClose}
      title={modalTitle}
      description={modalDescription}
      size={step === 'pick-type' ? 'xl' : 'md'}
      zIndex={zIndex}
      contentPadding={false}
      contentOverflow="auto"
      preventClose={false}
      footerLeft={renderAccountModalFooter({ placement: 'left', step, ...footerProps })}
      footer={renderAccountModalFooter({ placement: 'main', step, ...footerProps })}
    >
      <AccountModalBody
        step={step}
        stepAnimationClass={stepAnimationClass}
        draft={draft}
        account={account}
        preloadedConfig={preloadedConfig}
        setupError={setupError}
        setupNotice={setupNotice}
        testSuccess={testSuccess}
        testedCalendars={testedCalendars}
        onSubmit={handleSubmit}
        onDraftFieldChange={setDraftField}
        onSelectServerType={handleSelectServerType}
        onSelectBrowserLogin={handleSelectBrowserLogin}
        onSelectCredentials={handleSelectCredentials}
        browserLoginDescription={browserLoginDescription}
        credentialsDescription={credentialsDescription}
        quickConnectRef={quickConnectRef}
        onQuickConnectSuccess={onClose}
        onQuickConnectStepChange={setQuickConnectLoginStep}
        onQuickConnectStateChange={setQuickConnectButtonState}
        fastmailRef={fastmailRef}
        onFastmailSuccess={onClose}
        onFastmailSetupInProgressChange={setFastmailOAuthSetupInProgress}
        onFastmailStateChange={setFastmailOAuthButtonState}
        stalwartOAuthRef={stalwartOAuthRef}
        onStalwartSuccess={onClose}
        onStalwartStepChange={setStalwartOAuthLoginStep}
        onStalwartStateChange={setStalwartOAuthButtonState}
        disrootRef={disrootRef}
        onDisrootSuccess={onClose}
        onDisrootSetupInProgressChange={setDisrootCloudBrowserSetupInProgress}
        onDisrootStateChange={setDisrootCloudButtonState}
      />
    </ModalWrapper>
  );
};
