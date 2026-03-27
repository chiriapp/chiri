import Ban from 'lucide-react/icons/ban';
import Check from 'lucide-react/icons/check';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Edit2 from 'lucide-react/icons/edit-2';
import Flag from 'lucide-react/icons/flag';
import CalendarMove from 'lucide-react/icons/folder-sync';
import ListPlus from 'lucide-react/icons/list-plus';
import Loader from 'lucide-react/icons/loader';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Share2 from 'lucide-react/icons/share-2';
import Trash2 from 'lucide-react/icons/trash-2';
import { useEffect, useRef, useState } from 'react';
import { ExportModal } from '$components/modals/ExportModal';
import { MoveToCalendarModal } from '$components/modals/MoveToCalendarModal';
import { SubtaskModal } from '$components/modals/SubtaskModal';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useCreateTask, useUpdateTask } from '$hooks/queries/useTasks';
import { useSetSelectedTask } from '$hooks/queries/useUIState';
import { useConfirmTaskDelete } from '$hooks/useConfirmTaskDelete';
import { exportTaskAndChildren } from '$lib/store/tasks';
import type { Priority, Task, TaskStatus } from '$types/index';
import { PRIORITIES } from '$utils/priority';

interface TaskContextMenuProps {
  task: Task;
  contextMenu: { x: number; y: number };
  onClose: () => void;
  setContextMenu: (val: null) => void;
}

export const TaskContextMenu = ({
  task,
  contextMenu,
  onClose,
  setContextMenu,
}: TaskContextMenuProps) => {
  const { data: accounts = [] } = useAccounts();
  const updateTaskMutation = useUpdateTask();
  const createTaskMutation = useCreateTask();
  const setSelectedTaskMutation = useSetSelectedTask();
  const { confirmAndDelete } = useConfirmTaskDelete();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
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

  // Clear timers on unmount
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
    await confirmAndDelete(task.id);
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

  const handlePriorityMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
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
    priorityHideTimer.current = setTimeout(() => setPriorityFlyoutPos(null), 120);
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
    { value: 'in-process' as const, label: 'In Process', Icon: Loader },
    { value: 'completed' as const, label: 'Completed', Icon: CheckCircle2 },
    { value: 'cancelled' as const, label: 'Cancelled', Icon: Ban },
  ];

  const handleStatusMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
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
    statusHideTimer.current = setTimeout(() => setStatusFlyoutPos(null), 120);
  };

  const handleClose = () => {
    setPriorityFlyoutPos(null);
    setStatusFlyoutPos(null);
    clearTimeout(priorityHideTimer.current);
    clearTimeout(statusHideTimer.current);
    onClose();
  };

  const menuItemClass =
    'w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset';

  return (
    <>
      {!isMenuHidden && (
        <>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Context menu backdrop for closing on outside click */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: Context menu backdrop for closing on outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleClose}
            onContextMenu={(e) => {
              e.preventDefault();
              handleClose();
            }}
          />

          <div
            data-context-menu-content
            className="fixed bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 my-1 z-50 min-w-[200px] animate-scale-in"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedTaskMutation.mutate(task.id);
                setContextMenu(null);
              }}
              className={`${menuItemClass} rounded-t-md`}
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>

            <div className="border-t border-surface-200 dark:border-surface-700" />
            <button
              type="button"
              onMouseEnter={handleStatusMouseEnter}
              onMouseLeave={handleStatusMouseLeave}
              className={menuItemClass}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="flex-1 text-left">Set status</span>
              <ChevronRight className="w-3 h-3" />
            </button>

            <div className="border-t border-surface-200 dark:border-surface-700" />
            <button
              type="button"
              onClick={() => {
                setIsMenuHidden(true);
                setShowMoveToCalendarModal(true);
              }}
              className={menuItemClass}
            >
              <CalendarMove className="w-4 h-4" />
              Move to calendar
            </button>

            <div className="border-t border-surface-200 dark:border-surface-700" />
            <button
              type="button"
              onMouseEnter={handlePriorityMouseEnter}
              onMouseLeave={handlePriorityMouseLeave}
              className={menuItemClass}
            >
              <Flag className="w-4 h-4" />
              <span className="flex-1 text-left">Change priority</span>
              <ChevronRight className="w-3 h-3" />
            </button>

            <div className="border-t border-surface-200 dark:border-surface-700" />
            <button
              type="button"
              onClick={() => {
                setIsMenuHidden(true);
                setShowSubtaskModal(true);
              }}
              className={menuItemClass}
            >
              <ListPlus className="w-4 h-4" />
              Add subtask
            </button>

            <div className="border-t border-surface-200 dark:border-surface-700" />
            <button type="button" onClick={handleExport} className={menuItemClass}>
              <Share2 className="w-4 h-4" />
              Export
            </button>

            <div className="border-t border-surface-200 dark:border-surface-700" />
            <button
              type="button"
              onClick={handleDelete}
              className="w-full rounded-b-md flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>

          {priorityFlyoutPos && (
            <div
              data-context-menu-content
              role="menu"
              className="fixed bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 z-[60] min-w-[140px] animate-scale-in"
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
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-700 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    i === 0
                      ? 'rounded-t-lg border-b border-surface-200 dark:border-surface-700'
                      : i === PRIORITIES.length - 1
                        ? 'rounded-b-lg'
                        : 'border-b border-surface-200 dark:border-surface-700'
                  }`}
                >
                  <span className={`flex-1 text-left ${p.color}`}>{p.label}</span>
                  {task.priority === p.value && (
                    <Check className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {statusFlyoutPos && (
            <div
              data-context-menu-content
              role="menu"
              className="fixed bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 z-[60] min-w-[160px] animate-scale-in"
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
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    i === 0
                      ? 'rounded-t-lg border-b border-surface-200 dark:border-surface-700'
                      : i === STATUS_OPTIONS.length - 1
                        ? 'rounded-b-lg'
                        : 'border-b border-surface-200 dark:border-surface-700'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {task.status === value && (
                    <Check className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </>
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

      {showSubtaskModal && (
        <SubtaskModal
          isOpen={showSubtaskModal}
          onClose={() => {
            setShowSubtaskModal(false);
            setContextMenu(null);
          }}
          onAdd={(title) =>
            createTaskMutation.mutate({
              title,
              parentUid: task.uid,
              accountId: task.accountId,
              calendarId: task.calendarId,
              priority: 'none',
            })
          }
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
