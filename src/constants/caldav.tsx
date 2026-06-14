import type { ServerType } from '$types';

export interface CalDAVWarning {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  delayConfirmSeconds?: number;
}

export type UnsupportedCalDAVProvider = 'google' | 'icloud';

export const UNSUPPORTED_CALDAV_WARNINGS: Record<UnsupportedCalDAVProvider, CalDAVWarning> = {
  google: {
    title: 'Google CalDAV warning',
    message: (
      <div className="space-y-3">
        <p>Google's CalDAV server does not support VTODO events.</p>
        <p className="text-surface-700 dark:text-surface-300">
          Chiri syncs tasks through VTODO, so Google Calendar CalDAV accounts cannot sync tasks.
        </p>
        <p className="font-extrabold text-surface-800 dark:text-surface-200">
          This account is unsupported. It's recommended to use a CalDAV server with VTODO support
          instead.
        </p>
      </div>
    ),
    confirmLabel: 'Continue anyway',
    delayConfirmSeconds: 5,
  },
  icloud: {
    title: 'iCloud CalDAV warning',
    message: (
      <div className="space-y-3">
        <p>
          The Apple Reminders app introduced in iOS 13 and macOS 10.15 uses a proprietary format
          that is not compatible with Chiri.
        </p>
        <p className="text-surface-700 dark:text-surface-300">
          You can continue to synchronize tasks with iCloud, but upgraded Apple Reminders data will
          not appear in iOS 13+, macOS 10.15+, or iCloud.com.
        </p>
        <p className="font-extrabold text-surface-800 dark:text-surface-200">
          iCloud accounts are unsupported. It's recommended to use a different CalDAV server if
          possible.
        </p>
      </div>
    ),
    confirmLabel: 'Continue anyway',
    delayConfirmSeconds: 5,
  },
};

export const CALDAV_SERVER_WARNINGS: Partial<Record<ServerType, CalDAVWarning>> = {
  vikunja: {
    title: 'Vikunja server warning',
    message: (
      <div className="space-y-3">
        <p>Vikunja's current CalDAV implementation is incomplete and may cause issues.</p>
        <p className="text-surface-700 dark:text-surface-300">
          This app may not work reliably with Vikunja, and you may encounter sync problems, missing
          features, or other bugs.
        </p>
        <p className="font-extrabold text-surface-800 dark:text-surface-200">
          Only limited support will be offered. It's recommended to use a different CalDAV server if
          possible.
        </p>
      </div>
    ),
    confirmLabel: 'Continue (dangerous)',
    delayConfirmSeconds: 5,
  },
};
