import CircleX from 'lucide-react/icons/circle-x';
import Info from 'lucide-react/icons/info';
import type { ReactNode, SubmitEvent } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import { IconEmojiPicker } from '$components/IconEmojiPicker';
import { AdvancedSection } from '$components/modals/AccountModal/AdvancedSection';
import { ConnectionSuccessBanner } from '$components/modals/AccountModal/ConnectionSuccessBanner';
import { Tooltip } from '$components/Tooltip';
import { getPredefinedServerUrl } from '$constants/settings';
import { useInitialFocusRef } from '$hooks/ui/useInitialFocusRef';
import type { CalDAVSetupError, CalDAVSetupNotice } from '$lib/caldav/setup';
import type { Account, ServerType } from '$types';

interface CredentialsFormProps {
  serverType: ServerType;
  name: string;
  onNameChange: (v: string) => void;
  icon: string;
  onIconChange: (v: string) => void;
  emoji: string;
  onEmojiChange: (v: string) => void;
  serverUrl: string;
  onServerUrlChange: (v: string) => void;
  username: string;
  onUsernameChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  principalUrl: string;
  onPrincipalUrlChange: (v: string) => void;
  calendarHomeUrl: string;
  onCalendarHomeUrlChange: (v: string) => void;
  account: Account | null;
  error: CalDAVSetupError | null;
  setupNotice: CalDAVSetupNotice | null;
  testSuccess: boolean;
  testedCalendarCount: number;
  testedPushSupportedCount: number;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
}

const SERVER_HINTS: Partial<Record<ServerType, { text: ReactNode; href: string }>> = {
  fastmail: {
    text: (
      <>
        To use Chiri with Fastmail,{' '}
        <a
          href="https://app.fastmail.com/settings/security/apps/new"
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-2 hover:opacity-80"
        >
          create an app password
        </a>{' '}
        with access to CalDAV.
      </>
    ),
    href: 'https://app.fastmail.com/settings/security/apps/new',
  },
  fruux: {
    text: (
      <>
        It's recommended to use device-specific credentials for fruux.{' '}
        <a
          href="https://fruux.com/sync/credentials/?deviceType=generic"
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-2 hover:opacity-80"
        >
          Create a new device
        </a>{' '}
        and use the generated username and password.
      </>
    ),
    href: 'https://fruux.com/sync/credentials/?deviceType=generic',
  },
  runbox: {
    text: (
      <>
        If two-factor authentication (2FA) is enabled, you will need to{' '}
        <a
          href="https://runbox.com/mail/account_security"
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-2 hover:opacity-80"
        >
          create an app password
        </a>{' '}
        and use it here instead.
      </>
    ),
    href: 'https://runbox.com/mail/account_security',
  },
  purelymail: {
    text: (
      <>
        If two-factor authentication (2FA) is enabled, you will need to{' '}
        <a
          href="https://purelymail.com/manage/users"
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-2 hover:opacity-80"
        >
          create an app password
        </a>{' '}
        and use it here instead.
      </>
    ),
    href: 'https://purelymail.com/manage/users',
  },
};

export const CredentialsForm = ({
  serverType,
  name,
  onNameChange,
  icon,
  onIconChange,
  emoji,
  onEmojiChange,
  serverUrl,
  onServerUrlChange,
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  principalUrl,
  onPrincipalUrlChange,
  calendarHomeUrl,
  onCalendarHomeUrlChange,
  account,
  error,
  setupNotice,
  testSuccess,
  testedCalendarCount,
  testedPushSupportedCount,
  onSubmit,
}: CredentialsFormProps) => {
  const nameInputRef = useInitialFocusRef<HTMLInputElement>();
  const hint = SERVER_HINTS[serverType];

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-4">
      <div>
        <label
          htmlFor="account-name"
          className="mb-1 block font-medium text-sm text-surface-700 dark:text-surface-300"
        >
          Account Display Name
        </label>
        <div className="flex items-center gap-2">
          <IconEmojiPicker
            iconValue={icon}
            emojiValue={emoji}
            onIconChange={onIconChange}
            onEmojiChange={onEmojiChange}
          />
          <ComposedInput
            id="account-name"
            type="text"
            ref={nameInputRef}
            value={name}
            onChange={onNameChange}
            placeholder="My CalDAV Account"
            required
            className="flex-1 rounded-lg border border-transparent bg-surface-100 px-3 py-2 text-sm text-surface-800 transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          />
        </div>
      </div>

      {!getPredefinedServerUrl(serverType) && (
        <div>
          <label
            htmlFor="server-url"
            className="mb-1 flex items-center gap-1.5 font-medium text-sm text-surface-700 dark:text-surface-300"
          >
            <span>Server URL</span>
            {serverType === 'generic' && (
              <Tooltip
                content="The app will attempt to auto-discover for base URLs."
                position="top"
                allowInModal
              >
                <button
                  type="button"
                  aria-label="Server URL help"
                  className="inline-flex rounded-sm text-surface-400 outline-none transition-colors hover:text-surface-600 focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:text-surface-300"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}
          </label>
          <ComposedInput
            id="server-url"
            type="url"
            value={serverUrl}
            onChange={onServerUrlChange}
            placeholder="https://caldav.example.com"
            required
            className="w-full rounded-lg border border-transparent bg-surface-100 px-3 py-2 text-sm text-surface-800 transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          />
        </div>
      )}

      <div>
        <label
          htmlFor="username"
          className="mb-1 block font-medium text-sm text-surface-700 dark:text-surface-300"
        >
          Username
        </label>
        <ComposedInput
          id="username"
          type="text"
          value={username}
          onChange={onUsernameChange}
          placeholder="user@example.com"
          required
          className="w-full rounded-lg border border-transparent bg-surface-100 px-3 py-2 text-sm text-surface-800 transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block font-medium text-sm text-surface-700 dark:text-surface-300"
        >
          {serverType === 'fastmail' ? 'App Password' : 'Password'}
        </label>
        <ComposedInput
          id="password"
          type="password"
          value={password}
          onChange={onPasswordChange}
          placeholder={
            account
              ? '(unchanged)'
              : serverType === 'fastmail'
                ? 'Enter app password'
                : 'Enter password'
          }
          required={!account}
          className="w-full rounded-lg border border-transparent bg-surface-100 px-3 py-2 text-sm text-surface-800 transition-colors focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
        />
        {hint && (
          <div className="mt-3 flex gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-surface-700 text-xs dark:text-surface-300">
            <Info className="mt-px size-3.5 shrink-0 text-semantic-info" />
            <span>{hint.text}</span>
          </div>
        )}
      </div>

      <AdvancedSection
        serverType={serverType}
        principalUrl={principalUrl}
        onPrincipalUrlChange={onPrincipalUrlChange}
        calendarHomeUrl={calendarHomeUrl}
        onCalendarHomeUrlChange={onCalendarHomeUrlChange}
        initialOpen={!!account?.caldav?.calendarHomeUrl || !!account?.caldav?.principalUrl}
      />

      {error && (
        <div
          role="alert"
          className="min-w-0 rounded-lg border border-semantic-error/30 bg-semantic-error/10 p-3 text-sm text-surface-700 dark:text-surface-300"
        >
          <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-2 gap-y-2">
            <CircleX className="mt-0.5 size-4 shrink-0 text-semantic-error" />
            <div className="min-w-0">
              <p className="wrap-break-word font-medium text-semantic-error">{error.title}</p>
            </div>
            <p className="wrap-break-word col-span-2 min-w-0">{error.message}</p>

            {error.hint && (
              <p className="wrap-break-word col-span-2 min-w-0 text-surface-600 text-xs dark:text-surface-400">
                {error.hint}
              </p>
            )}

            {error.detail && error.detail !== error.message && (
              <details className="col-span-2 min-w-0 text-surface-500 text-xs dark:text-surface-400">
                <summary className="cursor-pointer select-none font-medium">
                  Technical detail
                </summary>
                <p className="wrap-break-word mt-1 whitespace-pre-wrap font-mono">{error.detail}</p>
              </details>
            )}
          </div>
        </div>
      )}

      {testSuccess && (
        <ConnectionSuccessBanner
          calendarCount={testedCalendarCount}
          pushSupportedCount={testedPushSupportedCount}
          notice={setupNotice}
        />
      )}
    </form>
  );
};
