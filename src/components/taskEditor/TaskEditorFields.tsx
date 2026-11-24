import { Fragment, type ReactNode } from 'react';
import { TaskEditorCalendar } from '$components/taskEditor/TaskEditorCalendar';
import { TaskEditorDates } from '$components/taskEditor/TaskEditorDates';
import { TaskEditorDescription } from '$components/taskEditor/TaskEditorDescription';
import { TaskEditorPriority } from '$components/taskEditor/TaskEditorPriority';
import { TaskEditorProgress } from '$components/taskEditor/TaskEditorProgress';
import { TaskEditorReadOnlyNotice } from '$components/taskEditor/TaskEditorReadOnlyNotice';
import { TaskEditorReminders } from '$components/taskEditor/TaskEditorReminders';
import { TaskEditorRepeat } from '$components/taskEditor/TaskEditorRepeat';
import { TaskEditorStatus } from '$components/taskEditor/TaskEditorStatus';
import { TaskEditorSubtasks } from '$components/taskEditor/TaskEditorSubtasks';
import { TaskEditorTags } from '$components/taskEditor/TaskEditorTags';
import { TaskEditorURL } from '$components/taskEditor/TaskEditorURL';
import type { TaskEditorActions } from '$hooks/ui/useTaskEditorActions';
import type { TaskEditorModalsState } from '$hooks/ui/useTaskEditorModals';
import type { Account } from '$types/account';
import type { EditorFieldKey, EditorFieldVisibility } from '$types/settings/categories/editor';
import type { TimeFormat } from '$types/settings/categories/region';
import type { Tag } from '$types/tag';
import type { Task } from '$types/task/model';

const ALL_EDITOR_FIELD_KEYS: EditorFieldKey[] = [
  'status',
  'progress',
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

interface TaskEditorFieldsProps {
  task: Task;
  accounts: Account[];
  tags: Tag[];
  editorFieldVisibility: EditorFieldVisibility;
  editorFieldOrder: EditorFieldKey[];
  timeFormat: TimeFormat;
  notifications: boolean;
  notifyReminders: boolean;
  checkmarkColor: string;
  useAccentColorForCheckboxes: boolean;
  isReadOnly: boolean;
  onOpenNotificationSettings?: () => void;
  actions: TaskEditorActions;
  modals: TaskEditorModalsState;
  highlightProgress?: boolean;
  progressFocusRequest?: number;
}

export const TaskEditorFields = ({
  task,
  accounts,
  tags,
  editorFieldVisibility,
  editorFieldOrder,
  timeFormat,
  notifications,
  notifyReminders,
  checkmarkColor,
  useAccentColorForCheckboxes,
  isReadOnly,
  onOpenNotificationSettings,
  actions,
  modals,
  highlightProgress = false,
  progressFocusRequest = 0,
}: TaskEditorFieldsProps) => {
  const renderedEditorFieldOrder = isReadOnly
    ? [
        ...editorFieldOrder,
        ...ALL_EDITOR_FIELD_KEYS.filter((fieldKey) => !editorFieldOrder.includes(fieldKey)),
      ]
    : editorFieldOrder;

  const editorFieldRenderers: Record<EditorFieldKey, () => ReactNode> = {
    status: () =>
      isReadOnly || editorFieldVisibility.status ? (
        <TaskEditorStatus
          task={task}
          onStatusChange={actions.handleStatusChange}
          useAccentColorForCheckboxes={useAccentColorForCheckboxes}
          readOnly={isReadOnly}
        />
      ) : null,
    progress: () =>
      isReadOnly || editorFieldVisibility.progress || highlightProgress ? (
        <TaskEditorProgress
          task={task}
          onCommitPercent={actions.commitPercentComplete}
          readOnly={isReadOnly}
          highlighted={highlightProgress}
          highlightRequest={progressFocusRequest}
        />
      ) : null,
    description: () =>
      isReadOnly || editorFieldVisibility.description ? (
        <TaskEditorDescription task={task} readOnly={isReadOnly} />
      ) : null,
    url: () =>
      isReadOnly || editorFieldVisibility.url ? (
        <TaskEditorURL task={task} readOnly={isReadOnly} />
      ) : null,
    dates: () =>
      isReadOnly || editorFieldVisibility.dates ? (
        <TaskEditorDates
          task={task}
          timeFormat={timeFormat}
          onOpenStartDate={modals.openStartDatePicker}
          onOpenDueDate={modals.openDueDatePicker}
          readOnly={isReadOnly}
        />
      ) : null,
    repeat: () =>
      isReadOnly || editorFieldVisibility.repeat ? (
        <TaskEditorRepeat
          task={task}
          onOpen={() => modals.openRepeatModal()}
          onOpenCustom={() => modals.openRepeatModal(true)}
          onSetPreset={(rrule) => actions.handleRepeatChange(rrule, 0)}
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
          onOpenMoveCalendar={modals.openMoveCalendarModal}
          readOnly={isReadOnly}
        />
      ) : null,
    tags: () =>
      isReadOnly || editorFieldVisibility.tags ? (
        <TaskEditorTags
          task={task}
          tags={tags}
          onRemoveTag={actions.handleRemoveTag}
          onOpenTagsModal={modals.openTagsModal}
          readOnly={isReadOnly}
        />
      ) : null,
    reminders: () =>
      isReadOnly || editorFieldVisibility.reminders ? (
        <TaskEditorReminders
          task={task}
          timeFormat={timeFormat}
          notifications={notifications}
          notifyReminders={notifyReminders}
          onOpenNotificationSettings={onOpenNotificationSettings}
          onRemoveReminder={actions.handleRemoveReminder}
          onOpenReminderPicker={modals.openReminderPicker}
          onEditReminder={modals.openEditReminder}
          readOnly={isReadOnly}
        />
      ) : null,
    subtasks: () =>
      isReadOnly || editorFieldVisibility.subtasks ? (
        <TaskEditorSubtasks
          task={task}
          checkmarkColor={checkmarkColor}
          useAccentColorForCheckboxes={useAccentColorForCheckboxes}
          updateTask={actions.updateTask}
          moveTaskToRecentlyDeleted={actions.moveTaskToRecentlyDeleted}
          readOnly={isReadOnly}
        />
      ) : null,
  };

  return (
    <>
      {isReadOnly && <TaskEditorReadOnlyNotice task={task} />}
      {renderedEditorFieldOrder.map((fieldKey) => (
        <Fragment key={fieldKey}>{editorFieldRenderers[fieldKey]()}</Fragment>
      ))}
    </>
  );
};
