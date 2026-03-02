import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import AlertCircle from 'lucide-react/icons/alert-circle';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import ChevronDown from 'lucide-react/icons/chevron-down';
import Copy from 'lucide-react/icons/copy';
import Download from 'lucide-react/icons/download';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { EXPORT_FORMATS } from '@/data/export';
import { useModalEscapeKey } from '@/hooks/useModalEscapeKey';
import { createLogger } from '@/lib/logger';
import type { Calendar, ExportFormat, ExportType, Task } from '@/types';
import { getExportContent, getExportDescription, getExportTitle } from '@/utils/export';
import { downloadFile } from '../../utils/file';

const log = createLogger('Export', '#f59e0b');

interface ExportModalProps {
  tasks: Task[];
  fileName?: string;
  type?: ExportType;
  calendars?: Calendar[];
  calendarName?: string;
  onClose: () => void;
}

export function ExportModal({
  tasks,
  fileName = 'export',
  type = 'tasks',
  calendars = [],
  calendarName,
  onClose,
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('ics');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useModalEscapeKey(onClose);

  const handleCopyToClipboard = async () => {
    try {
      const content = getExportContent(selectedFormat, tasks);
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
      log.error('Failed to copy to clipboard:', err);
    }
  };

  const handleExportToFile = async () => {
    try {
      setExporting(true);
      setError(null);

      const content = getExportContent(selectedFormat, tasks);
      const format = EXPORT_FORMATS.find((f) => f.id === selectedFormat);
      const fullFileName = `${fileName}.${format?.ext}`;

      try {
        // use the dialog plugin to get save path
        const path = await save({
          defaultPath: fullFileName,
          filters: [
            {
              name: format?.label || 'Export',
              extensions: [format?.ext || 'txt'],
            },
          ],
        });

        if (path) {
          // write the file using the fs plugin
          await writeTextFile(path, content);
          onClose();
        }
      } catch (err: unknown) {
        // if dialog is cancelled or error, fall back to browser download
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.includes('dialog cancelled') || errorMessage.includes('user closed')) {
          // silently handle user cancellation
          setExporting(false);
          return;
        }

        // for any other error, try browser fallback
        downloadFile(content, fullFileName, `text/plain;charset=utf-8`);
        onClose();
      }
    } catch (err) {
      setError(`Failed to export: ${err instanceof Error ? err.message : 'Unknown error'}`);
      log.error('Failed to export:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col animate-scale-in">
        <div className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 p-6 flex-shrink-0 flex items-start justify-between rounded-t-xl">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
              {getExportTitle(type)}
            </h2>
            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
              {getExportDescription(type, tasks, calendars, calendarName)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
              Export Format
            </p>
            <div className="grid grid-cols-1 gap-2">
              {EXPORT_FORMATS.map((format) => (
                <button
                  type="button"
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                    selectedFormat === format.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
                  }`}
                >
                  <div className="flex-1">
                    <div
                      className={`font-medium ${
                        selectedFormat === format.id
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-surface-700 dark:text-surface-300'
                      }`}
                    >
                      {format.label}
                    </div>
                    <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                      {format.description}
                    </div>
                  </div>
                  {selectedFormat === format.id && (
                    <div className="text-primary-500 dark:text-primary-400 flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-left"
          >
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
              Preview
            </span>
            <ChevronDown
              className={`w-4 h-4 text-surface-500 dark:text-surface-400 transition-transform ${showPreview ? 'rotate-180' : ''}`}
            />
          </button>

          {showPreview && (
            <div className="bg-surface-50 dark:bg-surface-900 p-3 rounded-lg border border-surface-200 dark:border-surface-700 max-h-24 overflow-y-auto">
              <pre className="text-xs text-surface-700 dark:text-surface-300 font-mono whitespace-pre-wrap break-words">
                {getExportContent(selectedFormat, tasks).substring(0, 150)}
                {getExportContent(selectedFormat, tasks).length > 150 ? '...' : ''}
              </pre>
            </div>
          )}
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700 p-6 flex gap-3 flex-shrink-0 bg-white dark:bg-surface-800 rounded-b-xl">
          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors font-medium"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleExportToFile}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
