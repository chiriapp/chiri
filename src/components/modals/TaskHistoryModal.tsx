import type { LucideIcon } from 'lucide-react';
import Activity from 'lucide-react/icons/activity';
import AlignLeft from 'lucide-react/icons/align-left';
import Bell from 'lucide-react/icons/bell';
import Calendar from 'lucide-react/icons/calendar';
import CalendarClock from 'lucide-react/icons/calendar-clock';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import CornerDownRight from 'lucide-react/icons/corner-down-right';
import Flag from 'lucide-react/icons/flag';
import FolderSync from 'lucide-react/icons/folder-sync';
import History from 'lucide-react/icons/history';
import Link from 'lucide-react/icons/link';
import Loader from 'lucide-react/icons/loader';
import Network from 'lucide-react/icons/network';
import Repeat from 'lucide-react/icons/repeat';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Server from 'lucide-react/icons/server';
import Sparkles from 'lucide-react/icons/sparkles';
import Tag from 'lucide-react/icons/tag';
import Type from 'lucide-react/icons/type';
import X from 'lucide-react/icons/x';
import type { ReactNode } from 'react';
import { useTaskHistory } from '$hooks/queries/useTaskHistory';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';
import type { TaskHistoryEntry } from '$types/database';
import { formatDate, formatTime } from '$utils/date';
import { rruleToText } from '$utils/recurrence';

const FIELD_LABELS: Record<string, string> = {
  created: 'Created',
  title: 'Title',
  description: 'Description',
  completed: 'Completed', // legacy — kept for old history entries
  status: 'Status',
  percentComplete: 'Progress',
  priority: 'Priority',
  startDate: 'Start date',
  startDateAllDay: 'Start all-day',
  dueDate: 'Due date',
  dueDateAllDay: 'Due all-day',
  tags: 'Tags',
  reminders: 'Reminders',
  parentUid: 'Parent task',
  url: 'URL',
  calendarId: 'Calendar',
  rrule: 'Recurrence',
  repeatFrom: 'Repeat from',
  accountId: 'Account',
  subtask: 'Subtask',
};

const FIELD_ICONS: Record<string, LucideIcon> = {
  created: Sparkles,
  title: Type,
  description: AlignLeft,
  completed: CheckCircle2, // legacy
  status: Activity,
  percentComplete: Loader,
  priority: Flag,
  startDate: Calendar,
  startDateAllDay: Calendar,
  dueDate: CalendarClock,
  dueDateAllDay: CalendarClock,
  tags: Tag,
  reminders: Bell,
  parentUid: CornerDownRight,
  url: Link,
  calendarId: FolderSync,
  rrule: Repeat,
  repeatFrom: RotateCcw,
  accountId: Server,
  subtask: Network,
};

// Label maps for enum-like fields
const STATUS_LABELS: Record<string, string> = {
  'needs-action': 'Needs Action',
  'in-process': 'In Process',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
};

// Field-specific formatters
const formatCompletedField = (value: string) => (value === 'true' ? 'Completed' : 'Not completed');
const formatStatusField = (value: string) => STATUS_LABELS[value] ?? value;
const formatPriorityField = (value: string) => PRIORITY_LABELS[value] ?? value;
const formatAllDayField = (value: string) => (value === 'true' ? 'All day' : 'Timed');

const formatDateField = (value: string) => {
  try {
    return formatDate(new Date(value), true);
  } catch {
    return value;
  }
};

const formatArrayField = (value: string) => {
  try {
    const arr = JSON.parse(value);
    if (Array.isArray(arr)) {
      return arr.length === 0 ? 'None' : `${arr.length} item${arr.length !== 1 ? 's' : ''}`;
    }
  } catch {
    // fall through
  }
  return value;
};

const formatDescriptionField = (value: string) => {
  if (!value) return 'Empty';
  return value.length > 80 ? `${value.slice(0, 80)}…` : value;
};

const formatRruleField = (value: string) => {
  try {
    return rruleToText(value);
  } catch {
    return value;
  }
};

// Field formatter map
type FieldFormatter = (value: string) => ReactNode;
const FIELD_FORMATTERS: Record<string, FieldFormatter> = {
  completed: formatCompletedField,
  status: formatStatusField,
  percentComplete: (v) => `${v}%`,
  priority: formatPriorityField,
  startDateAllDay: formatAllDayField,
  dueDateAllDay: formatAllDayField,
  startDate: formatDateField,
  dueDate: formatDateField,
  tags: formatArrayField,
  reminders: formatArrayField,
  description: formatDescriptionField,
  rrule: formatRruleField,
  repeatFrom: (v) => (v === '1' ? 'Completion date' : 'Due date'),
  subtask: (v) => (v.trim() ? v : ((<span className="italic">Untitled task</span>) as ReactNode)),
};

const formatHistoryValue = (field: string, value: string | null): ReactNode => {
  if (value === null) return 'None';

  const formatter = FIELD_FORMATTERS[field];
  return formatter ? formatter(value) : value;
};

const HistoryEntry = ({
  entry,
  timeFormat,
  isLast,
}: {
  entry: TaskHistoryEntry;
  timeFormat: '12' | '24';
  isLast: boolean;
}) => {
  const label = FIELD_LABELS[entry.field] ?? entry.field;
  const Icon = FIELD_ICONS[entry.field] ?? History;
  const isCreated = entry.field === 'created';

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div className="w-2 h-2 rounded-full bg-surface-300 dark:bg-surface-600" />
        {!isLast && <div className="w-px flex-1 bg-surface-200 dark:bg-surface-700 mt-1" />}
      </div>
      <div className={`flex-1 min-w-0 ${!isLast ? 'pb-4' : ''}`}>
        <div className="flex items-center gap-1.5 text-sm font-medium text-surface-700 dark:text-surface-300">
          <Icon className="w-3.5 h-3.5 shrink-0 text-surface-400 dark:text-surface-500" />
          <span>{label}</span>
          <span className="text-surface-300 dark:text-surface-600">·</span>
          <span className="text-xs font-normal text-surface-400 dark:text-surface-500">
            {formatDate(entry.changedAt, true)}
          </span>
          <span className="text-surface-300 dark:text-surface-600">·</span>
          <span className="text-xs font-normal text-surface-400 dark:text-surface-500">
            {formatTime(entry.changedAt, timeFormat)}
          </span>
        </div>
        {!isCreated && (
          <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 pl-5">
            {entry.oldValue !== null && entry.oldValue !== '' && (
              <>
                <span className="line-through">
                  {formatHistoryValue(entry.field, entry.oldValue)}
                </span>{' '}
                <span className="text-surface-300 dark:text-surface-600">→</span>{' '}
              </>
            )}
            <span>{formatHistoryValue(entry.field, entry.newValue)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface TaskHistoryModalProps {
  isOpen: boolean;
  taskTitle: string;
  taskUid: string;
  onClose: () => void;
}

export const TaskHistoryModal = ({
  isOpen,
  taskTitle,
  taskUid,
  onClose,
}: TaskHistoryModalProps) => {
  const focusTrapRef = useFocusTrap(isOpen);
  const { data: history, isLoading } = useTaskHistory(taskUid);
  const { timeFormat } = useSettingsStore();

  useModalEscapeKey(onClose, { enabled: isOpen });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col animate-scale-in"
      >
        <div className="flex items-start justify-between p-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <History className="w-5 h-5" />
              History
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5 truncate max-w-xs">
              {taskTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            aria-label="Close history"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-sm text-surface-400 dark:text-surface-500">Loading…</p>
          ) : !history || history.length === 0 ? (
            <p className="text-sm text-surface-400 dark:text-surface-500">No history yet.</p>
          ) : (
            <div>
              {history.map((entry, index) => (
                <HistoryEntry
                  key={entry.id}
                  entry={entry}
                  timeFormat={timeFormat}
                  isLast={index === history.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
