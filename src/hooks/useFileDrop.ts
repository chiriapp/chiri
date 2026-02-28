import { useCallback, useState } from 'react';
import { createLogger } from '@/lib/logger';
import { type CalDAVConfig, parseAppleConfigProfile } from '@/utils/mobileconfig';

const log = createLogger('FileDrop', '#eab308');

// Supported file extensions for import
const SUPPORTED_EXTENSIONS = ['.ics', '.ical', '.json', '.mobileconfig'];

function isSupportedFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export interface FileDropResult {
  name: string;
  content: string;
}

export interface UseFileDropOptions {
  onFileDrop?: (file: FileDropResult) => void;
  onConfigProfileDrop?: (config: CalDAVConfig) => void;
}

export interface UseFileDropReturn {
  isDragOver: boolean;
  isUnsupportedFile: boolean;
  handleFileDrop: (e: React.DragEvent) => Promise<void>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  clearDragState: () => void;
}

/**
 * Hook for handling file drag and drop functionality
 * Supports .ics, .ical, and .json files for task import
 * Supports .mobileconfig files for CalDAV account configuration
 */
export function useFileDrop(options: UseFileDropOptions = {}): UseFileDropReturn {
  const { onFileDrop, onConfigProfileDrop } = options;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUnsupportedFile, setIsUnsupportedFile] = useState(false);

  // Check if dragged files are supported
  // Note: In Tauri/WebKit, dataTransfer.items is empty during drag for security reasons
  // We can only show a generic message listing all supported file types
  const checkDraggedFiles = useCallback((e: React.DragEvent): boolean => {
    const types = e.dataTransfer?.types || [];
    // Tauri only exposes ["Files"] in types array during drag, no specific file info
    return types.includes('Files');
  }, []);

  // handle file drop for import
  const handleFileDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setIsUnsupportedFile(false);

      const file = e.dataTransfer?.files?.[0];
      if (!file) {
        log.warn('No file in drop event');
        return;
      }

      // Check if it's a supported file type
      if (!isSupportedFile(file.name)) {
        // Unsupported file - don't do anything (already showed feedback during drag)
        return;
      }

      // Check if it's an Apple Configuration Profile
      const isMobileConfig = file.name.toLowerCase().endsWith('.mobileconfig');
      if (isMobileConfig) {
        try {
          const content = await file.text();
          const config = parseAppleConfigProfile(content);
          if (config) {
            onConfigProfileDrop?.(config);
          } else {
            log.warn('Failed to parse Apple Configuration Profile');
          }
        } catch (err) {
          log.error('Failed to read Apple Configuration Profile:', err);
        }
        return;
      }

      // check if it's a calendar or task file
      const isIcs = file.name.endsWith('.ics') || file.name.endsWith('.ical');
      const isJson = file.name.endsWith('.json');

      if (isIcs || isJson) {
        try {
          const content = await file.text();
          // check if JSON is a tasks file (not settings)
          if (isJson) {
            try {
              const parsed = JSON.parse(content);
              // check if it looks like a tasks export (array with task properties)
              if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title) {
                onFileDrop?.({ name: file.name, content });
              }
            } catch {
              // not valid JSON, ignore
            }
          } else {
            onFileDrop?.({ name: file.name, content });
          }
        } catch (err) {
          log.error('Failed to read dropped file:', err);
        }
      }
    },
    [onFileDrop, onConfigProfileDrop],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Check if files are being dragged
      const isSupported = checkDraggedFiles(e);
      setIsUnsupportedFile(!isSupported);

      // Set the dropEffect to show appropriate cursor
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = isSupported ? 'copy' : 'none';
      }

      setIsDragOver(true);
    },
    [checkDraggedFiles],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const isSupported = checkDraggedFiles(e);
      setIsUnsupportedFile(!isSupported);

      setIsDragOver(true);
    },
    [checkDraggedFiles],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
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
}
