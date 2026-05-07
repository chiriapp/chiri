import { Fragment, useRef, useState } from 'react';
import { DatePickerModal } from '$components/modals/DatePickerModal';
import { ReminderPickerModal } from '$components/modals/ReminderPickerModal';
import { RepeatModal } from '$components/modals/RepeatModal';
import { TagModal } from '$components/modals/TagModal';
import { TagPickerModal } from '$components/modals/TagPickerModal';
import { TaskEditorCalendar } from '$components/taskEditor/TaskEditorCalendar';
import { TaskEditorDates } from '$components/taskEditor/TaskEditorDates';
import { TaskEditorDescription } from '$components/taskEditor/TaskEditorDescription';
import { TaskEditorFooter } from '$components/taskEditor/TaskEditorFooter';
import { TaskEditorHeader } from '$components/taskEditor/TaskEditorHeader';
import { TaskEditorPriority } from '$components/taskEditor/TaskEditorPriority';
import { TaskEditorReminders } from '$components/taskEditor/TaskEditorReminders';
import { TaskEditorRepeat } from '$components/taskEditor/TaskEditorRepeat';
import { TaskEditorStatus } from '$components/taskEditor/TaskEditorStatus';
import { TaskEditorSubtasks } from '$components/taskEditor/TaskEditorSubtasks';
import { TaskEditorTags } from '$components/taskEditor/TaskEditorTags';
import { TaskEditorTitle } from '$components/taskEditor/TaskEditorTitle';
import { TaskEditorUrl } from '$components/taskEditor/TaskEditorUrl';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useTags } from '$hooks/queries/useTags';
import {
  useAddReminder,
  useAddTagToTask,
  useRemoveReminder,
  useRemoveTagFromTask,
  useUpdateReminder,
  useUpdateTask,
} from '$hooks/queries/useTasks';
import { useSetEditorOpen } from '$hooks/queries/useUIState';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { useEscapeKey } from '$hooks/ui/useEscapeKey';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';
import { useConfirmTaskDelete } from '$hooks/useConfirmTaskDelete';
import type { Task, TaskStatus } from '$types';
import type { EditorFieldKey } from '$types/settings';
import { getContrastTextColor } from '$utils/color';
import { hasOpenModalElements } from '$utils/misc';

interface TaskEditorProps {
  task: Task;
  onOpenNotificationSettings?: () => void;
}

export const TaskEditor = ({ task, onOpenNotificationSettings }: TaskEditorProps) => {
  const updateTaskMutation = useUpdateTask();
  const setEditorOpenMutation = useSetEditorOpen();
  const addTagToTaskMutation = useAddTagToTask();
  const removeTagFromTaskMutation = useRemoveTagFromTask();
  const addReminderMutation = useAddReminder();
  const removeReminderMutation = useRemoveReminder();
  const updateReminderMutation = useUpdateReminder();
  const { data: tags = [] } = useTags();
  const { data: accounts = [] } = useAccounts();
  const {
    accentColor,
    notifications,
    timeFormat,
    editorFieldVisibility,
    editorFieldOrder,
    useAccentColorForCheckboxes,
  } = useSettingsStore();
  const { confirmAndDelete } = useConfirmTaskDelete();

  const checkmarkColor = getContrastTextColor(accentColor);

  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Tag picker state
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [createTagName, setCreateTagName] = useState<string | null>(null);
  const [tagPickerInitialQuery, setTagPickerInitialQuery] = useState('');

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  // Repeat modal state
  const [showRepeatModal, setShowRepeatModal] = useState(false);

  // Reminder picker state
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editReminderDate, setEditReminderDate] = useState<Date | undefined>(undefined);

  const availableTags = tags.filter((t) => !(task.tags || []).includes(t.id));

  // Handle escape key to blur focused inputs
  useEscapeKey(
    (e) => {
      const activeElement = document.activeElement as HTMLElement;

      // Don't handle escape if any modal is open (they should handle it first)
      if (hasOpenModalElements()) {
        return;
      }

      // Check if focus is on an input or textarea within the editor
      if (
        editorContainerRef.current?.contains(activeElement) &&
        (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)
      ) {
        // Blur the input only; stop immediate propagation so useModalEscapeKey doesn't
        // also close the editor on this same keypress — a second Escape will close it.
        e.preventDefault();
        e.stopImmediatePropagation();
        activeElement.blur();
      }
    },
    { capture: true },
  );

  // mark as panel so it yields to modal dialogs (closes on ESC when no input is focused)
  useModalEscapeKey(() => setEditorOpenMutation.mutate(false), {
    isPanel: true,
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
    const deleted = await confirmAndDelete(task.id);
    if (deleted) {
      setEditorOpenMutation.mutate(false);
    }
  };

  const editorFieldRenderers: Record<EditorFieldKey, () => React.ReactNode> = {
    status: () =>
      editorFieldVisibility.status ? (
        <TaskEditorStatus
          task={task}
          onStatusChange={handleStatusChange}
          onCommitPercent={commitPercentComplete}
        />
      ) : null,
    description: () =>
      editorFieldVisibility.description ? <TaskEditorDescription task={task} /> : null,
    url: () => (editorFieldVisibility.url ? <TaskEditorUrl task={task} /> : null),
    dates: () =>
      editorFieldVisibility.dates ? (
        <TaskEditorDates
          task={task}
          timeFormat={timeFormat}
          onOpenStartDate={() => setShowStartDatePicker(true)}
          onOpenDueDate={() => setShowDueDatePicker(true)}
        />
      ) : null,
    repeat: () =>
      editorFieldVisibility.repeat ? (
        <TaskEditorRepeat task={task} onOpen={() => setShowRepeatModal(true)} />
      ) : null,
    priority: () => (editorFieldVisibility.priority ? <TaskEditorPriority task={task} /> : null),
    calendar: () =>
      editorFieldVisibility.calendar ? (
        <TaskEditorCalendar
          task={task}
          accounts={accounts}
          onCalendarChange={handleCalendarChange}
        />
      ) : null,
    tags: () =>
      editorFieldVisibility.tags ? (
        <TaskEditorTags
          task={task}
          tags={tags}
          onAddTag={(tagId) => addTagToTaskMutation.mutate({ taskId: task.id, tagId })}
          onRemoveTag={(tagId) => removeTagFromTaskMutation.mutate({ taskId: task.id, tagId })}
          onOpenTagPicker={() => setShowTagPicker(true)}
        />
      ) : null,
    reminders: () =>
      editorFieldVisibility.reminders ? (
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
        />
      ) : null,
    subtasks: () =>
      editorFieldVisibility.subtasks ? (
        <TaskEditorSubtasks
          task={task}
          checkmarkColor={checkmarkColor}
          useAccentColorForCheckboxes={useAccentColorForCheckboxes}
          updateTask={(id, updates) => updateTaskMutation.mutate({ id, updates })}
          confirmAndDelete={confirmAndDelete}
        />
      ) : null,
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white dark:bg-surface-900" ref={editorContainerRef}>
        <TaskEditorHeader
          onDelete={handleDelete}
          onClose={() => setEditorOpenMutation.mutate(false)}
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-6 flex overscroll-contain flex-col">
          <TaskEditorTitle
            task={task}
            checkmarkColor={checkmarkColor}
            useAccentColorForCheckboxes={useAccentColorForCheckboxes}
          />

          {editorFieldOrder.map((fieldKey) => (
            <Fragment key={fieldKey}>{editorFieldRenderers[fieldKey]()}</Fragment>
          ))}
        </div>

        <TaskEditorFooter task={task} timeFormat={timeFormat} />
      </div>

      {showRepeatModal && (
        <RepeatModal
          isOpen={showRepeatModal}
          onClose={() => setShowRepeatModal(false)}
          rrule={task.rrule}
          repeatFrom={task.repeatFrom ?? 0}
          dueDate={task.dueDate ? new Date(task.dueDate) : undefined}
          onSave={handleRepeatChange}
        />
      )}

      {showTagPicker && (
        <TagPickerModal
          isOpen={showTagPicker}
          onClose={() => setShowTagPicker(false)}
          availableTags={availableTags}
          onSelectTag={(tagId) => addTagToTaskMutation.mutate({ taskId: task.id, tagId })}
          onCreateTag={(name) => {
            setTagPickerInitialQuery(name);
            setShowTagPicker(false);
            setCreateTagName(name);
          }}
          allTagsAssigned={availableTags.length === 0 && tags.length > 0}
          noTagsExist={tags.length === 0}
          initialQuery={tagPickerInitialQuery}
        />
      )}

      {createTagName !== null && (
        <TagModal
          tagId={null}
          initialName={createTagName}
          onClose={() => {
            setCreateTagName(null);
            setShowTagPicker(true);
          }}
        />
      )}

      {showStartDatePicker && (
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

      {showDueDatePicker && (
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

      {showReminderPicker && (
        <ReminderPickerModal
          isOpen={showReminderPicker}
          onClose={() => setShowReminderPicker(false)}
          onSave={(date) => addReminderMutation.mutate({ taskId: task.id, trigger: date })}
          title="Add Reminder"
        />
      )}

      {editingReminderId !== null && (
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
