import { useCallback, useMemo, useState } from 'react';
import { type FileDropResult, useFileDrop } from '$hooks/system/useFileDrop';
import { toastManager } from '$hooks/ui/useToast';
import type { OpenAccountOptions } from '$types/controller';
import type {
  MobileConfigCalDAVSettings,
  MobileConfigImportProfile,
  MobileConfigImportSelection,
} from '$types/mobileconfig';

interface UseAppFileDropOptions {
  isAnyModalOpen: boolean;
  isImportOpen: boolean;
  openImport: () => void;
  closeImport: () => void;
  openAccount: (options?: OpenAccountOptions) => void;
}

export const useAppFileDrop = ({
  isAnyModalOpen,
  isImportOpen,
  openImport,
  closeImport,
  openAccount,
}: UseAppFileDropOptions) => {
  const [preloadedFile, setPreloadedFile] = useState<FileDropResult | null>(null);
  const [preloadedConfigProfile, setPreloadedConfigProfile] =
    useState<MobileConfigImportProfile | null>(null);
  const [preloadedConfig, setPreloadedConfig] = useState<MobileConfigImportSelection | null>(null);
  const canHandleGlobalFileDrop = !isAnyModalOpen && !isImportOpen;

  const handleImportClose = useCallback(() => {
    closeImport();
    setPreloadedFile(null);
  }, [closeImport]);

  const clearPreloadedConfig = useCallback(() => {
    setPreloadedConfigProfile(null);
    setPreloadedConfig(null);
  }, []);

  const selectPreloadedConfig = useCallback(
    (settings: MobileConfigCalDAVSettings, profile: MobileConfigImportProfile) => {
      setPreloadedConfig({
        format: profile.format,
        signature: profile.signature,
        settings,
      });
      setPreloadedConfigProfile(profile.candidates.length > 1 ? profile : null);
      openAccount({ accountId: null });
    },
    [openAccount],
  );

  const returnToPreloadedConfigChooser = useCallback(() => {
    setPreloadedConfig(null);
  }, []);

  const handleDroppedFile = useCallback(
    (file: FileDropResult) => {
      if (!canHandleGlobalFileDrop) return;

      setPreloadedFile(file);
      openImport();
    },
    [canHandleGlobalFileDrop, openImport],
  );

  const handleDroppedConfigProfile = useCallback(
    (profile: MobileConfigImportProfile) => {
      if (!canHandleGlobalFileDrop) return;

      if (profile.candidates.length === 1) {
        const [settings] = profile.candidates;
        selectPreloadedConfig(settings, profile);
        return;
      }

      setPreloadedConfig(null);
      setPreloadedConfigProfile(profile);
    },
    [canHandleGlobalFileDrop, selectPreloadedConfig],
  );

  const handleConfigProfileError = useCallback(
    (message: string) => {
      if (!canHandleGlobalFileDrop) return;

      toastManager.error('Could not import configuration profile', message, 'config-profile-drop');
    },
    [canHandleGlobalFileDrop],
  );

  const {
    isDragOver,
    isUnsupportedFile,
    handleFileDrop,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    clearDragState,
  } = useFileDrop({
    onFileDrop: handleDroppedFile,
    onConfigProfileDrop: handleDroppedConfigProfile,
    onConfigProfileError: handleConfigProfileError,
  });

  const rootFileDropProps = useMemo(
    () => ({
      onDrop: handleFileDrop,
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
    }),
    [handleFileDrop, handleDragOver, handleDragEnter, handleDragLeave],
  );

  return {
    preloadedFile,
    preloadedConfigProfile,
    preloadedConfig,
    canHandleGlobalFileDrop,
    isDragOver,
    isUnsupportedFile,
    clearDragState,
    clearPreloadedConfig,
    returnToPreloadedConfigChooser,
    selectPreloadedConfig,
    handleImportClose,
    rootFileDropProps,
  };
};
