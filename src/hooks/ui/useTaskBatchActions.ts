import { useCallback, useMemo, useRef, useState } from 'react';
import { useSettingsStore } from '$context/settingsContext';
import { useTaskDeletion } from '$hooks/deletion/useTaskDeletion';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useTags } from '$hooks/queries/useTags';
import { useBatchUpdateTasks, useRestoreTask } from '$hooks/queries/useTasks';
import { exportTasksAndActiveDescendants } from '$lib/store/tasks';
import { buildStatusUpdates } from '$lib/task/status';
import type { Priority, Status, Task } from '$types/task/model';

export type TaskBatchMenu = 'status' | 'priority' | null;

interface UseTaskBatchActionsOptions {
  selectedTasks: Task[];
  onClearSelection: () => void;
}

export const useTaskBatchActions = ({
  selectedTasks,
  onClearSelection,
}: UseTaskBatchActionsOptions) => {
  const { data: accounts = [] } = useAccounts();
  const { data: tags = [] } = useTags();
  const { timeFormat, syncStatusProgress } = useSettingsStore();
  const batchUpdateTasksMutation = useBatchUpdateTasks();
  const restoreTaskMutation = useRestoreTask();
  const { moveTasksToRecentlyDeleted, deleteTasksPermanently } = useTaskDeletion();
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [openMenu, setOpenMenu] = useState<TaskBatchMenu>(null);
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const priorityButtonRef = useRef<HTMLButtonElement>(null);

  const selectedCount = selectedTasks.length;
  const selectedTaskUidSet = useMemo(
    () => new Set(selectedTasks.map((task) => task.uid)),
    [selectedTasks],
  );
  const currentCalendarIds = useMemo(
    () => Array.from(new Set(selectedTasks.map((task) => task.calendarId).filter(Boolean))),
    [selectedTasks],
  );
  const exportTasks = useMemo(
    () => (showExportModal ? exportTasksAndActiveDescendants(selectedTasks) : []),
    [selectedTasks, showExportModal],
  );

  const allCalendars = useMemo(
    () =>
      accounts.flatMap((account) =>
        account.calendars.map((calendar) => ({ ...calendar, accountId: account.id })),
      ),
    [accounts],
  );

  const toggleMenu = useCallback((menu: Exclude<TaskBatchMenu, null>) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  }, []);

  const closeMenu = useCallback(() => {
    setOpenMenu(null);
  }, []);

  const handleMoveToCalendar = useCallback(
    (calendarId: string) => {
      const target = allCalendars.find((calendar) => calendar.id === calendarId);
      if (!target) return;

      const updates = selectedTasks.flatMap((task) => {
        const shouldPromote = !!task.parentUid && !selectedTaskUidSet.has(task.parentUid);
        const nextUpdates: Partial<Task> = {
          calendarId: target.id,
          accountId: target.accountId,
        };
        if (shouldPromote) nextUpdates.parentUid = undefined;

        const calendarUnchanged =
          task.calendarId === target.id && task.accountId === target.accountId;
        if (calendarUnchanged && !shouldPromote) return [];

        return [{ id: task.id, updates: nextUpdates }];
      });

      if (updates.length > 0) {
        batchUpdateTasksMutation.mutate(updates);
      }
      setShowMoveModal(false);
    },
    [allCalendars, batchUpdateTasksMutation, selectedTaskUidSet, selectedTasks],
  );

  const handleStatusChange = useCallback(
    (status: Status) => {
      const now = new Date();
      const updates = selectedTasks.flatMap((task) => {
        const nextUpdates: Partial<Task> = buildStatusUpdates(
          status,
          task,
          now,
          syncStatusProgress,
        );

        const isUnchanged =
          task.status === status &&
          task.completed === nextUpdates.completed &&
          (status !== 'completed' || !!task.completedAt);
        if (isUnchanged) return [];

        return [{ id: task.id, updates: nextUpdates }];
      });

      if (updates.length > 0) {
        batchUpdateTasksMutation.mutate(updates);
      }
      closeMenu();
    },
    [batchUpdateTasksMutation, closeMenu, selectedTasks, syncStatusProgress],
  );

  const handlePriorityChange = useCallback(
    (priority: Priority) => {
      const updates = selectedTasks
        .filter((task) => task.priority !== priority)
        .map((task) => ({ id: task.id, updates: { priority } }));

      if (updates.length > 0) {
        batchUpdateTasksMutation.mutate(updates);
      }
      closeMenu();
    },
    [batchUpdateTasksMutation, closeMenu, selectedTasks],
  );

  const handleDelete = useCallback(async () => {
    const deleted = await moveTasksToRecentlyDeleted(selectedTasks.map((task) => task.id));
    if (deleted) onClearSelection();
  }, [moveTasksToRecentlyDeleted, onClearSelection, selectedTasks]);

  const handleRestore = useCallback(() => {
    for (const task of selectedTasks) {
      restoreTaskMutation.mutate({ id: task.id });
    }
    onClearSelection();
  }, [onClearSelection, restoreTaskMutation, selectedTasks]);

  const handlePermanentDelete = useCallback(async () => {
    const deleted = await deleteTasksPermanently(selectedTasks.map((task) => task.id));
    if (deleted) onClearSelection();
  }, [deleteTasksPermanently, onClearSelection, selectedTasks]);

  return {
    accounts,
    tags,
    timeFormat,
    allCalendars,
    currentCalendarIds,
    exportTasks,
    selectedCount,
    openMenu,
    toggleMenu,
    closeMenu,
    statusButtonRef,
    priorityButtonRef,
    showTagsModal,
    showDatesModal,
    showMoveModal,
    showExportModal,
    openTagsModal: () => setShowTagsModal(true),
    closeTagsModal: () => setShowTagsModal(false),
    openDatesModal: () => setShowDatesModal(true),
    closeDatesModal: () => setShowDatesModal(false),
    openMoveModal: () => setShowMoveModal(true),
    closeMoveModal: () => setShowMoveModal(false),
    openExportModal: () => setShowExportModal(true),
    closeExportModal: () => setShowExportModal(false),
    handleMoveToCalendar,
    handleStatusChange,
    handlePriorityChange,
    handleDelete,
    handleRestore,
    handlePermanentDelete,
  };
};
