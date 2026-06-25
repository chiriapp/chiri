import CornerDownRight from 'lucide-react/icons/corner-down-right';
import { Fragment, type ReactNode, useRef, useState } from 'react';
import { BatchTaskTagsModal } from '$components/modals/BatchTaskTagsModal';
import { DatePickerModal } from '$components/modals/DatePickerModal';
import { MoveToCalendarModal } from '$components/modals/MoveToCalendar/MoveToCalendarModal';
import { ReminderPickerModal } from '$components/modals/ReminderPickerModal';
import { RepeatModal } from '$components/modals/RepeatModal';
import { TaskEditorCalendar } from '$components/taskEditor/TaskEditorCalendar';
import { TaskEditorDates } from '$components/taskEditor/TaskEditorDates';
import { TaskEditorDescription } from '$components/taskEditor/TaskEditorDescription';
import { TaskEditorFooter } from '$components/taskEditor/TaskEditorFooter';
import { TaskEditorHeader } from '$components/taskEditor/TaskEditorHeader';
import { TaskEditorPriority } from '$components/taskEditor/TaskEditorPriority';
import { TaskEditorReadOnlyNotice } from '$components/taskEditor/TaskEditorReadOnlyNotice';
import { TaskEditorReminders } from '$components/taskEditor/TaskEditorReminders';
import { TaskEditorRepeat } from '$components/taskEditor/TaskEditorRepeat';
import { TaskEditorStatus } from '$components/taskEditor/TaskEditorStatus';
import { TaskEditorSubtasks } from '$components/taskEditor/TaskEditorSubtasks';
import { TaskEditorTags } from '$components/taskEditor/TaskEditorTags';
import { TaskEditorTitle } from '$components/taskEditor/TaskEditorTitle';
import { TaskEditorUrl } from '$components/taskEditor/TaskEditorUrl';
import { useSettingsStore } from '$context/settingsContext';
import { useTaskDeletion } from '$hooks/deletion/useTaskDeletion';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useTags } from '$hooks/queries/useTags';
import {
  useAddReminder,
  useRemoveReminder,
  useRemoveTagFromTask,
  useRestoreTask,
  useUpdateReminder,
  useUpdateTask,
} from '$hooks/queries/useTasks';
import { useSetEditorOpen, useSetSelectedTask } from '$hooks/queries/useUIState';
import { useVisibleTasks } from '$hooks/queries/useVisibleTasks';
import { useDismissableLayer } from '$hooks/ui/useDismissableLayer';
import { usePreserveScrollOnWindowFocus } from '$hooks/ui/usePreserveScrollOnWindowFocus';
import { useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import {
  resetStaleCursorOnLayerClose,
  useResetStaleCursorOnLayerOpen,
} from '$hooks/ui/useStaleCursorReset';
import { getTaskByUid } from '$lib/store/tasks';
import type { Task, TaskStatus } from '$types';
import type { EditorFieldKey } from '$types/settings';
import { getContrastTextColor } from '$utils/color';

interface TaskEditorProps {
  task: Task;
  onOpenNotificationSettings?: () => void;
}

const ALL_EDITOR_FIELD_KEYS: EditorFieldKey[] = [
  'status',
  'description',
  'url',
  'dates',
  'repeat',
  'priority',
  'calendar',
  'tags',
  'reminders',
  'subtasks',
];

export const TaskEditor = ({ task, onOpenNotificationSettings }: TaskEditorProps) => {
  const updateTaskMutation = useUpdateTask();
  const setEditorOpenMutation = useSetEditorOpen();
  const setSelectedTaskMutation = useSetSelectedTask();
  const removeTagFromTaskMutation = useRemoveTagFromTask();
  const addReminderMutation = useAddReminder();
  const removeReminderMutation = useRemoveReminder();
  const updateReminderMutation = useUpdateReminder();
  const restoreTaskMutation = useRestoreTask();
  const { data: tags = [] } = useTags();
  const { data: accounts = [] } = useAccounts();
  const {
    notifications,
    timeFormat,
    editorFieldVisibility,
    editorFieldOrder,
    useAccentColorForCheckboxes,
  } = useSettingsStore();
  const resolvedAccentColor = useResolvedAccentColor();
  const { moveTaskToRecentlyDeleted, deleteTaskPermanently } = useTaskDeletion();

  // determine if parent task is visible in the current view
  const visibleTasks = useVisibleTasks();
  const visibleTaskUids = new Set(visibleTasks.map((t) => t.uid));
  const parentTask =
    task.parentUid && !visibleTaskUids.has(task.parentUid)
      ? getTaskByUid(task.parentUid)
      : undefined;

  const isReadOnly = !!task.deletedAt;
  const taskTitleDescription = task.title.trim() || 'Untitled task';
  const checkmarkColor = getContrastTextColor(resolvedAccentColor);
  const deletedEditorFieldOrder = [
    ...editorFieldOrder,
    ...ALL_EDITOR_FIELD_KEYS.filter((fieldKey) => !editorFieldOrder.includes(fieldKey)),
  ];
  const renderedEditorFieldOrder = isReadOnly ? deletedEditorFieldOrder : editorFieldOrder;

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  // WebKit can keep a task row's grab cursor after the editor appears under a stationary mouse
  useResetStaleCursorOnLayerOpen(true);
  usePreserveScrollOnWindowFocus(editorScrollRef);

  const [showTagsModal, setShowTagsModal] = useState(false);

  // date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showMoveCalendarModal, setShowMoveCalendarModal] = useState(false);

  // repeat modal state
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [openRepeatAsCustom, setOpenRepeatAsCustom] = useState(false);

  // reminder picker state
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editReminderDate, setEditReminderDate] = useState<Date | undefined>(undefined);

  useDismissableLayer({
    type: 'panel',
    onEscape: () => {
      const activeElement = document.activeElement;

      if (
        editorContainerRef.current?.contains(activeElement) &&
        (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)
      ) {
        activeElement.blur();
        return;
      }

      setEditorOpenMutation.mutate(false);
    },
  });

  const handleStatusChange = (status: TaskStatus) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: {
        status,
        completed: status === 'completed',
        completedAt: status === 'completed' ? (task.completedAt ?? new Date()) : undefined,
      },
    });
  };

  const handleClose = () => {
    // WebKit can keep the close button's pointer cursor after the task row appears underneath
    resetStaleCursorOnLayerClose();
    setEditorOpenMutation.mutate(false);
  };

  const commitPercentComplete = (value: number) => {
    const updates: Partial<Task> = { percentComplete: value };
    if (value === 100) {
      updates.status = 'completed';
      updates.completed = true;
      updates.completedAt = task.completedAt ?? new Date();
    } else if (value === 0) {
      updates.status = 'needs-action';
      updates.completed = false;
      updates.completedAt = undefined;
    } else {
      updates.status = 'in-process';
      updates.completed = false;
      updates.completedAt = undefined;
    }
    updateTaskMutation.mutate({ id: task.id, updates });
  };

  const handleCalendarChange = (calendarId: string) => {
    const allCalendars = accounts.flatMap((a) =>
      a.calendars.map((cal) => ({ ...cal, accountId: a.id })),
    );
    const targetCalendar = allCalendars.find((c) => c.id === calendarId);
    if (targetCalendar) {
      const updates: Partial<Task> = {
        calendarId: targetCalendar.id,
        accountId: targetCalendar.accountId,
      };
      if (task.parentUid) {
        updates.parentUid = undefined;
      }
      updateTaskMutation.mutate({ id: task.id, updates });
    }
  };

  const handleStartDateChange = (date: Date | undefined, allDay?: boolean) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: { startDate: date, startDateAllDay: allDay },
    });
  };

  const handleDueDateChange = (date: Date | undefined, allDay?: boolean) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: { dueDate: date, dueDateAllDay: allDay },
    });
  };

  const handleStartDateAllDayChange = (allDay: boolean) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: { startDateAllDay: allDay },
    });
  };

  const handleDueDateAllDayChange = (allDay: boolean) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: { dueDateAllDay: allDay },
    });
  };

  const handleRepeatChange = (rrule: string | undefined, repeatFrom: number) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: { rrule, repeatFrom },
    });
  };

  const handleDelete = async () => {
    const deleted = await moveTaskToRecentlyDeleted(task.id);
    if (deleted) {
      setEditorOpenMutation.mutate(false);
    }
  };

  const handleRestore = () => {
    restoreTaskMutation.mutate({ id: task.id });
    setEditorOpenMutation.mutate(false);
  };

  const handlePermanentDelete = async () => {
    const deleted = await deleteTaskPermanently(task.id);
    if (deleted) {
      setEditorOpenMutation.mutate(false);
    }
  };

  const editorFieldRenderers: Record<EditorFieldKey, () => ReactNode> = {
    status: () =>
      isReadOnly || editorFieldVisibility.status ? (
        <TaskEditorStatus
          task={task}
          onStatusChange={handleStatusChange}
          onCommitPercent={commitPercentComplete}
          readOnly={isReadOnly}
        />
      ) : null,
    description: () =>
      isReadOnly || editorFieldVisibility.description ? (
        <TaskEditorDescription task={task} readOnly={isReadOnly} />
      ) : null,
    url: () =>
      isReadOnly || editorFieldVisibility.url ? (
        <TaskEditorUrl task={task} readOnly={isReadOnly} />
      ) : null,
    dates: () =>
      isReadOnly || editorFieldVisibility.dates ? (
        <TaskEditorDates
          task={task}
          timeFormat={timeFormat}
          onOpenStartDate={() => setShowStartDatePicker(true)}
          onOpenDueDate={() => setShowDueDatePicker(true)}
          readOnly={isReadOnly}
        />
      ) : null,
    repeat: () =>
      isReadOnly || editorFieldVisibility.repeat ? (
        <TaskEditorRepeat
          task={task}
          onOpen={() => {
            setOpenRepeatAsCustom(false);
            setShowRepeatModal(true);
          }}
          onOpenCustom={() => {
            setOpenRepeatAsCustom(true);
            setShowRepeatModal(true);
          }}
          onSetPreset={(rrule) => handleRepeatChange(rrule, 0)}
          onClear={() => handleRepeatChange(undefined, 0)}
          readOnly={isReadOnly}
        />
      ) : null,
    priority: () =>
      isReadOnly || editorFieldVisibility.priority ? (
        <TaskEditorPriority task={task} readOnly={isReadOnly} />
      ) : null,
    calendar: () =>
      isReadOnly || editorFieldVisibility.calendar ? (
        <TaskEditorCalendar
          task={task}
          accounts={accounts}
          onOpenMoveCalendar={() => setShowMoveCalendarModal(true)}
          readOnly={isReadOnly}
        />
      ) : null,
    tags: () =>
      isReadOnly || editorFieldVisibility.tags ? (
        <TaskEditorTags
          task={task}
          tags={tags}
          onRemoveTag={(tagId) => removeTagFromTaskMutation.mutate({ taskId: task.id, tagId })}
          onOpenTagsModal={() => setShowTagsModal(true)}
          readOnly={isReadOnly}
        />
      ) : null,
    reminders: () =>
      isReadOnly || editorFieldVisibility.reminders ? (
        <TaskEditorReminders
          task={task}
          timeFormat={timeFormat}
          notifications={notifications}
          onOpenNotificationSettings={onOpenNotificationSettings}
          onRemoveReminder={(reminderId) =>
            removeReminderMutation.mutate({ taskId: task.id, reminderId })
          }
          onOpenReminderPicker={() => setShowReminderPicker(true)}
          onEditReminder={(reminder) => {
            setEditingReminderId(reminder.id);
            setEditReminderDate(reminder.trigger);
          }}
          readOnly={isReadOnly}
        />
      ) : null,
    subtasks: () =>
      isReadOnly || editorFieldVisibility.subtasks ? (
        <TaskEditorSubtasks
          task={task}
          checkmarkColor={checkmarkColor}
          useAccentColorForCheckboxes={useAccentColorForCheckboxes}
          updateTask={(id, updates) => updateTaskMutation.mutate({ id, updates })}
          moveTaskToRecentlyDeleted={moveTaskToRecentlyDeleted}
          readOnly={isReadOnly}
        />
      ) : null,
  };

  return (
    <>
      <div className="flex h-full flex-col bg-white dark:bg-surface-900" ref={editorContainerRef}>
        <TaskEditorHeader
          onDelete={handleDelete}
          onClose={handleClose}
          isDeleted={isReadOnly}
          isSubtask={!!task.parentUid}
          onRestore={handleRestore}
          onDeletePermanently={handlePermanentDelete}
        />

        <div
          ref={editorScrollRef}
          className="app-task-editor-content flex flex-1 flex-col space-y-6 overflow-y-auto overscroll-contain p-4"
        >
          <TaskEditorTitle
            task={task}
            checkmarkColor={checkmarkColor}
            useAccentColorForCheckboxes={useAccentColorForCheckboxes}
            readOnly={isReadOnly}
          />

          {parentTask && (
            <button
              type="button"
              onClick={() => setSelectedTaskMutation.mutate(parentTask.id)}
              className="-mt-3 flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-surface-500 text-xs transition-colors hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
              title={`Go to parent task: ${parentTask.title || 'Untitled task'}`}
            >
              <CornerDownRight className="h-3 w-3 shrink-0" />
              <span className="truncate">
                Subtask of{' '}
                <span className="font-medium text-surface-600 dark:text-surface-300">
                  {parentTask.title || 'Untitled task'}
                </span>
              </span>
            </button>
          )}

          {isReadOnly && <TaskEditorReadOnlyNotice task={task} />}

          {renderedEditorFieldOrder.map((fieldKey) => (
            <Fragment key={fieldKey}>{editorFieldRenderers[fieldKey]()}</Fragment>
          ))}
        </div>

        <TaskEditorFooter task={task} timeFormat={timeFormat} />
      </div>

      {!isReadOnly && showRepeatModal && (
        <RepeatModal
          isOpen={showRepeatModal}
          onClose={() => setShowRepeatModal(false)}
          rrule={task.rrule}
          repeatFrom={task.repeatFrom ?? 0}
          dueDate={task.dueDate ? new Date(task.dueDate) : undefined}
          initialCustom={openRepeatAsCustom}
          onSave={handleRepeatChange}
        />
      )}

      {!isReadOnly && showTagsModal && (
        <BatchTaskTagsModal
          isOpen={showTagsModal}
          onClose={() => setShowTagsModal(false)}
          tasks={[task]}
          tags={tags}
          description={taskTitleDescription}
        />
      )}

      {!isReadOnly && showStartDatePicker && (
        <DatePickerModal
          isOpen={showStartDatePicker}
          onClose={() => setShowStartDatePicker(false)}
          value={task.startDate ? new Date(task.startDate) : undefined}
          onChange={handleStartDateChange}
          title="Start Date"
          allDay={task.startDateAllDay}
          onAllDayChange={handleStartDateAllDayChange}
        />
      )}

      {!isReadOnly && showDueDatePicker && (
        <DatePickerModal
          isOpen={showDueDatePicker}
          onClose={() => setShowDueDatePicker(false)}
          value={task.dueDate ? new Date(task.dueDate) : undefined}
          onChange={handleDueDateChange}
          title="Due Date"
          allDay={task.dueDateAllDay}
          onAllDayChange={handleDueDateAllDayChange}
        />
      )}

      {!isReadOnly && showMoveCalendarModal && (
        <MoveToCalendarModal
          task={task}
          accounts={accounts}
          onMove={handleCalendarChange}
          onClose={() => setShowMoveCalendarModal(false)}
        />
      )}

      {!isReadOnly && showReminderPicker && (
        <ReminderPickerModal
          isOpen={showReminderPicker}
          onClose={() => setShowReminderPicker(false)}
          onSave={(date) => addReminderMutation.mutate({ taskId: task.id, trigger: date })}
          title="Add Reminder"
        />
      )}

      {!isReadOnly && editingReminderId !== null && (
        <ReminderPickerModal
          isOpen={editingReminderId !== null}
          onClose={() => {
            setEditingReminderId(null);
            setEditReminderDate(undefined);
          }}
          value={editReminderDate}
          onSave={(date) => {
            if (editingReminderId) {
              updateReminderMutation.mutate({
                taskId: task.id,
                reminderId: editingReminderId,
                trigger: date,
              });
              setEditingReminderId(null);
              setEditReminderDate(undefined);
            }
          }}
          onClear={() => {
            if (editingReminderId) {
              removeReminderMutation.mutate({ taskId: task.id, reminderId: editingReminderId });
              setEditingReminderId(null);
              setEditReminderDate(undefined);
            }
          }}
          title="Edit Reminder"
        />
      )}
    </>
  );
};
