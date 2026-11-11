/**
 * how the last sync was triggered, phrased for the header tooltip and the sync settings panel
 */
export const SYNC_SOURCE_LABELS: Record<string, string> = {
  'header-sync-button': 'manually',
  'tray-sync': 'manually',
  'keyboard-shortcut': 'manually',
  'app-menu': 'manually',
  'settings-sync-button': 'manually',
  'auto-interval': 'automatically',
  'startup-initial': 'on startup',
  'auto-reconnect': 'on reconnect',
  'webdav-push': 'from WebDAV Push',
};
