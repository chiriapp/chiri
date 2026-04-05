import AlertCircle from 'lucide-react/icons/alert-circle';
import FileText from 'lucide-react/icons/file-text';
import Upload from 'lucide-react/icons/upload';
import X from 'lucide-react/icons/x';
import { useRef, useState } from 'react';
import type { FileUploadStepProps } from '$types/import';

export const FileUploadStep = ({
  fileName,
  isDraggingOver,
  onFileSelect,
  onReset,
  onDrop,
  onDragEnter,
  onDragLeave,
  error,
  parseErrors,
}: FileUploadStepProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      await onFileSelect(file);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    if (!fileName) return null;
    // Could extend with different icons per file type based on extension
    return <FileText className="w-5 h-5" />;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only trigger leave if we're actually leaving the drop zone
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      onDragLeave();
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone - clicking opens file picker, drag/drop handled directly */}
      {/* biome-ignore lint/a11y/useSemanticElements: Drop zone requires div for drag-drop functionality */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Show copy cursor when dragging over drop zone
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDragEnter={onDragEnter}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
          isDraggingOver
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.02]'
            : fileName
              ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10'
              : 'border-surface-300 dark:border-surface-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-surface-50 dark:hover:bg-surface-700/50'
        }`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-surface-600 dark:text-surface-400">Reading file...</p>
          </div>
        ) : fileName ? (
          <div className="flex items-center justify-center gap-3 pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-lg shadow-xs">
              <span className="text-primary-600 dark:text-primary-400">{getFileIcon()}</span>
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300 max-w-[200px] truncate">
                {fileName}
              </span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-sm transition-colors pointer-events-auto outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center transition-colors pointer-events-none ${
                isDraggingOver
                  ? 'bg-primary-100 dark:bg-primary-800/50 text-primary-600 dark:text-primary-400'
                  : 'bg-surface-100 dark:bg-surface-700 text-surface-400'
              }`}
            >
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1 pointer-events-none">
              <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                {isDraggingOver ? 'Drop file here' : 'Drop a file here, or click to browse'}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Supports .ics, .ical, .json, and Tasks.org backup files
              </p>
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".ics,.ical,.json"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Select file to import"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Parse Warnings */}
      {parseErrors.length > 0 && (
        <div className="p-3 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Some items couldn't be parsed:</p>
              <ul className="text-xs space-y-0.5 opacity-80">
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
