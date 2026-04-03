import Check from 'lucide-react/icons/check';
import ChevronLeft from 'lucide-react/icons/chevron-left';
import Loader2 from 'lucide-react/icons/loader-2';
import Upload from 'lucide-react/icons/upload';
import X from 'lucide-react/icons/x';
import { useCallback, useEffect, useState } from 'react';
import { DestinationStep } from '$components/modals/import/DestinationStep';
import { FileUploadStep } from '$components/modals/import/FileUploadStep';
import { ReviewStep } from '$components/modals/import/ReviewStep';
import { StepIndicator } from '$components/modals/import/StepIndicator';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useCreateTask } from '$hooks/queries/useTasks';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';
import { parseIcsFile, parseJsonTasksFile } from '$lib/ical/import';
import { loggers } from '$lib/logger';
import type { Calendar, Task } from '$types';
import type { ImportStep, ParsedTaskWithStatus } from '$types/import';
import { generateUUID, pluralize } from '$utils/misc';

const log = loggers.import;

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  preloadedFile?: { name: string; content: string } | null;
  /** Callback when file is dropped directly on the modal's drop zone */
  onFileDrop?: () => void;
}

export const ImportModal = ({ isOpen, onClose, preloadedFile, onFileDrop }: ImportModalProps) => {
  const { data: accounts = [] } = useAccounts();
  const createTaskMutation = useCreateTask();

  // State
  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState('');
  const [parsedTasks, setParsedTasks] = useState<ParsedTaskWithStatus[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [error, setError] = useState('');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSuccess, setImportSuccess] = useState(false);
  const [isDraggingInDropZone, setIsDraggingInDropZone] = useState(false);

  const focusTrapRef = useFocusTrap(isOpen);

  // Get all calendars and find selected calendar
  const allCalendars: Calendar[] = accounts.flatMap((account) => account.calendars);
  const hasAccounts = accounts.length > 0;
  const selectedCalendar = allCalendars.find((c) => c.id === selectedCalendarId);

  // Auto-select first account/calendar if none selected
  useEffect(() => {
    if (isOpen && hasAccounts && !selectedAccountId) {
      const firstAccount = accounts[0];
      setSelectedAccountId(firstAccount.id);
      if (firstAccount.calendars.length > 0) {
        setSelectedCalendarId(firstAccount.calendars[0].id);
      }
    }
  }, [isOpen, hasAccounts, selectedAccountId, accounts]);

  // Handle preloaded file
  // biome-ignore lint/correctness/useExhaustiveDependencies: handleFileContent only changes when hasAccounts changes, which is rare
  useEffect(() => {
    if (isOpen && preloadedFile) {
      handleFileContent(preloadedFile.name, preloadedFile.content);
    }
  }, [isOpen, preloadedFile]);

  // Handle ESC key - uses handleClose which is defined below
  // Note: useModalEscapeKey is called conditionally via the enabled option
  useModalEscapeKey(
    () => {
      // Reset all state on close
      setStep('upload');
      setParsedTasks([]);
      setFileName('');
      setError('');
      setParseErrors([]);
      setImportSuccess(false);
      setImportProgress(0);
      setIsImporting(false);
      setIsDraggingInDropZone(false);

      // Clear App's drag state if user was dragging when modal closed
      onFileDrop?.();

      onClose();
    },
    { enabled: isOpen && !isImporting },
  );

  // Reset state when modal closes (including via parent setting isOpen to false)
  useEffect(() => {
    if (!isOpen) {
      // Reset all state when modal is closed
      setStep('upload');
      setParsedTasks([]);
      setFileName('');
      setError('');
      setParseErrors([]);
      setImportSuccess(false);
      setImportProgress(0);
      setIsImporting(false);
      setIsDraggingInDropZone(false);

      // Clear App's drag state if user was dragging when modal closed
      onFileDrop?.();
    }
  }, [isOpen, onFileDrop]);

  const handleFileContent = useCallback((name: string, content: string) => {
    setFileName(name);
    setError('');
    setParseErrors([]);
    setImportSuccess(false);

    let tasks: Partial<Task>[] = [];

    try {
      if (name.endsWith('.ics') || name.endsWith('.ical')) {
        tasks = parseIcsFile(content);
      } else if (name.endsWith('.json')) {
        tasks = parseJsonTasksFile(content);
      } else {
        // Try to detect format by content
        if (content.trim().startsWith('BEGIN:VCALENDAR')) {
          tasks = parseIcsFile(content);
        } else if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
          tasks = parseJsonTasksFile(content);
        } else {
          setError('Unsupported file format. Please use .ics or .json files.');
          return;
        }
      }
    } catch (err) {
      log.error('Error parsing file:', err);
      setError('Failed to parse file. The file may be corrupted or in an unsupported format.');
      return;
    }

    if (tasks.length === 0) {
      setError('No tasks found in the file.');
      return;
    }

    setParsedTasks(tasks.map((t) => ({ ...t, importStatus: 'pending' })));
    // Stay on upload step - let user click Continue to proceed
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      try {
        const content = await file.text();
        handleFileContent(file.name, content);
      } catch (err) {
        setError('Failed to read file.');
        log.error('Failed to read file:', err);
      }
    },
    [handleFileContent],
  );

  const handleDestinationSelect = useCallback((accountId: string, calendarId: string) => {
    setSelectedAccountId(accountId);
    setSelectedCalendarId(calendarId);
  }, []);

  // Helper to create a Task from a partial task
  const createTaskFromPartial = (
    partialTask: ParsedTaskWithStatus,
    uidMap: Map<string, string>,
  ): Task => {
    const newUid = partialTask.uid ? uidMap.get(partialTask.uid) : `${generateUUID()}@chiri`;
    const newParentUid = partialTask.parentUid ? uidMap.get(partialTask.parentUid) : undefined;

    return {
      id: generateUUID(),
      uid: newUid || `${generateUUID()}@chiri`,
      title: partialTask.title || 'Untitled Task',
      description: partialTask.description || '',
      status: partialTask.status || 'needs-action',
      completed: partialTask.completed || false,
      completedAt: partialTask.completedAt,
      percentComplete: partialTask.percentComplete,
      priority: partialTask.priority || 'none',
      categoryId: partialTask.categoryId,
      startDate: partialTask.startDate,
      dueDate: partialTask.dueDate,
      createdAt: partialTask.createdAt || new Date(),
      modifiedAt: new Date(),
      parentUid: newParentUid,
      isCollapsed: partialTask.isCollapsed || false,
      sortOrder: partialTask.sortOrder || Date.now(),
      accountId: selectedAccountId,
      calendarId: selectedCalendarId,
      synced: false,
    };
  };

  const handleImport = async () => {
    if (!selectedCalendarId || parsedTasks.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    setError('');
    setStep('review');

    try {
      const selectedCal = allCalendars.find((c) => c.id === selectedCalendarId);
      if (!selectedCal) {
        setError('Selected calendar not found.');
        setIsImporting(false);
        return;
      }

      // Create UID mapping for parent-child relationships
      const uidMap = new Map<string, string>();
      for (const task of parsedTasks) {
        if (task.uid) {
          uidMap.set(task.uid, `${generateUUID()}@chiri`);
        }
      }

      // Import tasks with progress tracking
      const totalTasks = parsedTasks.length;
      const updatedTasks = [...parsedTasks];

      for (let i = 0; i < parsedTasks.length; i++) {
        const partialTask = parsedTasks[i];

        // Update status to importing
        updatedTasks[i] = { ...updatedTasks[i], importStatus: 'importing' };
        setParsedTasks([...updatedTasks]);

        try {
          const task = createTaskFromPartial(partialTask, uidMap);
          createTaskMutation.mutate(task);

          // Update status to success
          updatedTasks[i] = { ...updatedTasks[i], importStatus: 'success' };
        } catch (err) {
          log.error(`Failed to import task: ${partialTask.title}`, err);
          updatedTasks[i] = {
            ...updatedTasks[i],
            importStatus: 'error',
            importError: 'Failed to create task',
          };
        }

        setParsedTasks([...updatedTasks]);
        setImportProgress(((i + 1) / totalTasks) * 100);

        // Small delay for visual feedback
        if (totalTasks > 1) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      setImportSuccess(true);

      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError('Failed to import tasks.');
      log.error('Failed to import tasks:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = useCallback(() => {
    // Reset all state
    setStep('upload');
    setParsedTasks([]);
    setFileName('');
    setError('');
    setParseErrors([]);
    setImportSuccess(false);
    setImportProgress(0);
    setIsImporting(false);
    setIsDraggingInDropZone(false);

    // Clear App's drag state if user was dragging when modal closed
    onFileDrop?.();

    onClose();
  }, [onClose, onFileDrop]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setParsedTasks([]);
    setFileName('');
    setError('');
    setParseErrors([]);
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'destination') {
      setStep('upload');
    } else if (step === 'review') {
      setStep('destination');
    }
  }, [step]);

  const canProceed = () => {
    if (step === 'upload') return parsedTasks.length > 0;
    if (step === 'destination') return !!selectedCalendarId;
    return false;
  };

  const handleNext = () => {
    if (step === 'upload' && parsedTasks.length > 0) {
      setStep('destination');
    } else if (step === 'destination' && selectedCalendarId) {
      setStep('review');
    }
  };

  // Handle drops anywhere on the modal (only for preventing default behavior)
  const handleModalDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't process drops at modal level - let the drop zone handle it
    // This just prevents the browser from trying to open the file
  }, []);

  // Handle drag over the modal - just prevent default
  const handleModalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle drag leave from modal - just prevent default
  const handleModalDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Callbacks for drop zone to update drag state
  const handleDropZoneDragEnter = useCallback(() => {
    setIsDraggingInDropZone(true);
  }, []);

  const handleDropZoneDragLeave = useCallback(() => {
    setIsDraggingInDropZone(false);
  }, []);

  // Handle drops in the drop zone only
  const handleDropZoneDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer?.files?.[0];
      if (!file) return;

      // Process the file
      await handleFileSelect(file);

      // Clear the app's drag state
      onFileDrop?.();
    },
    [handleFileSelect, onFileDrop],
  );

  if (!isOpen) return null;

  // Show drop zone highlight only when dragging directly over the drop zone
  const showDropZoneHighlight = isDraggingInDropZone && step === 'upload';

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop requires drag handlers for file drop functionality
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] animate-fade-in"
      onDrop={handleModalDrop}
      onDragOver={handleModalDragOver}
      onDragLeave={handleModalDragLeave}
    >
      <div
        ref={focusTrapRef}
        className="relative bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-lg mx-4 animate-scale-in max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'upload' && !isImporting && !importSuccess && (
              <button
                type="button"
                onClick={handleBack}
                className="p-1.5 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
              Import Tasks
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isImporting}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-700/50 flex-shrink-0">
          <StepIndicator
            currentStep={step}
            hasFile={parsedTasks.length > 0}
            hasDestination={!!selectedCalendarId}
          />
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {step === 'upload' && (
            <FileUploadStep
              fileName={fileName}
              isDraggingOver={showDropZoneHighlight}
              onFileSelect={handleFileSelect}
              onReset={handleReset}
              onDrop={handleDropZoneDrop}
              onDragEnter={handleDropZoneDragEnter}
              onDragLeave={handleDropZoneDragLeave}
              error={error}
              parseErrors={parseErrors}
            />
          )}

          {step === 'destination' && (
            <DestinationStep
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              selectedCalendarId={selectedCalendarId}
              onSelect={handleDestinationSelect}
            />
          )}

          {step === 'review' && (
            <ReviewStep
              tasks={parsedTasks}
              selectedCalendar={selectedCalendar}
              isImporting={isImporting}
              importProgress={importProgress}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-surface-200 dark:border-surface-700 flex-shrink-0">
          <div className="text-sm text-surface-500 dark:text-surface-400">
            {parsedTasks.length > 0 && step !== 'review' && (
              <span>
                {parsedTasks.length} {pluralize(parsedTasks.length, 'task')} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!importSuccess && (
              <button
                type="button"
                onClick={handleClose}
                disabled={isImporting}
                className="px-4 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              >
                Cancel
              </button>
            )}

            {step !== 'review' ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-4 py-2 text-sm bg-primary-600 text-primary-contrast rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || importSuccess || parsedTasks.length === 0}
                className="px-4 py-2 text-sm bg-primary-600 text-primary-contrast rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset"
              >
                {importSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Imported!
                  </>
                ) : isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import {parsedTasks.length} {pluralize(parsedTasks.length, 'Task')}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
