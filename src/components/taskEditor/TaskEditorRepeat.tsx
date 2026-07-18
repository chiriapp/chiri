import ChevronRight from 'lucide-react/icons/chevron-right';
import Plus from 'lucide-react/icons/plus';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import RefreshCwOff from 'lucide-react/icons/refresh-cw-off';
import X from 'lucide-react/icons/x';
import { useRef, useState } from 'react';
import { RepeatPresetMenu } from '$components/taskEditor/RepeatPresetMenu';
import { TaskEditorEmptyState } from '$components/taskEditor/TaskEditorEmptyState';
import { useSettingsStore } from '$context/settingsContext';
import type { Task } from '$types';
import { formatDate } from '$utils/date';
import {
  getNextOccurrence,
  getRepeatPresets,
  rruleToDisplaySummary,
  rruleToText,
} from '$utils/recurrence';

interface TaskEditorRepeatProps {
  task: Task;
  onOpen: () => void;
  onOpenCustom: () => void;
  onSetPreset: (rrule: string) => void;
  onClear: () => void;
  readOnly?: boolean;
}

export const TaskEditorRepeat = ({
  task,
  onOpen,
  onOpenCustom,
  onSetPreset,
  onClear,
  readOnly = false,
}: TaskEditorRepeatProps) => {
  const { dateFormat, workingDays } = useSettingsStore();
  const [showPresets, setShowPresets] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const dueDate = task.dueDate ? new Date(task.dueDate) : undefined;
  const presets = getRepeatPresets(dueDate, workingDays);
  const summary = task.rrule
    ? rruleToDisplaySummary(task.rrule, task.repeatFrom, dateFormat)
    : null;
  const fullSummary = task.rrule ? rruleToText(task.rrule, task.repeatFrom, dateFormat) : null;
  const followingOccurrence =
    task.rrule && dueDate && task.repeatFrom !== 1
      ? getNextOccurrence(task.rrule, dueDate, dueDate)
      : null;
  const visibleDetails = summary?.details.filter((detail) => detail !== 'from due date') ?? [];

  return (
    <div>
      <div
        id="repeat-label"
        className="mb-2 flex items-center gap-2 font-medium text-sm text-surface-600 dark:text-surface-400"
      >
        <RefreshCw className="h-4 w-4" />
        Repeat
      </div>
      {summary ? (
        <div className="group flex items-stretch overflow-hidden rounded-lg border border-transparent bg-surface-100 transition-colors hover:border-surface-300 dark:bg-surface-800 dark:hover:border-surface-500">
          <button
            type="button"
            onClick={onOpen}
            disabled={readOnly}
            aria-labelledby="repeat-label"
            title={fullSummary ? `Repeats: ${fullSummary}` : undefined}
            className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${readOnly ? 'cursor-not-allowed' : ''}`}
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-200 text-surface-500 dark:bg-surface-700 dark:text-surface-300">
              <RefreshCw className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-sm text-surface-800 dark:text-surface-100">
                {summary.primary}
              </span>
              {visibleDetails.length > 0 && (
                <span className="mt-0.5 block truncate text-surface-500 text-xs dark:text-surface-400">
                  {visibleDetails.join(' · ')}
                </span>
              )}
              {followingOccurrence ? (
                <span className="mt-0.5 block truncate text-surface-400 text-xs dark:text-surface-500">
                  Then: {formatDate(followingOccurrence, true, dateFormat)}
                </span>
              ) : task.repeatFrom === 1 ? (
                <span className="mt-0.5 block truncate text-surface-400 text-xs dark:text-surface-500">
                  Next date depends on completion
                </span>
              ) : !dueDate ? (
                <span className="mt-0.5 block truncate text-surface-400 text-xs dark:text-surface-500">
                  First date is set when the task completes
                </span>
              ) : null}
            </span>
            {!readOnly && (
              <ChevronRight className="h-4 w-4 shrink-0 text-surface-400 opacity-0 group-hover:opacity-100" />
            )}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Remove repeat"
              title="Remove repeat"
              className="flex w-9 shrink-0 items-center justify-center border-surface-200 border-l text-surface-400 opacity-0 outline-hidden transition-colors hover:bg-semantic-error/10 hover:text-semantic-error focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset group-hover:opacity-100 dark:border-surface-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : readOnly ? (
        <TaskEditorEmptyState icon={<RefreshCwOff className="h-4 w-4 shrink-0" />}>
          No repeat
        </TaskEditorEmptyState>
      ) : (
        <>
          <button
            ref={addButtonRef}
            type="button"
            onClick={() => setShowPresets((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={showPresets}
            className="inline-flex items-center gap-1 rounded-sm border border-surface-200 bg-surface-50 px-2 py-1 text-surface-500 text-xs outline-hidden transition-colors hover:border-surface-400 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:border-surface-600 dark:bg-surface-800 dark:text-surface-400 dark:hover:border-surface-500"
          >
            <Plus className="h-3 w-3" />
            Add repeat
          </button>
          {showPresets && (
            <RepeatPresetMenu
              anchorRef={addButtonRef}
              presets={presets}
              onSelect={(rrule) => {
                onSetPreset(rrule);
                setShowPresets(false);
              }}
              onCustom={() => {
                setShowPresets(false);
                onOpenCustom();
              }}
              onClose={() => setShowPresets(false)}
            />
          )}
        </>
      )}
    </div>
  );
};
