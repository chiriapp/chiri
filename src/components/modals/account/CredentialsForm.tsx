import Info from 'lucide-react/icons/info';
import { useRef } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import { IconEmojiPicker } from '$components/IconEmojiPicker';
import { AdvancedSection } from '$components/modals/account/AdvancedSection';
import { ConnectionSuccessBanner } from '$components/modals/account/ConnectionSuccessBanner';
import { getPredefinedServerUrl, getServerTypeDescription } from '$constants/settings';
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
  error: string;
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
  testSuccess,
  testedCalendarCount,
  testedPushSupportedCount,
  onSubmit,
}: CredentialsFormProps) => {
  const nameInputFocusedRef = useRef(false);
  const hint = SERVER_HINTS[serverType];

  return (
    <form onSubmit={onSubmit} className="p-4 space-y-4">
      <div className="flex items-center gap-2 pb-1">
        <span className="text-sm text-surface-500 dark:text-surface-400">
          {getServerTypeDescription(serverType)}
        </span>
      </div>

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
            ref={(el) => {
              if (el && !nameInputFocusedRef.current) {
                nameInputFocusedRef.current = true;
                setTimeout(() => el.focus(), 100);
              }
            }}
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
          Password
        </label>
        <ComposedInput
          id="password"
          type="password"
          value={password}
          onChange={onPasswordChange}
          placeholder={account ? '(unchanged)' : 'Enter password'}
          required={!account}
          className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
        />
        {hint && (
          <div className="mt-3 flex gap-2 rounded-lg border border-semantic-info/30 bg-semantic-info/10 px-3 py-2 text-xs text-semantic-info">
            <Info className="mt-px size-3.5 shrink-0" />
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
        initialOpen={!!account?.calendarHomeUrl || !!account?.principalUrl}
      />

      {error && (
        <div className="p-3 text-sm text-semantic-error bg-semantic-error/10 border border-semantic-error/30 rounded-lg">
          {error}
        </div>
      )}

      {testSuccess && (
        <ConnectionSuccessBanner
          calendarCount={testedCalendarCount}
          pushSupportedCount={testedPushSupportedCount}
        />
      )}
    </form>
  );
};
