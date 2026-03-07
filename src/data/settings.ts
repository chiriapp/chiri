/**
 * Settings data and configuration options
 */

import type { ServerType, StartOfWeek } from '$types/index';

/**
 * Days of week options for calendar start day
 */
export const WEEK_START_OPTIONS: Array<{ value: StartOfWeek; label: string }> = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
];

/**
 * Sync interval options (in minutes)
 */
export const SYNC_INTERVAL_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Every 1 minute' },
  { value: 5, label: 'Every 5 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
];

/**
 * Server type options with descriptions
 */
export interface ServerTypeOption {
  value: ServerType;
  label: string;
  description: string;
}

export interface ServerTypeGroup {
  label: string;
  options: ServerTypeOption[];
}

export const SERVER_TYPE_GROUPS: ServerTypeGroup[] = [
  {
    label: 'General',
    options: [
      {
        value: 'generic',
        label: 'Generic (auto-detect)',
        description: 'Uses .well-known/caldav. Good enough for most servers.',
      },
    ],
  },
  {
    label: 'Managed Services',
    options: [
      {
        value: 'fastmail',
        label: 'Fastmail',
        description: 'Uses auto-discovery (username is your email address)',
      },
      {
        value: 'mailbox',
        label: 'Mailbox.org',
        description: 'Uses auto-discovery (username is your email address)',
      },
    ],
  },
  {
    label: 'Self-Hosted',
    options: [
      {
        value: 'baikal',
        label: 'Baikal',
        description: 'Uses /dav.php/principals/{username}/ path structure',
      },
      {
        value: 'nextcloud',
        label: 'Nextcloud',
        description: 'Uses /remote.php/dav/ path structure',
      },
      {
        value: 'radicale',
        label: 'Radicale',
        description: 'Uses /{username}/ path structure',
      },
      {
        value: 'rustical',
        label: 'RustiCal',
        description: 'Uses /caldav/principal/{username}/ path structure',
      },
    ],
  },
];

// Flat list for backward compatibility
export const SERVER_TYPE_OPTIONS: ServerTypeOption[] = SERVER_TYPE_GROUPS.flatMap(
  (group) => group.options,
);

/**
 * Predefined server URLs for known server types
 */
export const PREDEFINED_SERVER_URLS: Partial<Record<ServerType, string>> = {
  fastmail: 'https://caldav.fastmail.com',
  mailbox: 'https://dav.mailbox.org',
};

/**
 * Get description for a server type
 */
export const getServerTypeDescription = (type: ServerType): string => {
  return SERVER_TYPE_OPTIONS.find((opt) => opt.value === type)?.description ?? '';
};

/**
 * Get predefined server URL for a server type
 */
export const getPredefinedServerUrl = (type: ServerType): string | undefined => {
  return PREDEFINED_SERVER_URLS[type];
};
