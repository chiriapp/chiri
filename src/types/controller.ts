import type { SettingsCategory, SettingsSubtab } from '$types/settings';

export type AccountModalZIndex = 'z-60' | 'z-70';
export type AccountModalLayer = 'default' | 'above-modal';

export interface SettingsInitialTab {
  category?: SettingsCategory;
  subtab?: SettingsSubtab;
}

export interface EditingCalendar {
  calendarId: string;
  accountId: string;
}

export interface OpenAccountOptions {
  accountId?: string | null;
  layer?: AccountModalLayer;
}

export interface AppModalState {
  showSettings: boolean;
  settingsInitialTab: SettingsInitialTab;
  showImport: boolean;
  showAccountModal: boolean;
  editingAccountId: string | null;
  accountModalZIndex: AccountModalZIndex;
  showCreateCalendar: boolean;
  createCalendarAccountId: string | null;
  showCalendarModal: boolean;
  editingCalendar: EditingCalendar | null;
  showExportModal: boolean;
  exportCalendarId: string | null;
  showTaskActions: boolean;
  taskActionsId: string | null;
  mobileConfigAccountId: string | null;
}

export interface AppModalActions {
  openSettings: (initialTab?: SettingsInitialTab) => void;
  toggleSettings: (initialTab?: SettingsInitialTab) => void;
  closeSettings: () => void;
  openImport: () => void;
  closeImport: () => void;
  openAccount: (options?: OpenAccountOptions) => void;
  closeAccount: () => void;
  openCreateCalendar: (accountId: string) => void;
  closeCreateCalendar: () => void;
  openCalendar: (calendar: EditingCalendar) => void;
  closeCalendar: () => void;
  openExport: (calendarId: string) => void;
  closeExport: () => void;
  openTaskActions: (taskId: string) => void;
  closeTaskActions: () => void;
  openMobileConfigExport: (accountId: string) => void;
  closeMobileConfigExport: () => void;
}

export type AppModals = AppModalState & AppModalActions;
