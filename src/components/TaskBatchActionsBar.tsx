import Ban from 'lucide-react/icons/ban';
import CalendarClock from 'lucide-react/icons/calendar-clock';
import Check from 'lucide-react/icons/check';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import ChevronDown from 'lucide-react/icons/chevron-down';
import Flag from 'lucide-react/icons/flag';
import CalendarMove from 'lucide-react/icons/folder-sync';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Share2 from 'lucide-react/icons/share-2';
import Tag from 'lucide-react/icons/tag';
import Timer from 'lucide-react/icons/timer';
import Trash2 from 'lucide-react/icons/trash-2';
import X from 'lucide-react/icons/x';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FloatingDropdownFrame } from '$components/FloatingDropdownFrame';
import { BatchTaskDatesModal } from '$components/modals/BatchTaskDatesModal';
import { BatchTaskTagsModal } from '$components/modals/BatchTaskTagsModal';
import { ExportModal } from '$components/modals/ExportModal';
import { MoveToCalendarModal } from '$components/modals/MoveToCalendar/MoveToCalendarModal';
import { Tooltip } from '$components/Tooltip';
import { PRIORITIES } from '$constants/priority';
import { useSettingsStore } from '$context/settingsContext';
import { useTaskDeletion } from '$hooks/deletion/useTaskDeletion';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useTags } from '$hooks/queries/useTags';
import { useBatchUpdateTasks, useRestoreTask } from '$hooks/queries/useTasks';
import { exportTaskAndChildren } from '$lib/store/tasks';
import type { Priority, Task, TaskStatus } from '$types';

interface TaskBatchActionsBarProps {
  selectedTasks: Task[];
  onClearSelection: () => void;
  mode?: 'active' | 'deleted';
}

const STATUS_OPTIONS = [
  { value: 'needs-action' as const, label: 'Needs Action', Icon: RotateCcw },
  { value: 'in-process' as const, label: 'In Process', Icon: Timer },
  { value: 'completed' as const, label: 'Completed', Icon: CheckCircle2 },
  { value: 'cancelled' as const, label: 'Cancelled', Icon: Ban },
];

const COMPACT_TOOLBAR_WIDTH = 820;
const TIGHT_TOOLBAR_WIDTH = 460;

const actionButtonClass =
  'inline-flex h-8 shrink-0 items-center rounded-lg border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset disabled:opacity-50 disabled:cursor-not-allowed';
const destructiveButtonClass =
  'inline-flex h-8 shrink-0 items-center gap-2 rounded-lg bg-semantic-error px-3 text-sm font-medium text-primary-contrast hover:opacity-90 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-semantic-error focus-visible:ring-inset';

const getActionButtonClass = ({
  isActive = false,
  isCompact = false,
  hasDisclosure = false,
}: {
  isActive?: boolean;
  isCompact?: boolean;
  hasDisclosure?: boolean;
} = {}) =>
  `${actionButtonClass} ${
    isCompact
      ? hasDisclosure
        ? 'w-12 justify-center gap-1 px-2'
        : 'w-8 justify-center gap-0 px-0'
      : 'gap-2 px-3'
  }${
    isActive
      ? ' bg-surface-100 text-surface-900 border-surface-300 dark:bg-surface-700 dark:text-surface-50 dark:border-surface-600'
      : ''
  }`;

const getMenuItemClass = (index: number, itemCount: number) => {
  const positionClass =
    index === 0
      ? 'rounded-t-lg border-b border-surface-200 dark:border-surface-700'
      : index === itemCount - 1
        ? 'rounded-b-lg'
        : 'border-b border-surface-200 dark:border-surface-700';

  return `w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${positionClass}`;
};

const getDisclosureChevronClass = (isOpen: boolean) =>
  `w-3.5 h-3.5 text-surface-400 shrink-0 motion-safe:transition-transform motion-safe:duration-200 ${
    isOpen ? 'rotate-0' : '-rotate-90'
  }`;

const compactLabelClass = (isCompact: boolean) => (isCompact ? 'sr-only' : '');

export const TaskBatchActionsBar = ({
  selectedTasks,
  onClearSelection,
  mode = 'active',
}: TaskBatchActionsBarProps) => {
  const { data: accounts = [] } = useAccounts();
  const { data: tags = [] } = useTags();
  const { timeFormat } = useSettingsStore();
  const batchUpdateTasksMutation = useBatchUpdateTasks();
  const restoreTaskMutation = useRestoreTask();
  const { moveTaskToRecentlyDeleted, deleteTasksPermanently } = useTaskDeletion();
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [openMenu, setOpenMenu] = useState<'status' | 'priority' | null>(null);
  const [toolbarWidth, setToolbarWidth] = useState<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
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
  const exportTasks = useMemo(() => {
    const taskIds = new Set<string>();
    return selectedTasks.flatMap((task) => {
      const tasks = [task, ...(exportTaskAndChildren(task.id)?.descendants ?? [])];
      return tasks.filter((exportTask) => {
        if (taskIds.has(exportTask.id)) return false;
        taskIds.add(exportTask.id);
        return true;
      });
    });
  }, [selectedTasks]);
  const isCompact = toolbarWidth !== null && toolbarWidth < COMPACT_TOOLBAR_WIDTH;
  const isTight = toolbarWidth !== null && toolbarWidth < TIGHT_TOOLBAR_WIDTH;

  const allCalendars = useMemo(
    () =>
      accounts.flatMap((account) =>
        account.calendars.map((cal) => ({ ...cal, accountId: account.id })),
      ),
    [accounts],
  );

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const updateToolbarWidth = () => setToolbarWidth(toolbar.clientWidth);
    updateToolbarWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateToolbarWidth);
      return () => window.removeEventListener('resize', updateToolbarWidth);
    }

    const observer = new ResizeObserver(([entry]) => {
      setToolbarWidth(entry.contentRect.width);
    });
    observer.observe(toolbar);

    return () => observer.disconnect();
  }, []);

  const handleMoveToCalendar = (calendarId: string) => {
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
  };

  const handleStatusChange = (status: TaskStatus) => {
    const now = new Date();
    const updates = selectedTasks.flatMap((task) => {
      const nextUpdates: Partial<Task> = {
        status,
        completed: status === 'completed',
        completedAt: status === 'completed' ? (task.completedAt ?? now) : undefined,
      };

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
    setOpenMenu(null);
  };

  const handlePriorityChange = (priority: Priority) => {
    const updates = selectedTasks
      .filter((task) => task.priority !== priority)
      .map((task) => ({ id: task.id, updates: { priority } }));

    if (updates.length > 0) {
      batchUpdateTasksMutation.mutate(updates);
    }
    setOpenMenu(null);
  };

  const handleDelete = async () => {
    for (const task of selectedTasks) {
      await moveTaskToRecentlyDeleted(task.id);
    }
    onClearSelection();
  };

  const handleRestore = () => {
    for (const task of selectedTasks) {
      restoreTaskMutation.mutate({ id: task.id });
    }
    onClearSelection();
  };

  const handlePermanentDelete = async () => {
    const deleted = await deleteTasksPermanently(selectedTasks.map((task) => task.id));
    if (deleted) {
      onClearSelection();
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div ref={toolbarRef} className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-sm bg-primary-500 px-2 font-semibold text-primary-contrast text-xs">
            {selectedCount}
          </span>
          <span
            className={`font-medium text-sm text-surface-800 dark:text-surface-100 ${
              isTight ? 'sr-only' : ''
            }`}
          >
            selected
          </span>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2 overflow-hidden">
          {mode === 'deleted' ? (
            <>
              <button
                type="button"
                onClick={handleRestore}
                className={getActionButtonClass({ isCompact })}
                title="Restore selected tasks"
              >
                <RotateCcw className="h-4 w-4" />
                <span className={compactLabelClass(isCompact)}>Restore</span>
              </button>

              <button
                type="button"
                onClick={handlePermanentDelete}
                className={destructiveButtonClass}
                title="Delete selected tasks permanently"
              >
                <Trash2 className="h-4 w-4" />
                {isCompact ? 'Delete' : 'Delete permanently'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowTagsModal(true)}
                className={getActionButtonClass({ isCompact })}
                title="Edit tags"
              >
                <Tag className="h-4 w-4" />
                <span className={compactLabelClass(isCompact)}>Tags</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDatesModal(true)}
                className={getActionButtonClass({ isCompact })}
                title="Edit dates"
              >
                <CalendarClock className="h-4 w-4" />
                <span className={compactLabelClass(isCompact)}>Dates</span>
              </button>

              <Tooltip
                content={
                  allCalendars.length === 0 ? 'Add a calendar to be able to move tasks' : null
                }
                position="bottom"
              >
                <button
                  type="button"
                  onClick={() => setShowMoveModal(true)}
                  className={getActionButtonClass({ isCompact })}
                  disabled={allCalendars.length === 0}
                  title={allCalendars.length === 0 ? undefined : 'Move to calendar'}
                >
                  <CalendarMove className="h-4 w-4" />
                  <span className={compactLabelClass(isCompact)}>Move</span>
                </button>
              </Tooltip>

              <button
                type="button"
                ref={statusButtonRef}
                onClick={() => setOpenMenu((current) => (current === 'status' ? null : 'status'))}
                className={getActionButtonClass({
                  isActive: openMenu === 'status',
                  isCompact,
                  hasDisclosure: true,
                })}
                aria-haspopup="menu"
                aria-expanded={openMenu === 'status'}
                title="Set status"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className={compactLabelClass(isCompact)}>Status</span>
                <ChevronDown className={getDisclosureChevronClass(openMenu === 'status')} />
              </button>

              <button
                type="button"
                ref={priorityButtonRef}
                onClick={() =>
                  setOpenMenu((current) => (current === 'priority' ? null : 'priority'))
                }
                className={getActionButtonClass({
                  isActive: openMenu === 'priority',
                  isCompact,
                  hasDisclosure: true,
                })}
                aria-haspopup="menu"
                aria-expanded={openMenu === 'priority'}
                title="Change priority"
              >
                <Flag className="h-4 w-4" />
                <span className={compactLabelClass(isCompact)}>Priority</span>
                <ChevronDown className={getDisclosureChevronClass(openMenu === 'priority')} />
              </button>

              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className={getActionButtonClass({ isCompact })}
                title="Export selected tasks"
              >
                <Share2 className="h-4 w-4" />
                <span className={compactLabelClass(isCompact)}>Export</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={destructiveButtonClass}
                title="Delete selected tasks"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onClearSelection}
            aria-label="Clear selection"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-surface-500 outline-hidden transition-colors hover:bg-surface-100 hover:text-surface-800 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:hover:bg-surface-700 dark:hover:text-surface-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {openMenu === 'status' && (
        <FloatingDropdownFrame
          anchorRef={statusButtonRef}
          onClose={() => setOpenMenu(null)}
          fallbackWidth={180}
          fallbackHeight={STATUS_OPTIONS.length * 36}
          dropdownClassName="z-50 min-w-44 overflow-hidden"
        >
          {STATUS_OPTIONS.map(({ value, label, Icon }, index) => (
            <button
              type="button"
              key={value}
              onClick={() => handleStatusChange(value)}
              className={getMenuItemClass(index, STATUS_OPTIONS.length)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {selectedTasks.every((task) => task.status === value) && (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary-500" />
              )}
            </button>
          ))}
        </FloatingDropdownFrame>
      )}

      {openMenu === 'priority' && (
        <FloatingDropdownFrame
          anchorRef={priorityButtonRef}
          onClose={() => setOpenMenu(null)}
          fallbackWidth={160}
          fallbackHeight={PRIORITIES.length * 36}
          dropdownClassName="z-50 min-w-36 overflow-hidden"
        >
          {PRIORITIES.map((priority, index) => (
            <button
              type="button"
              key={priority.value}
              onClick={() => handlePriorityChange(priority.value)}
              className={getMenuItemClass(index, PRIORITIES.length)}
            >
              <span className={`flex-1 text-left ${priority.color}`}>{priority.label}</span>
              {selectedTasks.every((task) => task.priority === priority.value) && (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary-500" />
              )}
            </button>
          ))}
        </FloatingDropdownFrame>
      )}

      {showTagsModal && (
        <BatchTaskTagsModal
          isOpen={showTagsModal}
          onClose={() => setShowTagsModal(false)}
          tasks={selectedTasks}
          tags={tags}
        />
      )}

      {showDatesModal && (
        <BatchTaskDatesModal
          isOpen={showDatesModal}
          onClose={() => setShowDatesModal(false)}
          tasks={selectedTasks}
          timeFormat={timeFormat}
        />
      )}

      {showMoveModal && (
        <MoveToCalendarModal
          accounts={accounts}
          currentCalendarIds={currentCalendarIds}
          title="Move Selected Tasks"
          description={`${selectedCount} selected ${selectedCount === 1 ? 'task' : 'tasks'}`}
          onMove={handleMoveToCalendar}
          onClose={() => setShowMoveModal(false)}
        />
      )}

      {showExportModal && (
        <ExportModal
          tasks={exportTasks}
          fileName="selected-tasks"
          type="tasks"
          onClose={() => setShowExportModal(false)}
        />
      )}
    </>
  );
};
