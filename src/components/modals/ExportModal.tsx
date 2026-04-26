import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import AlertCircle from 'lucide-react/icons/alert-circle';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import Copy from 'lucide-react/icons/copy';
import Download from 'lucide-react/icons/download';
import Info from 'lucide-react/icons/info';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import { EXPORT_FORMATS } from '$constants/export';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';
import {
  exportTasksAsCsv,
  exportTasksAsIcs,
  exportTasksAsJson,
  exportTasksAsMarkdown,
} from '$lib/ical/export';
import { loggers } from '$lib/logger';
import type { Calendar, ExportFormat, ExportType, Task } from '$types';
import { downloadFile, pluralize } from '$utils/misc';

const log = loggers.export;

const getExportTitle = (type: ExportType) => {
  switch (type) {
    case 'all-calendars':
      return 'Export all calendars';
    case 'single-calendar':
      return 'Export calendar';
    case 'tasks':
      return 'Export tasks';
  }
};

const getExportDescription = (
  type: ExportType,
  tasks: Task[],
  calendars: Calendar[],
  calendarName?: string,
) => {
  switch (type) {
    case 'all-calendars':
      return `${calendars.length || 'No'} ${pluralize(calendars.length, 'calendar')}, ${tasks.length || 'No'} ${pluralize(tasks.length, 'task')}`;
    case 'single-calendar':
      return `${tasks.length || 'No'} ${pluralize(tasks.length, 'task')} in ${calendarName || 'Calendar'}`;
    case 'tasks': {
      const subtaskCount = tasks.filter((t) => t.parentUid).length;
      const parentTaskCount = tasks.length - subtaskCount;
      if (subtaskCount > 0) {
        return `${parentTaskCount} ${pluralize(parentTaskCount, 'task')} + ${subtaskCount} ${pluralize(subtaskCount, 'subtask')}`;
      }
      return `${tasks.length} ${pluralize(tasks.length, 'task')}`;
    }
  }
};

const getExportContent = (format: ExportFormat, tasks: Task[]) => {
  switch (format) {
    case 'ics':
      return exportTasksAsIcs(tasks);
    case 'json':
      return exportTasksAsJson(tasks);
    case 'markdown':
      return exportTasksAsMarkdown(tasks);
    case 'csv':
      return exportTasksAsCsv(tasks);
    default:
      return '';
  }
};

interface ExportModalProps {
  tasks: Task[];
  fileName?: string;
  type?: ExportType;
  calendars?: Calendar[];
  calendarName?: string;
  onClose: () => void;
}

export const ExportModal = ({
  tasks,
  fileName = 'export',
  type = 'tasks',
  calendars = [],
  calendarName,
  onClose,
}: ExportModalProps) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('ics');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const focusTrapRef = useFocusTrap();

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
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col animate-scale-in"
      >
        <div className="flex items-start justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
              {getExportTitle(type)}
            </h2>
            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
              {getExportDescription(type, tasks, calendars, calendarName)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors flex-shrink-0 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <p className="block text-sm font-medium text-surface-700 dark:text-surface-300">
              Format
            </p>
            <div className="grid grid-cols-1 gap-2">
              {EXPORT_FORMATS.map((format) => (
                <button
                  type="button"
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors text-left outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    selectedFormat === format.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
                  }`}
                >
                  <div className="flex-1">
                    <div
                      className={`font-medium text-sm ${
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

          {tasks.length === 0 && (
            <div className="flex gap-2 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 px-3 py-2 text-xs text-primary-700 dark:text-primary-300">
              <Info className="mt-px size-3.5 shrink-0" />
              <span>There are no tasks to export.</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-surface-200 dark:border-surface-700">
          <button
            type="button"
            onClick={handleCopyToClipboard}
            disabled={tasks.length === 0}
            className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleExportToFile}
            disabled={exporting || tasks.length === 0}
            className="px-4 py-2 text-sm font-medium text-primary-contrast bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-hidden focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
};
