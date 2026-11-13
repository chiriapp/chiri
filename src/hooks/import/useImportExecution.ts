import { useCallback, useState } from 'react';
import { useCreateTask } from '$hooks/queries/useTasks';
import { createImportedTask } from '$lib/ical/import';
import { loggers } from '$lib/logger';
import type { Calendar } from '$types/calendar';
import type { ParsedTaskWithStatus } from '$types/task/import';

const log = loggers.import;

interface UseImportExecutionOptions {
  allCalendars: Calendar[];
  parsedTasks: ParsedTaskWithStatus[];
  selectedAccountId: string;
  selectedCalendarId: string;
  onImportStart: () => void;
  onClose: () => void;
  onError: (message: string) => void;
  onTasksChange: (tasks: ParsedTaskWithStatus[]) => void;
}

export const useImportExecution = ({
  allCalendars,
  parsedTasks,
  selectedAccountId,
  selectedCalendarId,
  onImportStart,
  onClose,
  onError,
  onTasksChange,
}: UseImportExecutionOptions) => {
  const createTaskMutation = useCreateTask('imported', { source: 'import' });
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleImport = useCallback(async () => {
    if (!selectedCalendarId || parsedTasks.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    onError('');
    onImportStart();

    try {
      const selectedCalendar = allCalendars.find((calendar) => calendar.id === selectedCalendarId);
      if (!selectedCalendar) {
        onError('Selected calendar not found.');
        setIsImporting(false);
        return;
      }

      const uidMap = new Map<string, string>();
      for (const task of parsedTasks) {
        if (task.uid) {
          uidMap.set(task.uid, `${crypto.randomUUID()}@chiri`);
        }
      }

      const totalTasks = parsedTasks.length;
      const updatedTasks = [...parsedTasks];

      for (let i = 0; i < parsedTasks.length; i++) {
        const partialTask = parsedTasks[i];
        updatedTasks[i] = { ...updatedTasks[i], importStatus: 'importing' };
        onTasksChange([...updatedTasks]);

        try {
          const task = createImportedTask(
            partialTask,
            uidMap,
            selectedAccountId,
            selectedCalendarId,
          );
          createTaskMutation.mutate(task);
          updatedTasks[i] = { ...updatedTasks[i], importStatus: 'success' };
        } catch (err) {
          log.error(`Failed to import task: ${partialTask.title}`, err);
          updatedTasks[i] = {
            ...updatedTasks[i],
            importStatus: 'error',
            importError: 'Failed to create task',
          };
        }

        onTasksChange([...updatedTasks]);
        setImportProgress(((i + 1) / totalTasks) * 100);

        if (totalTasks > 1) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      setImportSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      onError('Failed to import tasks.');
      log.error('Failed to import tasks:', err);
    } finally {
      setIsImporting(false);
    }
  }, [
    allCalendars,
    createTaskMutation,
    onClose,
    onError,
    onImportStart,
    onTasksChange,
    parsedTasks,
    selectedAccountId,
    selectedCalendarId,
  ]);

  const resetImport = useCallback(() => {
    setImportSuccess(false);
    setImportProgress(0);
    setIsImporting(false);
  }, []);

  return {
    isImporting,
    importProgress,
    importSuccess,
    handleImport,
    resetImport,
  };
};
