import { useCallback, useState } from 'react';
import type {
  AccountModalZIndex,
  AppModals,
  EditingCalendar,
  OpenAccountOptions,
  SettingsInitialTab,
} from '$types/controller';

const ACCOUNT_MODAL_Z_INDEX = {
  default: 'z-60',
  'above-modal': 'z-70',
} as const;

export const useAppModals = (): AppModals => {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsInitialTab>({});
  const [showImport, setShowImport] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountModalZIndex, setAccountModalZIndex] = useState<AccountModalZIndex>(
    ACCOUNT_MODAL_Z_INDEX.default,
  );
  const [showCreateCalendar, setShowCreateCalendar] = useState(false);
  const [createCalendarAccountId, setCreateCalendarAccountId] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<EditingCalendar | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCalendarId, setExportCalendarId] = useState<string | null>(null);
  const [mobileConfigAccountId, setMobileConfigAccountId] = useState<string | null>(null);

  const openSettings = useCallback((initialTab: SettingsInitialTab = {}) => {
    setSettingsInitialTab(initialTab);
    setShowSettings(true);
  }, []);

  const toggleSettings = useCallback((initialTab: SettingsInitialTab = {}) => {
    setSettingsInitialTab(initialTab);
    setShowSettings((prev) => !prev);
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    setSettingsInitialTab({});
  }, []);

  const openImport = useCallback(() => {
    setShowImport(true);
  }, []);

  const closeImport = useCallback(() => {
    setShowImport(false);
  }, []);

  const openAccount = useCallback(
    ({ accountId = null, layer = 'default' }: OpenAccountOptions = {}) => {
      setEditingAccountId(accountId);
      setAccountModalZIndex(ACCOUNT_MODAL_Z_INDEX[layer]);
      setShowAccountModal(true);
    },
    [],
  );

  const closeAccount = useCallback(() => {
    setShowAccountModal(false);
    setEditingAccountId(null);
    setAccountModalZIndex(ACCOUNT_MODAL_Z_INDEX.default);
  }, []);

  const openCreateCalendar = useCallback((accountId: string) => {
    setCreateCalendarAccountId(accountId);
    setShowCreateCalendar(true);
  }, []);

  const closeCreateCalendar = useCallback(() => {
    setShowCreateCalendar(false);
  }, []);

  const openCalendar = useCallback((calendar: EditingCalendar) => {
    setEditingCalendar(calendar);
    setShowCalendarModal(true);
  }, []);

  const closeCalendar = useCallback(() => {
    setShowCalendarModal(false);
    setEditingCalendar(null);
  }, []);

  const openExport = useCallback((calendarId: string) => {
    setExportCalendarId(calendarId);
    setShowExportModal(true);
  }, []);

  const closeExport = useCallback(() => {
    setShowExportModal(false);
    setExportCalendarId(null);
  }, []);

  const openMobileConfigExport = useCallback((accountId: string) => {
    setMobileConfigAccountId(accountId);
  }, []);

  const closeMobileConfigExport = useCallback(() => {
    setMobileConfigAccountId(null);
  }, []);

  return {
    showSettings,
    settingsInitialTab,
    showImport,
    showAccountModal,
    editingAccountId,
    accountModalZIndex,
    showCreateCalendar,
    createCalendarAccountId,
    showCalendarModal,
    editingCalendar,
    showExportModal,
    exportCalendarId,
    mobileConfigAccountId,
    openSettings,
    toggleSettings,
    closeSettings,
    openImport,
    closeImport,
    openAccount,
    closeAccount,
    openCreateCalendar,
    closeCreateCalendar,
    openCalendar,
    closeCalendar,
    openExport,
    closeExport,
    openMobileConfigExport,
    closeMobileConfigExport,
  };
};
