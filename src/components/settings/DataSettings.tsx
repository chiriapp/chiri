import { appLogDir } from '@tauri-apps/api/path';
import { openPath } from '@tauri-apps/plugin-opener';
import Check from 'lucide-react/icons/check';
import Copy from 'lucide-react/icons/copy';
import Download from 'lucide-react/icons/download';
import FolderOpen from 'lucide-react/icons/folder-open';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Upload from 'lucide-react/icons/upload';
import { useEffect, useRef, useState } from 'react';
import { useConfirmDialog } from '$context/confirmDialogContext';
import { useSettingsStore } from '$context/settingsContext';
import { useDatabaseDeletion } from '$hooks/deletion/useDatabaseDeletion';
import { createDiagnosticsReport, createLogExport, getDatabaseDirectory } from '$lib/diagnostics';
import { setEditorOpen } from '$lib/store/ui';
import { exportSettingsToFile, importSettingsFromFile } from '$utils/settings';

interface DataSettingsProps {
  onClose: () => void;
}

export const DataSettings = ({ onClose }: DataSettingsProps) => {
  const { exportSettings, importSettings, resetSettings } = useSettingsStore();
  const { confirm, close } = useConfirmDialog();
  const { deleteLocalDatabase } = useDatabaseDeletion();
  const [diagnosticsMessage, setDiagnosticsMessage] = useState<string | null>(null);
  const [didCopyDiagnostics, setDidCopyDiagnostics] = useState(false);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const showCopyFeedback = () => {
    setDidCopyDiagnostics(true);
    if (copyFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }
    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setDidCopyDiagnostics(false);
      copyFeedbackTimeoutRef.current = null;
    }, 1400);
  };

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error';
  };

  const handleResetPreferences = async () => {
    const confirmed = await confirm({
      title: 'Reset Preferences',
      message: (
        <p>
          <span className="font-bold">Are you sure?</span> This will restore all user preferences to
          their default values.
        </p>
      ),
      confirmLabel: 'Reset Preferences',
      destructive: true,
    });

    close();
    if (confirmed) {
      // close the task editor if open
      setEditorOpen(false);
      // reset settings
      resetSettings();
      // close the settings modal (and any other modals)
      onClose();
    }
  };

  const handleResetDatabase = async () => {
    await deleteLocalDatabase();
  };

  const handleCopyDiagnostics = async () => {
    try {
      const report = await createDiagnosticsReport(exportSettings());
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      showCopyFeedback();
    } catch (error) {
      setDiagnosticsMessage(`Could not copy diagnostics report: ${getErrorMessage(error)}`);
    }
  };

  const handleExportDiagnostics = async () => {
    try {
      const report = await createDiagnosticsReport(exportSettings());
      await exportSettingsToFile(`${JSON.stringify(report, null, 2)}\n`, 'chiri-diagnostics.json');
      setDiagnosticsMessage('Diagnostics report exported.');
    } catch (error) {
      setDiagnosticsMessage(`Could not export diagnostics report: ${getErrorMessage(error)}`);
    }
  };

  const handleExportLogs = async () => {
    try {
      const logs = await createLogExport();
      await exportSettingsToFile(`${JSON.stringify(logs, null, 2)}\n`, 'chiri-logs.json');
      setDiagnosticsMessage('Logs exported.');
    } catch (error) {
      setDiagnosticsMessage(`Could not export logs: ${getErrorMessage(error)}`);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">
        Data & diagnostics
      </h3>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Export settings</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Save your preferences to a file
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const json = exportSettings();
              await exportSettingsToFile(json);
            }}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Import settings</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Restore preferences from a backup file
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await importSettingsFromFile(importSettings);
            }}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
        </div>

        <div className="border-surface-200 border-t px-4 py-3 dark:border-surface-700">
          <p className="text-surface-400 text-xs dark:text-surface-500">
            Account credentials and task data are not included.
          </p>
        </div>
      </div>

      <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Diagnostics</h4>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">Diagnostics report</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleCopyDiagnostics}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                didCopyDiagnostics
                  ? 'bg-primary-500 text-primary-contrast'
                  : 'bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600'
              }`}
            >
              {didCopyDiagnostics ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {didCopyDiagnostics ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handleExportDiagnostics}
              className="flex items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">Logs folder</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleExportLogs}
              className="flex items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={async () => openPath(await appLogDir())}
              className="flex items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
            >
              <FolderOpen className="h-4 w-4" />
              Open
            </button>
          </div>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">Local database folder</p>
          </div>
          <button
            type="button"
            onClick={async () => openPath(await getDatabaseDirectory())}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
          >
            <FolderOpen className="h-4 w-4" />
            Open
          </button>
        </div>

        {diagnosticsMessage ? (
          <div className="border-surface-200 border-t px-4 py-3 dark:border-surface-700">
            <p className="text-surface-500 text-xs dark:text-surface-400">{diagnosticsMessage}</p>
          </div>
        ) : null}
      </div>

      <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Reset</h4>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-300">Reset preferences</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Restore all preferences to their default values
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetPreferences}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-semantic-error text-sm">Reset database</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Deletes all local data. Only use this as a last resort.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDatabase}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-semantic-error px-3 py-1.5 text-primary-contrast text-sm outline-hidden transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-semantic-error focus-visible:ring-inset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
