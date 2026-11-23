import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import AlertCircle from 'lucide-react/icons/alert-circle';
import FileText from 'lucide-react/icons/file-text';
import Upload from 'lucide-react/icons/upload';
import X from 'lucide-react/icons/x';
import { type DragEvent, type KeyboardEvent, type MouseEvent, useState } from 'react';

interface FileUploadStepProps {
  fileName: string;
  isDraggingOver: boolean;
  onFileSelect: (file: File) => Promise<void>;
  onReset: () => void;
  onDrop: (e: DragEvent) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onFileError?: (message: string) => void;
  error: string;
  parseErrors: string[];
}

export const FileUploadStep = ({
  fileName,
  isDraggingOver,
  onFileSelect,
  onReset,
  onDrop,
  onDragEnter,
  onDragLeave,
  onFileError,
  error,
  parseErrors,
}: FileUploadStepProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    setIsProcessing(true);
    try {
      const selectedPath = await open({
        title: 'Import Tasks',
        multiple: false,
        filters: [{ name: 'Task files', extensions: ['ics', 'ical', 'json'] }],
      });

      if (!selectedPath || Array.isArray(selectedPath)) return;

      const content = await readTextFile(selectedPath);
      const fileName = selectedPath.split(/[\\/]/).pop() || selectedPath;
      await onFileSelect(new File([content], fileName));
    } catch {
      onFileError?.('Failed to read file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void handleClick();
    }
  };

  const handleRemoveFile = (e: MouseEvent) => {
    e.stopPropagation();
    onReset();
  };

  const getFileIcon = () => {
    if (!fileName) return null;
    // could extend with different icons per file type based on extension
    return <FileText className="h-5 w-5" />;
  };

  const handleDragLeave = (e: DragEvent) => {
    // only trigger leave if we're actually leaving the drop zone
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      onDragLeave();
    }
  };

  return (
    <div className="space-y-3">
      {/* biome-ignore lint/a11y/useSemanticElements: drop zone requires div for drag-drop functionality */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // show copy cursor when dragging over drop zone
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDragEnter={onDragEnter}
        onDragLeave={handleDragLeave}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center outline-hidden transition-all focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-800 ${
          isDraggingOver
            ? 'scale-[1.02] border-primary-ink bg-primary-500/10'
            : fileName
              ? 'border-primary-ink bg-primary-500/5'
              : 'border-surface-300 hover:border-primary-ink hover:bg-surface-50 dark:border-surface-600 dark:hover:border-primary-500 dark:hover:bg-surface-700/50'
        }`}
      >
        {isProcessing ? (
          <div className="pointer-events-none flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full border-2 border-primary-ink border-t-transparent motion-safe:animate-spin" />
            <p className="text-sm text-surface-600 dark:text-surface-400">Reading file...</p>
          </div>
        ) : fileName ? (
          <div className="pointer-events-none flex items-center justify-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 shadow-xs dark:border-surface-600 dark:bg-surface-800">
              <span className="text-primary-ink">{getFileIcon()}</span>
              <span className="max-w-50 truncate font-medium text-sm text-surface-700 dark:text-surface-300">
                {fileName}
              </span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="pointer-events-auto rounded-sm p-1 text-surface-400 outline-hidden transition-colors hover:bg-surface-100 hover:text-surface-600 focus-visible:ring-2 focus-visible:ring-primary-ink dark:hover:bg-surface-700 dark:hover:text-surface-300"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`pointer-events-none mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                isDraggingOver
                  ? 'bg-primary-500/15 text-primary-ink'
                  : 'bg-surface-100 text-surface-400 dark:bg-surface-700'
              }`}
            >
              <Upload className="h-6 w-6" />
            </div>
            <div className="pointer-events-none space-y-1">
              <p className="font-medium text-sm text-surface-700 dark:text-surface-300">
                {isDraggingOver ? 'Drop file here' : 'Drop a file here, or click to browse'}
              </p>
              <p className="text-surface-500 text-xs dark:text-surface-400">
                Supports .ics, .ical, .json, and Tasks.org backup files
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-semantic-error/30 bg-semantic-error/10 p-3 text-sm text-surface-700 dark:text-surface-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-semantic-error" />
          <span>{error}</span>
        </div>
      )}

      {parseErrors.length > 0 && (
        <div className="rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 p-3 text-sm text-surface-700 dark:text-surface-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-semantic-warning" />
            <div className="space-y-1">
              <p className="font-medium">Some items couldn't be parsed:</p>
              <ul className="space-y-0.5 text-xs opacity-80">
                {parseErrors.slice(0, 3).map((err) => (
                  <li key={err}>• {err}</li>
                ))}
                {parseErrors.length > 3 && <li>• ...and {parseErrors.length - 3} more</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
