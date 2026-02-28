import { openUrl } from '@tauri-apps/plugin-opener';
import { format } from 'date-fns';
import Bell from 'lucide-react/icons/bell';
import Calendar from 'lucide-react/icons/calendar';
import Check from 'lucide-react/icons/check';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import Clock from 'lucide-react/icons/clock';
import Flag from 'lucide-react/icons/flag';
import FolderSync from 'lucide-react/icons/folder-sync';
import Link from 'lucide-react/icons/link';
import Plus from 'lucide-react/icons/plus';
import Tag from 'lucide-react/icons/tag';
import Trash2 from 'lucide-react/icons/trash-2';
import X from 'lucide-react/icons/x';
import { useEffect, useRef, useState } from 'react';
import { ComposedInput } from '@/components/ComposedInput';
import { ComposedTextarea } from '@/components/ComposedTextarea';
import {
  useAccounts,
  useAddReminder,
  useAddTagToTask,
  useCreateTask,
  useDeleteSubtask,
  useRemoveReminder,
  useRemoveTagFromTask,
  useSetEditorOpen,
  useTags,
  useToggleSubtaskComplete,
  useUpdateReminder,
  useUpdateSubtask,
  useUpdateTask,
} from '@/hooks/queries';
import { useConfirmTaskDelete } from '@/hooks/useConfirmTaskDelete';
import { useDebouncedTaskUpdate } from '@/hooks/useDebouncedTaskUpdate';
import { useModalEscapeKey } from '@/hooks/useModalEscapeKey';
import * as taskData from '@/lib/taskData';
import { useSettingsStore } from '@/store/settingsStore';
import type { Priority, Task } from '@/types';
import { filterCalDavDescription } from '@/utils/ical';
import { hasOpenModalElements } from '@/utils/misc';
import { PRIORITIES } from '@/utils/priority';
import { getIconByName } from '../data/icons';
import { getContrastTextColor } from '../utils/color';
import { DatePickerModal } from './modals/DatePickerModal';
import { ReminderPickerModal } from './modals/ReminderPickerModal';
import { SubtaskModal } from './modals/SubtaskModal';
import { TagPickerModal } from './modals/TagPickerModal';
import { SubtaskTreeItem } from './SubtaskTreeItem';
import { Tooltip } from './Tooltip';

interface TaskEditorProps {
  task: Task;
}

export function TaskEditor({ task }: TaskEditorProps) {
  const updateTaskMutation = useUpdateTask();
  const setEditorOpenMutation = useSetEditorOpen();
  const createTaskMutation = useCreateTask();
  const addTagToTaskMutation = useAddTagToTask();
  const removeTagFromTaskMutation = useRemoveTagFromTask();
  const addReminderMutation = useAddReminder();
  const removeReminderMutation = useRemoveReminder();
  const updateReminderMutation = useUpdateReminder();
  const updateSubtaskMutation = useUpdateSubtask();
  const deleteSubtaskMutation = useDeleteSubtask();
  const toggleSubtaskCompleteMutation = useToggleSubtaskComplete();
  const { data: tags = [] } = useTags();
  const { data: accounts = [] } = useAccounts();
  const { accentColor } = useSettingsStore();
  const { confirmAndDelete } = useConfirmTaskDelete();

  // get contrast color for checkbox checkmarks
  const checkmarkColor = getContrastTextColor(accentColor);

  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editReminderDate, setEditReminderDate] = useState<Date | undefined>(undefined);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  // Debounced field updates
  const [pendingTitle, updatePendingTitle] = useDebouncedTaskUpdate(task.id, 'title', task.title);
  const [pendingDescription, updatePendingDescription] = useDebouncedTaskUpdate(
    task.id,
    'description',
    task.description ?? '',
  );
  const [pendingUrl, updatePendingUrl] = useDebouncedTaskUpdate(task.id, 'url', task.url ?? '');

  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const childTasks = taskData.getChildTasks(task.uid);
  const childCount = taskData.countChildren(task.uid);
  const taskTags = (task.tags || [])
    .map((tagId) => taskData.getTags().find((t) => t.id === tagId))
    .filter(Boolean);
  const availableTags = tags.filter((t) => !(task.tags || []).includes(t.id));

  // Get current calendar info
  const currentAccount = accounts.find((a) => a.id === task.accountId);
  const currentCalendar = currentAccount?.calendars.find((c) => c.id === task.calendarId);

  // Get all available calendars for moving
  const allCalendars = accounts.flatMap((account) =>
    account.calendars.map((cal) => ({
      ...cal,
      accountId: account.id,
      accountName: account.name,
    })),
  );

  // focus title on open if empty
  useEffect(() => {
    if (!task.title && titleRef.current) {
      titleRef.current.focus();
    }
  }, [task.title]);

  // Handle escape key to blur focused inputs
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const activeElement = document.activeElement as HTMLElement;

        // Don't handle escape if any modal is open (they should handle it first)
        if (hasOpenModalElements()) {
          return;
        }

        // Check if focus is on an input or textarea within the editor
        if (
          editorContainerRef.current?.contains(activeElement) &&
          (activeElement instanceof HTMLInputElement ||
            activeElement instanceof HTMLTextAreaElement)
        ) {
          // Only blur the input, don't stop propagation so useModalEscapeKey can run on next press
          e.preventDefault();
          activeElement.blur();
          return;
        }
      }
    };

    // add listener in capture phase
    window.addEventListener('keydown', handleEsc, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleEsc, { capture: true });
      // Clean up scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // mark as panel so it yields to modal dialogs (closes on ESC when no input is focused)
  useModalEscapeKey(() => setEditorOpenMutation.mutate(false), { isPanel: true });

  const handleTitleChange = (value: string, cursorPos?: number | null) => {
    updatePendingTitle(value);
    requestAnimationFrame(() => {
      if (titleRef.current && cursorPos !== null && cursorPos !== undefined) {
        titleRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  const handleDescriptionChange = (value: string, cursorPos?: number | null) => {
    updatePendingDescription(value);
    requestAnimationFrame(() => {
      if (descriptionRef.current && cursorPos !== null && cursorPos !== undefined) {
        descriptionRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  const handleUrlChange = (value: string, cursorPos?: number | null) => {
    updatePendingUrl(value);
    requestAnimationFrame(() => {
      if (urlRef.current && cursorPos !== null && cursorPos !== undefined) {
        urlRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  const handlePriorityChange = (priority: Priority) => {
    updateTaskMutation.mutate({ id: task.id, updates: { priority } });
  };

  const handleCalendarChange = (calendarId: string) => {
    const targetCalendar = allCalendars.find((c) => c.id === calendarId);
    if (targetCalendar) {
      // If this is a subtask and calendar is being changed, convert it to a regular task
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
    updateTaskMutation.mutate({ id: task.id, updates: { dueDate: date, dueDateAllDay: allDay } });
  };

  const handleStartDateAllDayChange = (allDay: boolean) => {
    updateTaskMutation.mutate({ id: task.id, updates: { startDateAllDay: allDay } });
  };

  const handleDueDateAllDayChange = (allDay: boolean) => {
    updateTaskMutation.mutate({ id: task.id, updates: { dueDateAllDay: allDay } });
  };

  const handleAddReminder = (date: Date) => {
    addReminderMutation.mutate({ taskId: task.id, trigger: date });
  };

  const handleRemoveReminder = (reminderId: string) => {
    removeReminderMutation.mutate({ taskId: task.id, reminderId });
  };

  const handleUpdateReminder = (reminderId: string, trigger: Date) => {
    updateReminderMutation.mutate({ taskId: task.id, reminderId, trigger });
    setEditingReminderId(null);
    setEditReminderDate(undefined);
  };

  const handleStartEditReminder = (reminder: { id: string; trigger: Date }) => {
    setEditingReminderId(reminder.id);
    setEditReminderDate(new Date(reminder.trigger));
  };

  const handleCancelEditReminder = () => {
    setEditingReminderId(null);
    setEditReminderDate(undefined);
  };

  const handleAddChildTask = (title: string) => {
    // create a new task with parentUid set to this task's UID
    createTaskMutation.mutate({
      title: title,
      parentUid: task.uid,
      accountId: task.accountId,
      calendarId: task.calendarId,
      priority: 'none',
    });
  };

  const handleDelete = async () => {
    const deleted = await confirmAndDelete(task.id);
    if (deleted) {
      setEditorOpenMutation.mutate(false);
    }
  };

  return (
    <div className={`flex flex-col h-full`} ref={editorContainerRef}>
      <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
        <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">Edit Task</h2>
        <div className="flex items-center gap-2">
          <Tooltip content="Delete" position="bottom">
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 text-surface-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              aria-label="Delete task"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </Tooltip>

          <button
            type="button"
            onClick={() => setEditorOpenMutation.mutate(false)}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
            aria-label="Close editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 flex overscroll-contain flex-col">
        <div>
          <label
            htmlFor="task-title"
            className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
          >
            Title
          </label>
          <ComposedInput
            ref={titleRef}
            id="task-title"
            type="text"
            value={pendingTitle}
            onChange={handleTitleChange}
            onWheel={(e) => {
              // handle horizontal scrolling with trackpad for input field
              if (Math.abs(e.deltaX) > 0) {
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.scrollLeft += e.deltaX;

                // hide cursor during scroll to prevent visual glitch
                setIsScrolling(true);
                if (scrollTimeoutRef.current) {
                  clearTimeout(scrollTimeoutRef.current);
                }
                scrollTimeoutRef.current = setTimeout(() => {
                  setIsScrolling(false);
                }, 150);
              }
            }}
            placeholder="Task title..."
            className={`w-full text-xl font-semibold text-surface-800 dark:text-surface-200 placeholder:text-surface-400 border-0 focus:outline-none focus:ring-0 bg-transparent ${isScrolling ? 'caret-transparent' : ''}`}
          />
        </div>

        <div>
          <label
            htmlFor="task-description"
            className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
          >
            Description
          </label>
          <ComposedTextarea
            ref={descriptionRef}
            id="task-description"
            value={filterCalDavDescription(pendingDescription)}
            onChange={handleDescriptionChange}
            placeholder="Add a description..."
            rows={4}
            className="w-full px-3 py-2 text-sm text-surface-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/50 resize-none"
          />
        </div>

        <div>
          <label
            htmlFor="task-url"
            className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
          >
            <Link className="w-4 h-4" />
            URL
          </label>
          <div className="flex items-center gap-2">
            <ComposedInput
              ref={urlRef}
              id="task-url"
              type="url"
              value={pendingUrl}
              onChange={handleUrlChange}
              placeholder="https://example.com"
              className="flex-1 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/50"
            />
            {pendingUrl && (
              <button
                type="button"
                onClick={() => openUrl(pendingUrl)}
                className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                title="Open URL"
              >
                <Link className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div
              id="start-date-label"
              className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
            >
              <Clock className="w-4 h-4" />
              Start Date
            </div>
            <button
              type="button"
              onClick={() => setShowStartDatePicker(true)}
              aria-labelledby="start-date-label"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg hover:border-surface-300 dark:hover:border-surface-500 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-surface-400 flex-shrink-0" />
              <span
                className={
                  task.startDate ? 'text-surface-700 dark:text-surface-300' : 'text-surface-400'
                }
              >
                {task.startDate
                  ? task.startDateAllDay
                    ? `${format(new Date(task.startDate), 'MMM d, yyyy')} (All day)`
                    : format(new Date(task.startDate), 'MMM d, yyyy h:mm a')
                  : 'Set start date...'}
              </span>
            </button>
          </div>
          <div>
            <div
              id="due-date-label"
              className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
            >
              <Calendar className="w-4 h-4" />
              Due Date
            </div>
            <button
              type="button"
              onClick={() => setShowDueDatePicker(true)}
              aria-labelledby="due-date-label"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg hover:border-surface-300 dark:hover:border-surface-500 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-surface-400 flex-shrink-0" />
              <span
                className={
                  task.dueDate ? 'text-surface-700 dark:text-surface-300' : 'text-surface-400'
                }
              >
                {task.dueDate
                  ? task.dueDateAllDay
                    ? `${format(new Date(task.dueDate), 'MMM d, yyyy')} (All day)`
                    : format(new Date(task.dueDate), 'MMM d, yyyy h:mm a')
                  : 'Set due date...'}
              </span>
            </button>
          </div>
        </div>

        <div>
          <div
            id="priority-label"
            className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
          >
            <Flag className="w-4 h-4" />
            Priority
          </div>
          {/* biome-ignore lint/a11y/useSemanticElements: fieldset would change semantic structure; div with role="group" is appropriate here */}
          <div className="flex gap-2" role="group" aria-labelledby="priority-label">
            {PRIORITIES.map((p) => (
              <button
                type="button"
                key={p.value}
                onClick={() => handlePriorityChange(p.value)}
                className={`
                  flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors
                  ${
                    task.priority === p.value
                      ? `${p.borderColor} ${p.bgColor}`
                      : 'border-surface-200 dark:border-surface-600 hover:border-surface-300 text-surface-600 dark:text-surface-400'
                  }
                `}
              >
                <span className={p.color}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="task-calendar"
            className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
          >
            <FolderSync className="w-4 h-4" />
            Calendar
          </label>
          {allCalendars.length > 0 ? (
            <>
              <select
                id="task-calendar"
                value={task.calendarId}
                onChange={(e) => handleCalendarChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/50"
              >
                {accounts.map((account) => (
                  <optgroup key={account.id} label={account.name}>
                    {account.calendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.displayName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {currentCalendar && currentAccount && (
                <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                  Currently in: {currentAccount.name} / {currentCalendar.displayName}
                </p>
              )}
              {task.parentUid && (
                <p className="mt-3 text-xs text-surface-700 dark:text-surface-200 border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 rounded-md p-2">
                  Changing the calendar will convert this subtask to a regular task.
                </p>
              )}
            </>
          ) : (
            <div
              className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-600 bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500 rounded-lg cursor-not-allowed"
              title="Add a CalDAV account to assign tasks to calendars"
            >
              No calendars available
            </div>
          )}
        </div>

        <div>
          <div
            id="tag-label"
            className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
          >
            <Tag className="w-4 h-4" />
            Tags
          </div>
          {/* biome-ignore lint/a11y/useSemanticElements: fieldset would change semantic structure; div with role="group" is appropriate here */}
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="tag-label">
            {taskTags.map((tag) => {
              if (!tag) return null;
              const TagIcon = getIconByName(tag.icon || 'tag');
              return (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded border text-xs font-medium group"
                  style={{
                    borderColor: tag.color,
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                  }}
                >
                  {tag.emoji ? (
                    <span className="text-xs leading-none">{tag.emoji}</span>
                  ) : (
                    <TagIcon className="w-3 h-3" />
                  )}
                  {tag.name}
                  <button
                    type="button"
                    onClick={() =>
                      removeTagFromTaskMutation.mutate({ taskId: task.id, tagId: tag.id })
                    }
                    className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            <button
              type="button"
              onClick={() => setShowTagPicker(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-surface-500 dark:text-surface-400 border border-dashed border-surface-300 dark:border-surface-600 rounded-full hover:border-surface-400 dark:hover:border-surface-500 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add tag
            </button>
          </div>
        </div>

        <div>
          <div
            id="reminders-label"
            className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 mb-2"
          >
            <Bell className="w-4 h-4" />
            Reminders {(task.reminders?.length || 0) > 0 && `(${task.reminders?.length})`}
          </div>
          {/* biome-ignore lint/a11y/useSemanticElements: fieldset would change semantic structure; div with role="group" is appropriate here */}
          <div className="space-y-2" role="group" aria-labelledby="reminders-label">
            {(task.reminders || []).map((reminder) => (
              // biome-ignore lint/a11y/useSemanticElements: Using div with role=button to allow nested delete button without button nesting
              <div
                key={reminder.id}
                role="button"
                tabIndex={0}
                className="flex items-center gap-2 px-3 py-2 bg-surface-50 dark:bg-surface-700 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-600 transition-colors cursor-pointer group"
                onClick={() => handleStartEditReminder(reminder)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleStartEditReminder(reminder);
                  }
                }}
              >
                <Bell className="w-4 h-4 text-surface-400 flex-shrink-0" />
                <span className="flex-1 text-sm text-surface-700 dark:text-surface-300">
                  {format(new Date(reminder.trigger), 'MMM d, yyyy h:mm a')}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveReminder(reminder.id);
                  }}
                  className="p-1 text-surface-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-full invisible group-hover:visible"
                  title="Remove reminder"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setShowReminderPicker(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-surface-500 dark:text-surface-400 border border-dashed border-surface-300 dark:border-surface-600 rounded-full hover:border-surface-400 dark:hover:border-surface-500 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add reminder
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div
              id="subtasks-label"
              className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400"
            >
              <CheckCircle2 className="w-4 h-4" />
              Subtasks {childCount > 0 && `(${childCount})`}
            </div>
          </div>

          {/* biome-ignore lint/a11y/useSemanticElements: fieldset would change semantic structure; div with role="group" is appropriate here */}
          <div className="space-y-1" role="group" aria-labelledby="subtasks-label">
            {childTasks.map((childTask) => (
              <SubtaskTreeItem
                key={childTask.id}
                task={childTask}
                depth={0}
                checkmarkColor={checkmarkColor}
                expandedSubtasks={expandedSubtasks}
                setExpandedSubtasks={setExpandedSubtasks}
                updateTask={(id, updates) => updateTaskMutation.mutate({ id, updates })}
                confirmAndDelete={confirmAndDelete}
                getChildTasks={taskData.getChildTasks}
                countChildren={taskData.countChildren}
              />
            ))}

            {task.subtasks.length > 0 && (
              <div className="pt-2 border-t border-surface-200 dark:border-surface-700">
                <div className="text-xs text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                  <Flag className="w-3 h-3" />
                  Legacy subtasks (will be migrated)
                </div>
                {task.subtasks.map((subtask) => {
                  return (
                    <div key={subtask.id} className="flex items-center gap-2 group opacity-60">
                      <button
                        type="button"
                        onClick={() =>
                          toggleSubtaskCompleteMutation.mutate({
                            taskId: task.id,
                            subtaskId: subtask.id,
                          })
                        }
                        className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0
                          ${
                            subtask.completed
                              ? 'bg-primary-500 border-primary-500'
                              : 'border-surface-300 dark:border-surface-600 hover:border-primary-400'
                          }
                        `}
                      >
                        {subtask.completed && (
                          <Check
                            className="w-3 h-3"
                            style={{ color: checkmarkColor }}
                            strokeWidth={3}
                          />
                        )}
                      </button>
                      <ComposedInput
                        type="text"
                        value={subtask.title}
                        onChange={(value) => {
                          updateSubtaskMutation.mutate({
                            taskId: task.id,
                            subtaskId: subtask.id,
                            updates: { title: value },
                          });
                        }}
                        className={`
                          flex-1 px-2 py-1 text-sm bg-transparent border-0 focus:outline-none focus:ring-0
                          ${subtask.completed ? 'line-through text-surface-400' : 'text-surface-700 dark:text-surface-300'}
                        `}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          deleteSubtaskMutation.mutate({ taskId: task.id, subtaskId: subtask.id })
                        }
                        className="opacity-0 group-hover:opacity-100 p-1 text-surface-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSubtaskModal(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-surface-500 dark:text-surface-400 border border-dashed border-surface-300 dark:border-surface-600 rounded-full hover:border-surface-400 dark:hover:border-surface-500 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add a subtask
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-surface-200 dark:border-surface-700 text-xs text-surface-400">
        <div>Created: {format(new Date(task.createdAt), 'PPp')}</div>
        <div>Modified: {format(new Date(task.modifiedAt), 'PPp')}</div>
      </div>

      {/* Start Date Picker Modal */}
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

      {/* Due Date Picker Modal */}
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

      {/* Tag Picker Modal */}
      {showTagPicker && (
        <TagPickerModal
          isOpen={showTagPicker}
          onClose={() => setShowTagPicker(false)}
          availableTags={availableTags}
          onSelectTag={(tagId) => addTagToTaskMutation.mutate({ taskId: task.id, tagId })}
          allTagsAssigned={availableTags.length === 0 && tags.length > 0}
          noTagsExist={tags.length === 0}
        />
      )}

      {/* Add Reminder Modal */}
      {showReminderPicker && (
        <ReminderPickerModal
          isOpen={showReminderPicker}
          onClose={() => setShowReminderPicker(false)}
          onSave={handleAddReminder}
          title="Add Reminder"
        />
      )}

      {/* Edit Reminder Modal */}
      {editingReminderId !== null && (
        <ReminderPickerModal
          isOpen={editingReminderId !== null}
          onClose={handleCancelEditReminder}
          value={editReminderDate}
          onSave={(date) => {
            if (editingReminderId) {
              handleUpdateReminder(editingReminderId, date);
            }
          }}
          onClear={() => {
            if (editingReminderId) {
              handleRemoveReminder(editingReminderId);
              handleCancelEditReminder();
            }
          }}
          title="Edit Reminder"
        />
      )}

      {/* Add Subtask Modal */}
      {showSubtaskModal && (
        <SubtaskModal
          isOpen={showSubtaskModal}
          onClose={() => setShowSubtaskModal(false)}
          onAdd={handleAddChildTask}
        />
      )}
    </div>
  );
}
