import Ban from 'lucide-react/icons/ban';
import Check from 'lucide-react/icons/check';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Edit2 from 'lucide-react/icons/edit-2';
import Flag from 'lucide-react/icons/flag';
import CalendarMove from 'lucide-react/icons/folder-sync';
import ListPlus from 'lucide-react/icons/list-plus';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Share2 from 'lucide-react/icons/share-2';
import Tag from 'lucide-react/icons/tag';
import Timer from 'lucide-react/icons/timer';
import Trash2 from 'lucide-react/icons/trash-2';
import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { FloatingLayerFrame } from '$components/FloatingLayerFrame';
import { BatchTaskTagsModal } from '$components/modals/BatchTaskTagsModal';
import { ExportModal } from '$components/modals/ExportModal';
import { MoveToCalendarModal } from '$components/modals/MoveToCalendar/MoveToCalendarModal';
import { PRIORITIES } from '$constants/priority';
import { useTaskDeletion } from '$hooks/deletion/useTaskDeletion';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useTags } from '$hooks/queries/useTags';
import { useCreateTask, useRestoreTask, useUpdateTask } from '$hooks/queries/useTasks';
import { useSetSelectedTask } from '$hooks/queries/useUIState';
import { exportTaskAndChildren } from '$lib/store/tasks';
import type { Priority, Task, TaskStatus } from '$types';

interface TaskItemContextMenuProps {
  task: Task;
  contextMenu: { x: number; y: number };
  onClose: () => void;
  setContextMenu: (val: null) => void;
}

const FLYOUT_HIDE_DELAY_MS = 40;

export const TaskItemContextMenu = ({
  task,
  contextMenu,
  onClose,
  setContextMenu,
}: TaskItemContextMenuProps) => {
  const { data: accounts = [] } = useAccounts();
  const { data: tags = [] } = useTags();
  const updateTaskMutation = useUpdateTask();
  const createTaskMutation = useCreateTask();
  const restoreTaskMutation = useRestoreTask();
  const setSelectedTaskMutation = useSetSelectedTask();
  const { moveTaskToRecentlyDeleted, deleteTaskPermanently } = useTaskDeletion();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showMoveToCalendarModal, setShowMoveToCalendarModal] = useState(false);
  const [isMenuHidden, setIsMenuHidden] = useState(false);
  const [priorityFlyoutPos, setPriorityFlyoutPos] = useState<{
    x: number;
    y: number;
    useRight?: boolean;
  } | null>(null);
  const priorityHideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [statusFlyoutPos, setStatusFlyoutPos] = useState<{
    x: number;
    y: number;
    useRight?: boolean;
  } | null>(null);
  const statusHideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // clear timers on unmount
  useEffect(
    () => () => {
      clearTimeout(priorityHideTimer.current);
      clearTimeout(statusHideTimer.current);
    },
    [],
  );

  const allCalendars = accounts.flatMap((a) => a.calendars);

  const handleDelete = async () => {
    setContextMenu(null);
    await moveTaskToRecentlyDeleted(task.id);
  };

  const handleRestore = () => {
    restoreTaskMutation.mutate({ id: task.id });
    setContextMenu(null);
  };

  const handlePermanentDelete = async () => {
    setContextMenu(null);
    await deleteTaskPermanently(task.id);
  };

  const handleExport = () => {
    const result = exportTaskAndChildren(task.id);
    if (result) {
      setIsMenuHidden(true);
      setShowExportModal(true);
    } else {
      setContextMenu(null);
    }
  };

  const handleMoveToCalendar = (calendarId: string) => {
    const target = allCalendars.find((c) => c.id === calendarId);
    if (target) {
      const updates: Partial<Task> = { calendarId: target.id, accountId: target.accountId };
      if (task.parentUid) updates.parentUid = undefined;
      updateTaskMutation.mutate({ id: task.id, updates });
    }
  };

  const handleChangePriority = (priority: Priority) => {
    updateTaskMutation.mutate({ id: task.id, updates: { priority } });
    setPriorityFlyoutPos(null);
    setContextMenu(null);
  };

  const handlePriorityMouseEnter = (e: MouseEvent<HTMLButtonElement>) => {
    clearTimeout(priorityHideTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const flyoutWidth = 160;
    const flyoutHeight = PRIORITIES.length * 36;
    const goesLeft = rect.right + 4 + flyoutWidth > window.innerWidth - 8;
    let y = rect.top;
    if (y + flyoutHeight > window.innerHeight - 8) y = window.innerHeight - flyoutHeight - 8;
    if (goesLeft) {
      setPriorityFlyoutPos({ x: window.innerWidth - (rect.left - 4), y, useRight: true });
    } else {
      setPriorityFlyoutPos({ x: rect.right + 4, y });
    }
  };

  const handlePriorityMouseLeave = () => {
    priorityHideTimer.current = setTimeout(() => setPriorityFlyoutPos(null), FLYOUT_HIDE_DELAY_MS);
  };

  const handleChangeStatus = (status: TaskStatus) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: {
        status,
        completed: status === 'completed',
        completedAt: status === 'completed' ? new Date() : undefined,
      },
    });
    setStatusFlyoutPos(null);
    setContextMenu(null);
  };

  const STATUS_OPTIONS = [
    { value: 'needs-action' as const, label: 'Needs Action', Icon: RotateCcw },
    { value: 'in-process' as const, label: 'In Process', Icon: Timer },
    { value: 'completed' as const, label: 'Completed', Icon: CheckCircle2 },
    { value: 'cancelled' as const, label: 'Cancelled', Icon: Ban },
  ];

  const handleStatusMouseEnter = (e: MouseEvent<HTMLButtonElement>) => {
    clearTimeout(statusHideTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const flyoutWidth = 170;
    const flyoutHeight = STATUS_OPTIONS.length * 36;
    const goesLeft = rect.right + 4 + flyoutWidth > window.innerWidth - 8;
    let y = rect.top;
    if (y + flyoutHeight > window.innerHeight - 8) y = window.innerHeight - flyoutHeight - 8;
    if (goesLeft) {
      setStatusFlyoutPos({ x: window.innerWidth - (rect.left - 4), y, useRight: true });
    } else {
      setStatusFlyoutPos({ x: rect.right + 4, y });
    }
  };

  const handleStatusMouseLeave = () => {
    statusHideTimer.current = setTimeout(() => setStatusFlyoutPos(null), FLYOUT_HIDE_DELAY_MS);
  };

  const handleClose = () => {
    setPriorityFlyoutPos(null);
    setStatusFlyoutPos(null);
    clearTimeout(priorityHideTimer.current);
    clearTimeout(statusHideTimer.current);
    onClose();
  };

  const menuItemClass =
    'w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset';

  return (
    <>
      {!isMenuHidden && (
        <FloatingLayerFrame
          anchor={{ type: 'point', x: contextMenu.x, y: contextMenu.y }}
          onClose={handleClose}
          layerType="context-menu"
          layerClassName="z-50 min-w-50"
          dataAttribute="data-context-menu-content"
        >
          {task.deletedAt ? (
            <>
              <button
                type="button"
                onClick={handleRestore}
                className={`${menuItemClass} rounded-t-md`}
              >
                <RotateCcw className="h-4 w-4" />
                Restore
              </button>

              <div className="border-surface-200 border-t dark:border-surface-700" />
              <button
                type="button"
                onClick={handlePermanentDelete}
                className="flex w-full items-center gap-2 rounded-b-md px-3 py-2 text-semantic-error text-sm outline-hidden hover:bg-semantic-error/15 focus-visible:ring-2 focus-visible:ring-semantic-error focus-visible:ring-inset"
              >
                <Trash2 className="h-4 w-4" />
                Delete permanently
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setSelectedTaskMutation.mutate(task.id);
                  setContextMenu(null);
                }}
                className={`${menuItemClass} rounded-t-md`}
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>

              <div className="border-surface-200 border-t dark:border-surface-700" />
              <button
                type="button"
                onMouseEnter={handleStatusMouseEnter}
                onMouseLeave={handleStatusMouseLeave}
                className={menuItemClass}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="flex-1 text-left">Set status</span>
                <ChevronRight className="h-3 w-3" />
              </button>

              <div className="border-surface-200 border-t dark:border-surface-700" />
              <button
                type="button"
                onClick={() => {
                  setIsMenuHidden(true);
                  setShowMoveToCalendarModal(true);
                }}
                className={menuItemClass}
              >
                <CalendarMove className="h-4 w-4" />
                Move to calendar
              </button>

              <div className="border-surface-200 border-t dark:border-surface-700" />
              <button
                type="button"
                onMouseEnter={handlePriorityMouseEnter}
                onMouseLeave={handlePriorityMouseLeave}
                className={menuItemClass}
              >
                <Flag className="h-4 w-4" />
                <span className="flex-1 text-left">Change priority</span>
                <ChevronRight className="h-3 w-3" />
              </button>

              <div className="border-surface-200 border-t dark:border-surface-700" />
              <button
                type="button"
                onClick={() => {
                  setIsMenuHidden(true);
                  setShowTagsModal(true);
                }}
                className={menuItemClass}
              >
                <Tag className="h-4 w-4" />
                Manage tags
              </button>

              <div className="border-surface-200 border-t dark:border-surface-700" />
              <button
                type="button"
                onClick={() => {
                  createTaskMutation.mutate(
                    {
                      title: '',
                      parentUid: task.uid,
                      accountId: task.accountId,
                      calendarId: task.calendarId,
                    },
                    {
                      onSuccess: (newTask) => {
                        setSelectedTaskMutation.mutate(
                          { id: newTask.id, focusTitle: true },
                          { onSuccess: () => setContextMenu(null) },
                        );
                      },
                    },
                  );
                }}
                className={menuItemClass}
              >
                <ListPlus className="h-4 w-4" />
                Add subtask
              </button>

              <div className="border-surface-200 border-t dark:border-surface-700" />
              <button type="button" onClick={handleExport} className={menuItemClass}>
                <Share2 className="h-4 w-4" />
                Export
              </button>

              <div className="border-surface-200 border-t dark:border-surface-700" />
              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center gap-2 rounded-b-md px-3 py-2 text-semantic-error text-sm outline-hidden hover:bg-semantic-error/15 focus-visible:ring-2 focus-visible:ring-semantic-error focus-visible:ring-inset"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          )}

          {priorityFlyoutPos && (
            <div
              data-context-menu-content
              role="menu"
              className="fixed z-60 min-w-35 animate-scale-in rounded-lg border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800"
              style={
                priorityFlyoutPos.useRight
                  ? { right: priorityFlyoutPos.x, top: priorityFlyoutPos.y }
                  : { left: priorityFlyoutPos.x, top: priorityFlyoutPos.y }
              }
              onMouseEnter={() => clearTimeout(priorityHideTimer.current)}
              onMouseLeave={handlePriorityMouseLeave}
            >
              {PRIORITIES.map((p, i) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => handleChangePriority(p.value)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm outline-hidden hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:hover:bg-surface-700 ${
                    i === 0
                      ? 'rounded-t-lg border-surface-200 border-b dark:border-surface-700'
                      : i === PRIORITIES.length - 1
                        ? 'rounded-b-lg'
                        : 'border-surface-200 border-b dark:border-surface-700'
                  }`}
                >
                  <span className={`flex-1 text-left ${p.color}`}>{p.label}</span>
                  {task.priority === p.value && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          )}

          {statusFlyoutPos && (
            <div
              data-context-menu-content
              role="menu"
              className="fixed z-60 min-w-40 animate-scale-in rounded-lg border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800"
              style={
                statusFlyoutPos.useRight
                  ? { right: statusFlyoutPos.x, top: statusFlyoutPos.y }
                  : { left: statusFlyoutPos.x, top: statusFlyoutPos.y }
              }
              onMouseEnter={() => clearTimeout(statusHideTimer.current)}
              onMouseLeave={handleStatusMouseLeave}
            >
              {STATUS_OPTIONS.map(({ value, label, Icon }, i) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => handleChangeStatus(value)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-700 outline-hidden hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-300 dark:hover:bg-surface-700 ${
                    i === 0
                      ? 'rounded-t-lg border-surface-200 border-b dark:border-surface-700'
                      : i === STATUS_OPTIONS.length - 1
                        ? 'rounded-b-lg'
                        : 'border-surface-200 border-b dark:border-surface-700'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {task.status === value && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </FloatingLayerFrame>
      )}

      {showExportModal && (
        <ExportModal
          tasks={[task, ...(exportTaskAndChildren(task.id)?.descendants || [])]}
          fileName={task.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'task'}
          type="tasks"
          onClose={() => {
            setShowExportModal(false);
            setContextMenu(null);
          }}
        />
      )}

      {showTagsModal && (
        <BatchTaskTagsModal
          isOpen={showTagsModal}
          onClose={() => {
            setShowTagsModal(false);
            setContextMenu(null);
          }}
          tasks={[task]}
          tags={tags}
        />
      )}

      {showMoveToCalendarModal && (
        <MoveToCalendarModal
          task={task}
          accounts={accounts}
          onMove={handleMoveToCalendar}
          onClose={() => {
            setShowMoveToCalendarModal(false);
            setContextMenu(null);
          }}
        />
      )}
    </>
  );
};
