import type { ServerType } from '$types';
import type { DateFormat, StartOfWeek } from '$types/preference';
import type { ServerTypeGroup, ServerTypeOption } from '$types/settings';

/**
 * date format options
 */
export const DATE_FORMAT_OPTIONS: Array<{ value: DateFormat; label: string; example: string }> = [
  { value: 'MMM d, yyyy', label: 'Jan 15, 2025', example: 'Jan 15, 2025' },
  { value: 'd MMM yyyy', label: '15 Jan 2025', example: '15 Jan 2025' },
  { value: 'MM/dd/yyyy', label: '01/15/2025', example: '01/15/2025' },
  { value: 'dd/MM/yyyy', label: '15/01/2025', example: '15/01/2025' },
  { value: 'yyyy-MM-dd', label: '2025-01-15', example: '2025-01-15' },
];

/**
 * days of week options for calendar start day
 */
export const WEEK_START_OPTIONS: Array<{ value: StartOfWeek; label: string }> = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];

/**
 * connectivity check interval options (in seconds)
 */
export const CONNECTIVITY_CHECK_INTERVAL_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 15, label: 'Every 15 seconds' },
  { value: 30, label: 'Every 30 seconds' },
  { value: 60, label: 'Every minute' },
  { value: 120, label: 'Every 2 minutes' },
  { value: 300, label: 'Every 5 minutes' },
];

export const DEFAULT_PROXY_HOST = '127.0.0.1';
export const DEFAULT_HTTP_PROXY_PORT = 8080;
export const DEFAULT_SOCKS_PROXY_PORT = 1080;

/**
 * sync interval options (in minutes)
 */
export const SYNC_INTERVAL_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Every 1 minute' },
  { value: 5, label: 'Every 5 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
];

export const SERVER_TYPE_GROUPS: ServerTypeGroup[] = [
  {
    label: 'General',
    options: [
      {
        value: 'generic',
        label: 'Generic (auto-detect)',
      },
    ],
  },
  {
    label: 'Managed Services',
    options: [
      {
        value: 'fastmail',
        label: 'Fastmail',
      },
      {
        value: 'fruux',
        label: 'fruux',
      },
      {
        value: 'mailbox',
        label: 'Mailbox.org',
      },
      {
        value: 'migadu',
        label: 'Migadu',
      },
      {
        value: 'purelymail',
        label: 'Purelymail',
      },
      {
        value: 'runbox',
        label: 'Runbox',
      },
      {
        value: 'disrootCloud',
        label: 'Disroot Cloud',
      },
    ],
  },
  {
    label: 'Self-Hosted',
    options: [
      {
        value: 'baikal',
        label: 'Baikal',
      },
      {
        value: 'nextcloud',
        label: 'Nextcloud',
      },
      {
        value: 'radicale',
        label: 'Radicale',
      },
      {
        value: 'rustical',
        label: 'RustiCal',
      },
      {
        value: 'vikunja',
        label: 'Vikunja',
      },
      {
        value: 'xandikos',
        label: 'Xandikos',
      },
    ],
  },
];

// flat list for convenience
export const SERVER_TYPE_OPTIONS: ServerTypeOption[] = SERVER_TYPE_GROUPS.flatMap(
  (group) => group.options,
);

/**
 * predefined server URLs for known server types
 */
export const PREDEFINED_SERVER_URLS: Partial<Record<ServerType, string>> = {
  disrootCloud: 'https://cloud.disroot.org',
  fastmail: 'https://caldav.fastmail.com',
  fruux: 'https://dav.fruux.com',
  mailbox: 'https://dav.mailbox.org',
  migadu: 'https://cdav.migadu.com',
  purelymail: 'https://purelymail.com',
  runbox: 'https://dav.runbox.com',
};

/**
 * get predefined server URL for a server type
 */
export const getPredefinedServerUrl = (type: ServerType) => {
  return PREDEFINED_SERVER_URLS[type];
};
