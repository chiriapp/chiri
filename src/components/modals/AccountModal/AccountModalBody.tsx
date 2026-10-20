import Cloud from 'lucide-react/icons/cloud';
import KeyRound from 'lucide-react/icons/key-round';
import type { RefObject, SubmitEvent } from 'react';
import type { AccountModalStep } from '$components/modals/AccountModal/AccountModal';
import { CredentialsFormStep } from '$components/modals/AccountModal/steps/CredentialsFormStep';
import {
  DisrootCloudBrowserLoginStep,
  type DisrootCloudBrowserLoginStepHandle,
} from '$components/modals/AccountModal/steps/DisrootCloudBrowserLoginStep';
import {
  FastmailOAuthStep,
  type FastmailOAuthStepHandle,
} from '$components/modals/AccountModal/steps/FastmailOAuthStep';
import {
  QuickConnectFlowStep,
  type QuickConnectFlowStepHandle,
  type QuickConnectLoginStep,
} from '$components/modals/AccountModal/steps/QuickConnectFlowStep';
import { ServerTypePickerStep } from '$components/modals/AccountModal/steps/ServerTypePickerStep';
import {
  type StalwartOAuthLoginStep,
  StalwartOAuthStep,
  type StalwartOAuthStepHandle,
} from '$components/modals/AccountModal/steps/StalwartOAuthStep';
import { MobileConfigImportSkippedWarning } from '$components/modals/MobileConfigImportSkippedWarning';
import { MobileConfigSignatureWarning } from '$components/modals/MobileConfigSignatureWarning';
import type { CalDAVSetupError, CalDAVSetupNotice } from '$lib/caldav/setup';
import type { Account, AccountDraft, ServerType } from '$types/account';
import type { Calendar } from '$types/calendar';
import type { MobileConfigImportSelection } from '$types/mobileconfig/import';

interface AccountModalBodyProps {
  step: AccountModalStep;
  stepAnimationClass: string;
  draft: AccountDraft;
  account: Account | null;
  preloadedConfig?: MobileConfigImportSelection;
  setupError: CalDAVSetupError | null;
  setupNotice: CalDAVSetupNotice | null;
  testSuccess: boolean;
  testedCalendars: Calendar[];
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onDraftFieldChange: <K extends keyof AccountDraft>(field: K, value: AccountDraft[K]) => void;
  onSelectServerType: (serverType: ServerType) => void;
  onSelectBrowserLogin: () => void;
  onSelectCredentials: () => void;
  browserLoginDescription: string;
  credentialsDescription: string;
  quickConnectRef: RefObject<QuickConnectFlowStepHandle | null>;
  onQuickConnectSuccess: () => void;
  onQuickConnectStepChange: (step: QuickConnectLoginStep) => void;
  onQuickConnectStateChange: (state: { disabled: boolean; loading: boolean }) => void;
  fastmailRef: RefObject<FastmailOAuthStepHandle | null>;
  onFastmailSuccess: () => void;
  onFastmailSetupInProgressChange: (inProgress: boolean) => void;
  onFastmailStateChange: (state: { disabled: boolean; loading: boolean }) => void;
  stalwartOAuthRef: RefObject<StalwartOAuthStepHandle | null>;
  onStalwartSuccess: () => void;
  onStalwartStepChange: (step: StalwartOAuthLoginStep) => void;
  onStalwartStateChange: (state: { disabled: boolean; loading: boolean }) => void;
  disrootRef: RefObject<DisrootCloudBrowserLoginStepHandle | null>;
  onDisrootSuccess: () => void;
  onDisrootSetupInProgressChange: (inProgress: boolean) => void;
  onDisrootStateChange: (state: { disabled: boolean; loading: boolean }) => void;
}

export const AccountModalBody = ({
  step,
  stepAnimationClass,
  draft,
  account,
  preloadedConfig,
  setupError,
  setupNotice,
  testSuccess,
  testedCalendars,
  onSubmit,
  onDraftFieldChange,
  onSelectServerType,
  onSelectBrowserLogin,
  onSelectCredentials,
  browserLoginDescription,
  credentialsDescription,
  quickConnectRef,
  onQuickConnectSuccess,
  onQuickConnectStepChange,
  onQuickConnectStateChange,
  fastmailRef,
  onFastmailSuccess,
  onFastmailSetupInProgressChange,
  onFastmailStateChange,
  stalwartOAuthRef,
  onStalwartSuccess,
  onStalwartStepChange,
  onStalwartStateChange,
  disrootRef,
  onDisrootSuccess,
  onDisrootSetupInProgressChange,
  onDisrootStateChange,
}: AccountModalBodyProps) => {
  return (
    <div key={step} className={stepAnimationClass}>
      {step === 'pick-type' && <ServerTypePickerStep onSelect={onSelectServerType} />}

      {step === 'connect-method' && (
        <div className="space-y-3 p-4">
          <button
            type="button"
            onClick={onSelectBrowserLogin}
            className="group flex w-full items-center gap-4 rounded-xl border border-surface-200 bg-surface-50 px-4 py-4 text-left outline-none transition-colors hover:border-surface-300 hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-700/50 dark:hover:border-surface-500 dark:hover:bg-surface-700"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-200 text-surface-600 dark:bg-surface-600 dark:text-surface-300">
              <Cloud className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-surface-800 dark:text-surface-200">
                Log in with your browser
              </div>
              <div className="mt-0.5 text-surface-500 text-xs dark:text-surface-400">
                {browserLoginDescription}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onSelectCredentials}
            className="group flex w-full items-center gap-4 rounded-xl border border-surface-200 bg-surface-50 px-4 py-4 text-left outline-none transition-colors hover:border-surface-300 hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-700/50 dark:hover:border-surface-500 dark:hover:bg-surface-700"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-200 text-surface-600 dark:bg-surface-600 dark:text-surface-300">
              <KeyRound className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-surface-800 dark:text-surface-200">
                Manually add credentials
              </div>
              <div className="mt-0.5 text-surface-500 text-xs dark:text-surface-400">
                {credentialsDescription}
              </div>
            </div>
          </button>
        </div>
      )}

      {step === 'quick-connect' && (
        <QuickConnectFlowStep
          ref={quickConnectRef}
          serverType={draft.serverType as 'nextcloud' | 'rustical'}
          onSuccess={onQuickConnectSuccess}
          onStepChange={onQuickConnectStepChange}
          onConnectStateChange={onQuickConnectStateChange}
        />
      )}

      {step === 'fastmail-oauth' && (
        <FastmailOAuthStep
          ref={fastmailRef}
          account={account}
          onSuccess={onFastmailSuccess}
          onSetupInProgressChange={onFastmailSetupInProgressChange}
          onConnectStateChange={onFastmailStateChange}
        />
      )}

      {step === 'stalwart-oauth' && (
        <StalwartOAuthStep
          ref={stalwartOAuthRef}
          serverUrl={draft.serverUrl}
          onServerUrlChange={(value) => onDraftFieldChange('serverUrl', value)}
          acceptInvalidCerts={draft.acceptInvalidCerts}
          onSuccess={onStalwartSuccess}
          onStepChange={onStalwartStepChange}
          onConnectStateChange={onStalwartStateChange}
        />
      )}

      {step === 'disrootCloud-browser' && (
        <DisrootCloudBrowserLoginStep
          ref={disrootRef}
          onSuccess={onDisrootSuccess}
          onSetupInProgressChange={onDisrootSetupInProgressChange}
          onConnectStateChange={onDisrootStateChange}
        />
      )}

      {step === 'credentials' && (
        <div>
          {preloadedConfig?.signature === 'signed-unverified' && (
            <div className="px-4 pt-4">
              <MobileConfigSignatureWarning
                signature={preloadedConfig.signature}
                signer={preloadedConfig.signer}
              />
            </div>
          )}
          {preloadedConfig?.skippedCandidates?.length ? (
            <div className="px-4 pt-4">
              <MobileConfigImportSkippedWarning
                skippedCandidates={preloadedConfig.skippedCandidates}
              />
            </div>
          ) : null}
          <CredentialsFormStep
            serverType={draft.serverType}
            name={draft.name}
            onNameChange={(value) => onDraftFieldChange('name', value)}
            icon={draft.icon}
            onIconChange={(value) => onDraftFieldChange('icon', value)}
            emoji={draft.emoji}
            onEmojiChange={(value) => onDraftFieldChange('emoji', value)}
            serverUrl={draft.serverUrl}
            onServerUrlChange={(value) => onDraftFieldChange('serverUrl', value)}
            username={draft.username}
            onUsernameChange={(value) => onDraftFieldChange('username', value)}
            password={draft.password}
            onPasswordChange={(value) => onDraftFieldChange('password', value)}
            principalUrl={draft.principalUrl}
            onPrincipalUrlChange={(value) => onDraftFieldChange('principalUrl', value)}
            calendarHomeUrl={draft.calendarHomeUrl}
            onCalendarHomeUrlChange={(value) => onDraftFieldChange('calendarHomeUrl', value)}
            account={account}
            error={setupError}
            setupNotice={setupNotice}
            testSuccess={testSuccess}
            testedCalendarCount={testedCalendars.length}
            testedPushSupportedCount={
              testedCalendars.filter((calendar) => calendar.pushSupported).length
            }
            onSubmit={onSubmit}
          />
        </div>
      )}
    </div>
  );
};
