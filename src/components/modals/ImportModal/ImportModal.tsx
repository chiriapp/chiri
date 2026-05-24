import Check from 'lucide-react/icons/check';
import ChevronLeft from 'lucide-react/icons/chevron-left';
import Loader2 from 'lucide-react/icons/loader-2';
import Upload from 'lucide-react/icons/upload';
import { useCallback, useEffect, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { DestinationStep } from '$components/modals/ImportModal/DestinationStep';
import { FileUploadStep } from '$components/modals/ImportModal/FileUploadStep';
import { ReviewStep } from '$components/modals/ImportModal/ReviewStep';
import { StepIndicator } from '$components/modals/ImportModal/StepIndicator';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useCreateTask } from '$hooks/queries/useTasks';
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

  // Handle preloaded file
  useEffect(() => {
    if (isOpen && preloadedFile) {
      handleFileContent(preloadedFile.name, preloadedFile.content);
    }
  }, [isOpen, preloadedFile, handleFileContent]);

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
    <ModalWrapper
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Tasks"
      zIndex="z-60"
      className="max-w-lg"
      contentPadding={false}
      preventClose={isImporting}
      backdropProps={{
        onDrop: handleModalDrop,
        onDragOver: handleModalDragOver,
        onDragLeave: handleModalDragLeave,
      }}
      headerLeft={
        step !== 'upload' && !isImporting && !importSuccess ? (
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : undefined
      }
      footerLeft={
        <div className="text-sm text-surface-500 dark:text-surface-400">
          {parsedTasks.length > 0 && step !== 'review' && (
            <span>
              {parsedTasks.length} {pluralize(parsedTasks.length, 'task')} selected
            </span>
          )}
        </div>
      }
      footer={
        <>
          {!importSuccess && (
            <ModalButton variant="ghost" onClick={handleClose} disabled={isImporting}>
              Cancel
            </ModalButton>
          )}

          {step !== 'review' ? (
            <ModalButton onClick={handleNext} disabled={!canProceed()}>
              Continue
            </ModalButton>
          ) : (
            <ModalButton
              onClick={handleImport}
              disabled={isImporting || importSuccess || parsedTasks.length === 0}
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
            </ModalButton>
          )}
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Step Indicator */}
        <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-700/50 shrink-0">
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
      </div>
    </ModalWrapper>
  );
};
