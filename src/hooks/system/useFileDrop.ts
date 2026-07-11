import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { platform } from '@tauri-apps/plugin-os';
import { type DragEvent, useCallback, useEffect, useRef, useState } from 'react';
import { loggers } from '$lib/logger';
import { isMobileConfigFileName, MOBILE_CONFIG_EXTENSION } from '$lib/mobileconfig';
import { importMobileConfig } from '$lib/mobileconfig/import';
import type {
  MobileConfigImportFailureReason,
  MobileConfigImportProfile,
} from '$types/mobileconfig';

const log = loggers.fileDrop;

// supported file extensions for import
const SUPPORTED_EXTENSIONS = ['.ics', '.ical', '.json', MOBILE_CONFIG_EXTENSION];
const CONFIG_PROFILE_IMPORT_ERRORS: Record<MobileConfigImportFailureReason, string> = {
  'file-too-large': 'This configuration profile is too large to import.',
  'invalid-profile': 'This file is not a valid configuration profile.',
  'invalid-cms': 'This signed configuration profile is invalid.',
  'encrypted-profile-unsupported': 'Encrypted configuration profiles are not supported yet.',
  'missing-payload-content': 'This configuration profile does not contain payload data.',
  'missing-caldav-payload': 'This configuration profile does not contain CalDAV account settings.',
  'invalid-caldav-payload': 'This configuration profile contains invalid CalDAV account settings.',
  'missing-hostname': 'A CalDAV account in this profile does not specify a server hostname.',
  'invalid-hostname': 'A CalDAV account in this profile has an invalid server hostname.',
  'invalid-port': 'A CalDAV account in this profile has an invalid server port.',
  'invalid-principal-url': 'A CalDAV account in this profile has an invalid principal URL.',
  'unexpected-error': 'The file may be corrupted or may not be a configuration profile.',
};
const CONFIG_PROFILE_READ_ERROR = 'The file could not be read as a configuration profile.';

const isSupportedFile = (filename: string) => {
  const lower = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

export interface FileDropResult {
  name: string;
  content: string;
}

interface UseFileDropOptions {
  onFileDrop?: (file: FileDropResult) => void;
  onConfigProfileDrop?: (profile: MobileConfigImportProfile) => void;
  onConfigProfileError?: (message: string) => void;
}

interface UseFileDropReturn {
  isDragOver: boolean;
  isUnsupportedFile: boolean;
  handleFileDrop: (e: DragEvent) => Promise<void>;
  handleDragOver: (e: DragEvent) => void;
  handleDragEnter: (e: DragEvent) => void;
  handleDragLeave: (e: DragEvent) => void;
  clearDragState: () => void;
}

/**
 * hook for handling file drag and drop functionality
 * supports .ics, .ical, and .json files for task import
 * supports .mobileconfig files for CalDAV account configuration
 */
export const useFileDrop = (options: UseFileDropOptions = {}): UseFileDropReturn => {
  const { onFileDrop, onConfigProfileDrop, onConfigProfileError } = options;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUnsupportedFile, setIsUnsupportedFile] = useState(false);
  // tracks whether a Tauri native drag is active. on Linux/WebKitGTK, HTML5 drag
  // events still fire alongside Tauri events but dataTransfer is always empty, so
  // we use this ref to stop them from overriding the state Tauri already set
  const tauriDragActive = useRef(false);

  const processMobileConfigBytes = useCallback(
    async (bytes: Uint8Array) => {
      try {
        const result = await importMobileConfig(bytes);
        if (result.ok) {
          onConfigProfileDrop?.(result);
        } else {
          log.warn(`Failed to import Apple Configuration Profile: ${result.reason}`);
          onConfigProfileError?.(CONFIG_PROFILE_IMPORT_ERRORS[result.reason]);
        }
      } catch (err) {
        log.error('Failed to read Apple Configuration Profile:', err);
        onConfigProfileError?.(CONFIG_PROFILE_READ_ERROR);
      }
    },
    [onConfigProfileDrop, onConfigProfileError],
  );

  // process a file by its path; used by Tauri drop events (Linux/WebKitGTK)
  const processFilePath = useCallback(
    async (filePath: string) => {
      const fileName = filePath.split('/').pop() || filePath;

      if (!isSupportedFile(fileName)) return;

      const isMobileConfig = isMobileConfigFileName(fileName);
      if (isMobileConfig) {
        try {
          const rawBytes = await invoke<number[]>('read_file_bytes', { path: filePath });
          await processMobileConfigBytes(new Uint8Array(rawBytes));
        } catch (err) {
          log.error('Failed to read Apple Configuration Profile:', err);
          onConfigProfileError?.(CONFIG_PROFILE_READ_ERROR);
        }
        return;
      }

      const isIcs = fileName.endsWith('.ics') || fileName.endsWith('.ical');
      const isJson = fileName.endsWith('.json');

      if (isIcs || isJson) {
        try {
          const rawBytes = await invoke<number[]>('read_file_bytes', { path: filePath });
          const content = new TextDecoder('utf-8').decode(new Uint8Array(rawBytes));
          onFileDrop?.({ name: fileName, content });
        } catch (err) {
          log.error('Failed to read dropped file:', err);
        }
      }
    },
    [onFileDrop, onConfigProfileError, processMobileConfigBytes],
  );

  // register Tauri drop event listeners for Linux (WebKitGTK)
  // on Linux, dragDropEnabled: true in tauri.linux.conf.json disables HTML5 DnD and enables
  // these Tauri events instead. on macOS/Windows, we must NOT register these listeners: even
  // with dragDropEnabled: false, registering them causes Tauri to intercept drags at the
  // native level and empties e.dataTransfer.files, breaking HTML5 DnD
  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    const setup = async () => {
      if (platform() !== 'linux') return;

      const unlistenEnter = await listen('tauri://drag-enter', () => {
        tauriDragActive.current = true;
        setIsDragOver(true);
        setIsUnsupportedFile(false);
      });
      const unlistenLeave = await listen('tauri://drag-leave', () => {
        tauriDragActive.current = false;
        setIsDragOver(false);
        setIsUnsupportedFile(false);
      });
      const unlistenDrop = await listen<{ paths: string[] }>('tauri://drag-drop', async (event) => {
        tauriDragActive.current = false;
        setIsDragOver(false);
        setIsUnsupportedFile(false);
        const path = event.payload.paths[0];
        if (path) {
          await processFilePath(path);
        }
      });

      unlisteners.push(unlistenEnter, unlistenLeave, unlistenDrop);
    };

    setup().catch((err) => log.error('Failed to set up Tauri drop listeners:', err));

    return () => {
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, [processFilePath]);

  // check if dragged files are supported
  // note: In Tauri/WebKit, dataTransfer.items is empty during drag for security reasons
  // we can only show a generic message listing all supported file types
  const checkDraggedFiles = useCallback((e: DragEvent) => {
    const types = e.dataTransfer?.types || [];
    // Tauri only exposes ["Files"] in types array during drag, no specific file info
    return types.includes('Files');
  }, []);

  // handle file drop for import
  const handleFileDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setIsUnsupportedFile(false);

      const file = e.dataTransfer?.files?.[0];
      if (!file) {
        log.warn('No file in drop event');
        return;
      }

      // check if it's a supported file type
      if (!isSupportedFile(file.name)) {
        // unsupported file - don't do anything (already showed feedback during drag)
        return;
      }

      // check if it's an Apple Configuration Profile
      const isMobileConfig = isMobileConfigFileName(file.name);
      if (isMobileConfig) {
        try {
          // read file as array buffer first
          const arrayBuffer = await file.arrayBuffer();
          await processMobileConfigBytes(new Uint8Array(arrayBuffer));
        } catch (err) {
          log.error('Failed to read Apple Configuration Profile:', err);
          onConfigProfileError?.(CONFIG_PROFILE_READ_ERROR);
        }
        return;
      }

      // check if it's a calendar or task file
      const isIcs = file.name.endsWith('.ics') || file.name.endsWith('.ical');
      const isJson = file.name.endsWith('.json');

      if (isIcs || isJson) {
        try {
          const content = await file.text();
          onFileDrop?.({ name: file.name, content });
        } catch (err) {
          log.error('Failed to read dropped file:', err);
        }
      }
    },
    [onFileDrop, onConfigProfileError, processMobileConfigBytes],
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // on Linux/WebKitGTK, Tauri intercepts the drop so HTML5 dataTransfer is always
      // empty. skip state updates; the Tauri drag-enter event already set them correctly
      if (tauriDragActive.current) return;

      // check if files are being dragged
      const isSupported = checkDraggedFiles(e);
      setIsUnsupportedFile(!isSupported);

      // set the dropEffect to show appropriate cursor
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = isSupported ? 'copy' : 'none';
      }

      setIsDragOver(true);
    },
    [checkDraggedFiles],
  );

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // same as handleDragOver: skip when Tauri is already handling the drag
      if (tauriDragActive.current) return;

      const isSupported = checkDraggedFiles(e);
      setIsUnsupportedFile(!isSupported);

      setIsDragOver(true);
    },
    [checkDraggedFiles],
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
      setIsUnsupportedFile(false);
    }
  }, []);

  const clearDragState = useCallback(() => {
    setIsDragOver(false);
    setIsUnsupportedFile(false);
  }, []);

  return {
    isDragOver,
    isUnsupportedFile,
    handleFileDrop,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    clearDragState,
  };
};
