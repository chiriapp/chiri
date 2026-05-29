import CircleX from 'lucide-react/icons/circle-x';
import Info from 'lucide-react/icons/info';
import { ComposedInput } from '$components/ComposedInput';
import { IconEmojiPicker } from '$components/IconEmojiPicker';
import { AdvancedSection } from '$components/modals/AccountModal/AdvancedSection';
import { ConnectionSuccessBanner } from '$components/modals/AccountModal/ConnectionSuccessBanner';
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
  onSubmit: (e: React.FormEvent) => void;
}

const SERVER_HINTS: Partial<Record<ServerType, { text: React.ReactNode; href: string }>> = {
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
    <form onSubmit={onSubmit} className="p-4 space-y-4">
      <div>
        <label
          htmlFor="account-name"
          className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
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
            className="flex-1 px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
          />
        </div>
      </div>

      {!getPredefinedServerUrl(serverType) && (
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
            onChange={onServerUrlChange}
            placeholder="https://caldav.example.com"
            required
            className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
          />
          {serverType === 'generic' && (
            <p className="mt-2 text-xs flex flex-row text-surface-500 dark:text-surface-400">
              <Info className="inline w-3.5 h-3.5 mr-1 text-surface-400" />
              The app will attempt to auto-discover for base URLs.
            </p>
          )}
        </div>
      )}

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
          onChange={onUsernameChange}
          placeholder="user@example.com"
          required
          className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
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
          className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
        />
        {hint && (
          <div className="mt-3 flex gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-xs text-surface-700 dark:text-surface-300">
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
          className="rounded-lg border border-semantic-error/30 bg-semantic-error/10 p-3 text-sm text-surface-700 dark:text-surface-300"
        >
          <div className="grid grid-cols-[1rem_1fr] gap-x-3 gap-y-2">
            <CircleX className="mt-0.5 size-4 shrink-0 text-semantic-error" />
            <div className="min-w-0">
              <p className="font-medium text-semantic-error">{error.title}</p>
            </div>
            <p className="col-span-2">{error.message}</p>

            {error.hint && (
              <p className="col-span-2 text-xs text-surface-600 dark:text-surface-400">
                {error.hint}
              </p>
            )}

            {error.detail && error.detail !== error.message && (
              <details className="col-span-2 text-xs text-surface-500 dark:text-surface-400">
                <summary className="cursor-pointer select-none font-medium">
                  Technical detail
                </summary>
                <p className="mt-1 wrap-break-word font-mono">{error.detail}</p>
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
