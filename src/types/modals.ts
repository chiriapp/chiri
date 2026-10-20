import type { SettingsCategory, SettingsSubtab } from '$types/settings/categories/navigation';

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
  reauthorize?: boolean;
}

export interface AppModalState {
  showSettings: boolean;
  settingsInitialTab: SettingsInitialTab;
  showImport: boolean;
  showAccountModal: boolean;
  editingAccountId: string | null;
  reauthorizingAccountId?: string | null;
  accountModalZIndex: AccountModalZIndex;
  showCreateCalendar: boolean;
  createCalendarAccountId: string | null;
  showCalendarModal: boolean;
  editingCalendar: EditingCalendar | null;
  showExportModal: boolean;
  exportCalendarId: string | null;
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
  openMobileConfigExport: (accountId: string) => void;
  closeMobileConfigExport: () => void;
}

export type AppModals = AppModalState & AppModalActions;

export type SidebarExportTarget =
  | { type: 'calendar'; calendarId: string }
  | { type: 'account'; accountId: string };

export interface SidebarModalState {
  showAccountModal: boolean;
  editingAccountId: string | null;
  showTagModal: boolean;
  editingTagId: string | null;
  showCreateCalendar: boolean;
  createCalendarAccountId: string | null;
  showCalendarModal: boolean;
  editingCalendar: EditingCalendar | null;
  showFilterPresetModal: boolean;
  editingFilterId: string | null;
  exportTarget: SidebarExportTarget | null;
  mobileConfigAccountId: string | null;
}

export interface SidebarModalActions {
  openAccount: (accountId?: string | null) => void;
  closeAccount: () => void;
  openTag: (tagId?: string | null) => void;
  closeTag: () => void;
  openCreateCalendar: (accountId: string) => void;
  closeCreateCalendar: () => void;
  openCalendar: (editingCalendar: EditingCalendar) => void;
  closeCalendar: () => void;
  openFilterPreset: () => void;
  closeFilterPreset: () => void;
  openFilter: (filterId: string) => void;
  closeFilter: () => void;
  openExportCalendar: (calendarId: string) => void;
  openExportAccount: (accountId: string) => void;
  closeExport: () => void;
  openMobileConfigExport: (accountId: string) => void;
  closeMobileConfigExport: () => void;
}

export type SidebarModals = SidebarModalState & SidebarModalActions;
