import CalendarClock from 'lucide-react/icons/calendar-clock';
import CalendarFold from 'lucide-react/icons/calendar-fold';
import { useMemo, useState } from 'react';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { DatePickerModal } from '$components/modals/DatePickerModal';
import { useBatchUpdateTasks } from '$hooks/queries/useTasks';
import type { Task } from '$types';
import type { TimeFormat } from '$types/preference';
import { formatDate, formatTime } from '$utils/date';

interface BatchTaskDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  timeFormat: TimeFormat;
}

type DateField = 'dueDate' | 'startDate';

const getFieldLabel = (field: DateField) => (field === 'dueDate' ? 'Due Date' : 'Start Date');

const getInitialAllDay = (tasks: Task[], field: DateField): boolean => {
  const allDayKey = field === 'dueDate' ? 'dueDateAllDay' : 'startDateAllDay';
  const values = tasks.map((task) => task[allDayKey]).filter((v) => v !== undefined);
  if (values.length === 0) return true;
  return values.every(Boolean);
};

const getInitialPreserveTime = (tasks: Task[], field: DateField): boolean => {
  const dateKey = field;
  const allDayKey = field === 'dueDate' ? 'dueDateAllDay' : 'startDateAllDay';
  const datedTasks = tasks.filter((task) => task[dateKey] && !task[allDayKey]);
  if (datedTasks.length < 2) return false;
  const firstTime = datedTasks[0][dateKey]!.getHours() * 60 + datedTasks[0][dateKey]!.getMinutes();
  return datedTasks.every(
    (task) => task[dateKey]!.getHours() * 60 + task[dateKey]!.getMinutes() === firstTime,
  );
};

export const BatchTaskDatesModal = ({
  isOpen,
  onClose,
  tasks,
  timeFormat,
}: BatchTaskDatesModalProps) => {
  const batchUpdateTasksMutation = useBatchUpdateTasks();
  const [editingField, setEditingField] = useState<DateField | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueDateAllDay, setDueDateAllDay] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startDateAllDay, setStartDateAllDay] = useState(true);
  const [preserveDueTime, setPreserveDueTime] = useState(false);
  const [preserveStartTime, setPreserveStartTime] = useState(false);
  const [hasSetDueDate, setHasSetDueDate] = useState(false);
  const [hasSetStartDate, setHasSetStartDate] = useState(false);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setDueDate(undefined);
      setDueDateAllDay(getInitialAllDay(tasks, 'dueDate'));
      setStartDate(undefined);
      setStartDateAllDay(getInitialAllDay(tasks, 'startDate'));
      setPreserveDueTime(getInitialPreserveTime(tasks, 'dueDate'));
      setPreserveStartTime(getInitialPreserveTime(tasks, 'startDate'));
      setHasSetDueDate(false);
      setHasSetStartDate(false);
      setEditingField(null);
    }
  }

  const selectedCount = tasks.length;

  const dueDateSummary = useMemo(() => {
    const datedCount = tasks.filter((task) => task.dueDate).length;
    if (datedCount === 0) return 'No tasks have a due date';
    if (datedCount === selectedCount) return 'All tasks have a due date';
    return `${datedCount} of ${selectedCount} tasks have a due date`;
  }, [tasks, selectedCount]);

  const startDateSummary = useMemo(() => {
    const datedCount = tasks.filter((task) => task.startDate).length;
    if (datedCount === 0) return 'No tasks have a start date';
    if (datedCount === selectedCount) return 'All tasks have a start date';
    return `${datedCount} of ${selectedCount} tasks have a start date`;
  }, [tasks, selectedCount]);

  const hasChanges = hasSetDueDate || hasSetStartDate;

  const applyDateToTask = (
    task: Task,
    field: DateField,
    newDate: Date | undefined,
    allDay: boolean,
    preserveTime: boolean,
  ): Partial<Task> | null => {
    const dateKey = field;
    const allDayKey = field === 'dueDate' ? 'dueDateAllDay' : 'startDateAllDay';
    const currentDate = task[dateKey];

    if (!newDate) {
      if (!currentDate) return null;
      return { [dateKey]: undefined, [allDayKey]: false } as Partial<Task>;
    }

    let resolvedDate = newDate;
    if (preserveTime && currentDate && !allDay) {
      resolvedDate = new Date(newDate);
      resolvedDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
    }

    const datesEqual =
      currentDate && currentDate.getTime() === resolvedDate.getTime() && task[allDayKey] === allDay;
    if (datesEqual) return null;

    return { [dateKey]: resolvedDate, [allDayKey]: allDay } as Partial<Task>;
  };

  const handleClear = () => {
    setDueDate(undefined);
    setDueDateAllDay(true);
    setStartDate(undefined);
    setStartDateAllDay(true);
    setPreserveDueTime(false);
    setPreserveStartTime(false);
    setHasSetDueDate(true);
    setHasSetStartDate(true);
  };

  const hasAnyExistingDate = tasks.some((task) => task.dueDate || task.startDate);

  const handleSave = () => {
    const updates = tasks.flatMap((task) => {
      const taskUpdates: Partial<Task> = {};

      if (hasSetDueDate) {
        const dueUpdates = applyDateToTask(
          task,
          'dueDate',
          dueDate,
          dueDateAllDay,
          preserveDueTime,
        );
        if (dueUpdates) Object.assign(taskUpdates, dueUpdates);
      }

      if (hasSetStartDate) {
        const startUpdates = applyDateToTask(
          task,
          'startDate',
          startDate,
          startDateAllDay,
          preserveStartTime,
        );
        if (startUpdates) Object.assign(taskUpdates, startUpdates);
      }

      if (Object.keys(taskUpdates).length === 0) return [];
      return [{ id: task.id, updates: taskUpdates }];
    });

    if (updates.length > 0) {
      batchUpdateTasksMutation.mutate(updates);
    }
    onClose();
  };

  const handleDatePickerChange = (field: DateField, date: Date | undefined, allDay?: boolean) => {
    if (field === 'dueDate') {
      setDueDate(date);
      if (allDay !== undefined) setDueDateAllDay(allDay);
      setHasSetDueDate(true);
    } else {
      setStartDate(date);
      if (allDay !== undefined) setStartDateAllDay(allDay);
      setHasSetStartDate(true);
    }
  };

  const handleDatePickerAllDayChange = (field: DateField, allDay: boolean) => {
    if (field === 'dueDate') {
      setDueDateAllDay(allDay);
      setHasSetDueDate(true);
    } else {
      setStartDateAllDay(allDay);
      setHasSetStartDate(true);
    }
  };

  const renderDateRow = (field: DateField) => {
    const isDue = field === 'dueDate';
    const date = isDue ? dueDate : startDate;
    const allDay = isDue ? dueDateAllDay : startDateAllDay;
    const preserveTime = isDue ? preserveDueTime : preserveStartTime;
    const setPreserveTime = isDue ? setPreserveDueTime : setPreserveStartTime;
    const hasSet = isDue ? hasSetDueDate : hasSetStartDate;
    const summary = isDue ? dueDateSummary : startDateSummary;
    const Icon = isDue ? CalendarFold : CalendarClock;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 font-medium text-sm text-surface-600 dark:text-surface-400">
          <Icon className="h-4 w-4" />
          {getFieldLabel(field)}
        </div>
        <button
          type="button"
          onClick={() => setEditingField(field)}
          className="flex w-full items-center gap-2 rounded-lg border border-transparent bg-surface-100 px-3 py-2 text-left text-sm transition-colors hover:border-surface-300 focus:border-primary-500 focus:bg-white focus:outline-hidden dark:bg-surface-700 dark:focus:bg-surface-700 dark:hover:border-surface-500"
        >
          {date ? (
            <span className="text-surface-700 dark:text-surface-300">
              {allDay
                ? `${formatDate(date, true)} (All day)`
                : `${formatDate(date, true)} ${formatTime(date, timeFormat)}`}
            </span>
          ) : (
            <span className="text-surface-400">
              {hasSet ? 'No date' : `Set ${field === 'dueDate' ? 'due' : 'start'} date...`}
            </span>
          )}
        </button>
        <p className="text-surface-500 text-xs dark:text-surface-400">{summary}</p>
        {date && !allDay && (
          <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
            <input
              type="checkbox"
              checked={preserveTime}
              onChange={(e) => {
                setPreserveTime(e.target.checked);
                if (isDue) setHasSetDueDate(true);
                else setHasSetStartDate(true);
              }}
              className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500 dark:border-surface-600"
            />
            Preserve each task&apos;s existing time
          </label>
        )}
      </div>
    );
  };

  return (
    <>
      <ModalWrapper
        isOpen={isOpen && editingField === null}
        onClose={onClose}
        title="Edit Dates"
        description={`${selectedCount} selected ${selectedCount === 1 ? 'task' : 'tasks'}`}
        zIndex="z-60"
        className="max-w-sm"
        footerLeft={
          hasAnyExistingDate ? (
            <ModalButton
              variant="ghost"
              onClick={handleClear}
              className="text-surface-500 hover:bg-semantic-error/10 hover:text-semantic-error dark:text-surface-400"
            >
              Clear
            </ModalButton>
          ) : null
        }
        footer={
          <>
            <ModalButton variant="ghost" onClick={onClose}>
              Cancel
            </ModalButton>
            <ModalButton onClick={handleSave} disabled={!hasChanges}>
              Save
            </ModalButton>
          </>
        }
      >
        <div className="space-y-6">
          {renderDateRow('startDate')}
          {renderDateRow('dueDate')}
        </div>
      </ModalWrapper>

      {editingField && (
        <DatePickerModal
          isOpen
          onClose={() => setEditingField(null)}
          value={editingField === 'dueDate' ? dueDate : startDate}
          onChange={(date, allDay) => handleDatePickerChange(editingField, date, allDay)}
          title={getFieldLabel(editingField)}
          allDay={editingField === 'dueDate' ? dueDateAllDay : startDateAllDay}
          onAllDayChange={(allDay) => handleDatePickerAllDayChange(editingField, allDay)}
          hideTimeControls={false}
        />
      )}
    </>
  );
};
