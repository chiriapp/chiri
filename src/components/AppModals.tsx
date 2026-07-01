import { AccountModal } from '$components/modals/AccountModal/AccountModal';
import { CalendarModal } from '$components/modals/CalendarModal';
import { ChangelogModal } from '$components/modals/ChangelogModal';
import { ExportModal } from '$components/modals/ExportModal';
import { ImportModal } from '$components/modals/ImportModal/ImportModal';
import { MobileConfigImportChooserModal } from '$components/modals/MobileConfigImportChooserModal';
import { OnboardingModal } from '$components/modals/OnboardingModal/OnboardingModal';
import { SettingsModal } from '$components/modals/SettingsModal';
import { TaskActionsModal } from '$components/modals/TaskActionsModal';
import { UpdateModal } from '$components/modals/UpdateModal';
import type { FileDropResult } from '$hooks/system/useFileDrop';
import type { UpdateError, UpdateInfo } from '$hooks/system/useUpdateChecker';
import { getTasksByCalendar } from '$lib/store/tasks';
import type { Account } from '$types';
import type { AppModalActions, AppModalState } from '$types/controller';
import type {
  MobileConfigCalDAVSettings,
  MobileConfigImportProfile,
  MobileConfigImportSelection,
} from '$types/mobileconfig';

interface AppModalsOnboarding {
  show: boolean;
  hasCalDAVAccounts: boolean;
}

interface AppModalsFileDrop {
  preloadedFile: FileDropResult | null;
  preloadedConfigProfile: MobileConfigImportProfile | null;
  preloadedConfig: MobileConfigImportSelection | null;
  handleImportClose: () => void;
  clearDragState: () => void;
  clearPreloadedConfig: () => void;
  returnToPreloadedConfigChooser: () => void;
  selectPreloadedConfig: (
    settings: MobileConfigCalDAVSettings,
    profile: MobileConfigImportProfile,
  ) => void;
}

interface AppModalsUpdates {
  changelogData: { version: string; body: string } | null;
  showUpdateModal: boolean;
  updateAvailable: UpdateInfo | null;
  isDownloading: boolean;
  downloadProgress: number;
  updateError: UpdateError | null;
  closeChangelog: () => void;
  downloadAndInstall: () => void;
  dismissUpdate: () => void;
  setShowUpdateModal: (show: boolean) => void;
}

interface AppModalsProps {
  accounts: Account[];
  onboarding: AppModalsOnboarding;
  modals: AppModalState;
  modalActions: AppModalActions;
  fileDrop: AppModalsFileDrop;
  updates: AppModalsUpdates;
}

export const AppModals = ({
  accounts,
  onboarding,
  modals,
  modalActions,
  fileDrop,
  updates,
}: AppModalsProps) => {
  const {
    showSettings,
    showImport,
    showAccountModal,
    accountModalZIndex,
    editingAccountId,
    showCreateCalendar,
    createCalendarAccountId,
    settingsInitialTab,
    showCalendarModal,
    editingCalendar,
    showExportModal,
    exportCalendarId,
    showTaskActions,
    taskActionsId,
  } = modals;
  const {
    closeSettings,
    openAccount,
    closeAccount,
    closeCreateCalendar,
    closeCalendar,
    closeExport,
    closeTaskActions,
  } = modalActions;
  const {
    preloadedFile,
    preloadedConfigProfile,
    preloadedConfig,
    handleImportClose,
    clearDragState,
    clearPreloadedConfig,
    returnToPreloadedConfigChooser,
    selectPreloadedConfig,
  } = fileDrop;
  const {
    changelogData,
    showUpdateModal,
    updateAvailable,
    isDownloading,
    downloadProgress,
    updateError,
    closeChangelog,
    downloadAndInstall,
    dismissUpdate,
    setShowUpdateModal,
  } = updates;
  const editingAccount = editingAccountId
    ? (accounts.find((account) => account.id === editingAccountId) ?? null)
    : null;

  const editingCalendarAccount = editingCalendar
    ? accounts.find((account) => account.id === editingCalendar.accountId)
    : undefined;
  const editingCalendarModel = editingCalendarAccount?.calendars.find(
    (calendar) => calendar.id === editingCalendar?.calendarId,
  );

  const exportCalendar = exportCalendarId
    ? accounts
        .flatMap((account) => account.calendars)
        .find((calendar) => calendar.id === exportCalendarId)
    : undefined;
  const openAccountAboveModal = (accountId: string | null = null) => {
    openAccount({ accountId, layer: 'above-modal' });
  };

  return (
    <>
      {showSettings && (
        <SettingsModal
          onClose={closeSettings}
          onAddAccount={() => openAccountAboveModal()}
          onEditAccount={openAccountAboveModal}
          initialCategory={settingsInitialTab.category}
          initialSubtab={settingsInitialTab.subtab}
        />
      )}

      <ImportModal
        isOpen={showImport}
        onClose={handleImportClose}
        preloadedFile={preloadedFile}
        onFileDrop={clearDragState}
      />

      {preloadedConfigProfile && !preloadedConfig && (
        <MobileConfigImportChooserModal
          profile={preloadedConfigProfile}
          onSelect={(settings) => selectPreloadedConfig(settings, preloadedConfigProfile)}
          onClose={clearPreloadedConfig}
        />
      )}

      {showAccountModal && (
        <AccountModal
          account={editingAccount}
          preloadedConfig={preloadedConfig ?? undefined}
          zIndex={accountModalZIndex}
          onBackToConfigProfileChooser={
            preloadedConfigProfile
              ? () => {
                  closeAccount();
                  returnToPreloadedConfigChooser();
                }
              : undefined
          }
          onClose={() => {
            closeAccount();
            clearPreloadedConfig();
          }}
        />
      )}

      {showCreateCalendar && createCalendarAccountId && (
        <CalendarModal accountId={createCalendarAccountId} onClose={closeCreateCalendar} />
      )}

      {showCalendarModal && editingCalendar && editingCalendarModel && (
        <CalendarModal
          calendar={editingCalendarModel}
          accountId={editingCalendar.accountId}
          onClose={closeCalendar}
        />
      )}

      {showExportModal && exportCalendarId && (
        <ExportModal
          tasks={getTasksByCalendar(exportCalendarId)}
          type="single-calendar"
          calendarName={exportCalendar?.displayName}
          fileName={
            exportCalendar?.displayName.replace(/[^a-z0-9]/gi, '-').toLowerCase() ?? 'export'
          }
          onClose={closeExport}
        />
      )}

      {showTaskActions && taskActionsId && (
        <TaskActionsModal
          isOpen={showTaskActions}
          taskId={taskActionsId}
          onClose={closeTaskActions}
        />
      )}

      {onboarding.show && (
        <OnboardingModal
          hasCalDAVAccount={onboarding.hasCalDAVAccounts}
          onAddAccount={() => openAccountAboveModal()}
        />
      )}

      {changelogData && (
        <ChangelogModal
          version={changelogData.version}
          changelog={changelogData.body}
          onClose={closeChangelog}
        />
      )}

      {showUpdateModal && updateAvailable && (
        <UpdateModal
          updateInfo={updateAvailable}
          onDownload={downloadAndInstall}
          onDismiss={() => {
            dismissUpdate();
            setShowUpdateModal(false);
          }}
          onClose={() => setShowUpdateModal(false)}
          isDownloading={isDownloading}
          downloadProgress={downloadProgress}
          error={updateError}
        />
      )}
    </>
  );
};
