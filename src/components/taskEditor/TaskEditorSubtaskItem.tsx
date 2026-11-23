import type { AnimateLayoutChanges } from '@dnd-kit/sortable';
import { defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import Check from 'lucide-react/icons/check';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Minus from 'lucide-react/icons/minus';
import X from 'lucide-react/icons/x';
import {
  type CSSProperties,
  type Dispatch,
  type KeyboardEvent,
  type MouseEvent,
  type SetStateAction,
  useRef,
  useState,
} from 'react';
import { useSettingsStore } from '$context/settingsContext';
import { useChildTasks } from '$hooks/queries/useTasks';
import { usePrefersReducedMotion } from '$hooks/ui/usePrefersReducedMotion';
import {
  buildStatusUpdates,
  getCompletionToggleLabel,
  getTaskStatusAfterCompletionToggle,
} from '$lib/task/status';
import type { Task } from '$types/task/model';
import { getSortableItemDisabled, getSortableItemId } from '$utils/sortable';

const createAnimateLayoutChanges =
  (prefersReducedMotion: boolean): AnimateLayoutChanges =>
  (args) => {
    if (prefersReducedMotion) return false;
    return defaultAnimateLayoutChanges({ ...args, wasDragging: true });
  };

// each depth level adds 20px of left-padding. The chevron/spacer (w-4) + gap (gap-1.5)
// is always shown before the checkbox so all levels align consistently
const getPaddingLeft = (depth: number) => 8 + depth * 20;

const getRowClassName = (isDragEnabled: boolean, isOverlay: boolean, readOnly: boolean) => `
  group/row flex items-center gap-1.5 rounded-md py-1.5 pr-2 outline-hidden transition-colors
  ${isDragEnabled ? 'cursor-grab active:cursor-grabbing' : ''}
  ${!isDragEnabled && !readOnly ? 'cursor-pointer' : ''}
  ${readOnly ? 'cursor-not-allowed' : ''}
  focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-offset-1 dark:focus-visible:ring-offset-surface-900
  ${isOverlay ? 'bg-surface-50 dark:bg-surface-800 shadow-lg' : 'hover:bg-surface-50 dark:hover:bg-surface-800/60'}
`;

const getStatusButtonClassName = (
  task: Task,
  useAccentColorForCheckboxes: boolean,
  readOnly: boolean,
) => {
  let statusClass = `border-surface-400 dark:border-surface-600 ${readOnly ? '' : 'hover:border-primary-ink dark:hover:border-primary-500'}`;

  if (task.status === 'completed') {
    statusClass = useAccentColorForCheckboxes
      ? 'bg-primary-500 border-primary-500'
      : 'bg-status-completed border-status-completed';
  } else if (task.status === 'cancelled') {
    statusClass = 'bg-status-cancelled border-status-cancelled';
  } else if (task.status === 'in-process') {
    statusClass = 'bg-status-in-process border-status-in-process';
  }

  return `w-4 h-4 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-offset-1 dark:focus-visible:ring-offset-surface-900 ${statusClass} ${
    readOnly ? 'cursor-not-allowed' : 'cursor-pointer'
  }`;
};

const getTitleClassName = (task: Task, isInteractive: boolean) => {
  const stateClass = task.completed
    ? 'line-through text-surface-500 dark:text-surface-500'
    : `text-surface-700 dark:text-surface-300 ${
        isInteractive ? 'hover:text-surface-900 dark:hover:text-surface-100' : ''
      }`;

  return `flex-1 pl-0.5 text-sm text-left whitespace-nowrap ${stateClass}`;
};

const SubtaskTitleContent = ({ task }: { task: Task }) =>
  task.title || (
    <span className="text-surface-500 italic dark:text-surface-500">Untitled subtask</span>
  );

interface TaskEditorSubtaskItemProps {
  task: Task;
  depth: number;
  checkmarkColor: string;
  useAccentColorForCheckboxes: boolean;
  expandedSubtasks: Set<string>;
  setExpandedSubtasks: Dispatch<SetStateAction<Set<string>>>;
  updateTask: (id: string, updates: Partial<Task>) => void;
  moveTaskToRecentlyDeleted: (id: string) => Promise<boolean>;
  isDragEnabled: boolean;
  readOnly?: boolean;
  isOverlay?: boolean;
}

export const TaskEditorSubtaskItem = ({
  task,
  depth,
  checkmarkColor,
  useAccentColorForCheckboxes,
  expandedSubtasks,
  setExpandedSubtasks,
  updateTask,
  moveTaskToRecentlyDeleted,
  isDragEnabled,
  readOnly = false,
  isOverlay = false,
}: TaskEditorSubtaskItemProps) => {
  const childTaskFilter = task.deletedAt ? 'deleted' : 'active';
  const { data: children = [] } = useChildTasks(task.uid, childTaskFilter);
  const hasChildren = children.length > 0;
  const isExpanded = expandedSubtasks.has(task.id);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const prefersReducedMotion = usePrefersReducedMotion();
  const { syncStatusProgress, completeInProcessTasks } = useSettingsStore();

  const sortableId = getSortableItemId(task.id, isOverlay);
  const sortableDisabled = getSortableItemDisabled(isDragEnabled, isOverlay);

  const { listeners, setNodeRef, transform, isDragging } = useSortable({
    id: sortableId,
    disabled: sortableDisabled,
    animateLayoutChanges: createAnimateLayoutChanges(prefersReducedMotion),
  });

  // disable all transitions - items will snap to positions immediately
  // this prevents the "jumping" animation when drag ends and displaced items
  // return to their natural positions
  // use opacity: 0 instead of visibility: hidden for instant hiding without flash
  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition: 'none',
    opacity: isDragging ? 0 : undefined,
    pointerEvents: isDragging ? 'none' : undefined,
  };

  const toggleExpanded = () => {
    setExpandedSubtasks((prev) => {
      const next = new Set(prev);
      if (next.has(task.id)) next.delete(task.id);
      else next.add(task.id);
      return next;
    });
  };

  const handleStartEdit = () => {
    if (readOnly) return;
    setEditValue(task.title);
    setIsEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element && !!target.closest('button, input');

  const handleRowClick = (event: MouseEvent<HTMLDivElement>) => {
    if (readOnly || isEditing || isInteractiveTarget(event.target)) return;
    handleStartEdit();
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      readOnly ||
      isEditing ||
      isInteractiveTarget(event.target) ||
      (event.key !== 'Enter' && event.key !== ' ')
    ) {
      return;
    }

    event.preventDefault();
    handleStartEdit();
  };

  const handleCommitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed !== task.title) {
      updateTask(task.id, { title: trimmed });
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setEditValue(task.title);
      setIsEditing(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: subtask rows contain nested controls, so a button cannot represent the full editable row. */}
      <div
        {...(isDragEnabled ? listeners : {})}
        role={readOnly ? undefined : 'button'}
        tabIndex={readOnly ? undefined : 0}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        className={getRowClassName(isDragEnabled, isOverlay, readOnly)}
        style={{ paddingLeft: `${getPaddingLeft(depth)}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={toggleExpanded}
            className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-surface-500 outline-hidden transition-colors hover:bg-surface-200 hover:text-surface-600 focus-visible:ring-2 focus-visible:ring-primary-ink dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-300"
            aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
          >
            <ChevronRight
              className={`h-3 w-3 motion-safe:transition-transform motion-safe:duration-150 ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
        ) : depth > 0 ? (
          <div className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : null}

        <button
          type="button"
          disabled={readOnly}
          aria-label={readOnly ? 'Subtask status' : getCompletionToggleLabel(task.status)}
          onClick={() => {
            if (readOnly) return;
            const newStatus = getTaskStatusAfterCompletionToggle(
              task.status,
              completeInProcessTasks,
            );
            updateTask(
              task.id,
              buildStatusUpdates(newStatus, task, new Date(), syncStatusProgress),
            );
          }}
          className={getStatusButtonClassName(task, useAccentColorForCheckboxes, readOnly)}
        >
          {task.completed && (
            <Check
              className={`h-2.5 w-2.5 ${!useAccentColorForCheckboxes ? 'text-surface-900' : ''}`}
              style={useAccentColorForCheckboxes ? { color: checkmarkColor } : undefined}
              strokeWidth={3}
            />
          )}
          {task.status === 'cancelled' && (
            <X className="h-2.5 w-2.5 text-primary-contrast" strokeWidth={3} />
          )}
          {task.status === 'in-process' && (
            <Minus className="h-2.5 w-2.5 dark:text-primary-contrast" strokeWidth={3} />
          )}
        </button>

        {isEditing && !readOnly ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleCommitEdit}
            className="min-w-0 flex-1 bg-transparent pl-0.5 text-sm text-surface-700 outline-hidden dark:text-surface-300"
          />
        ) : (
          <span
            className={`${getTitleClassName(task, !readOnly)} ${readOnly ? 'cursor-not-allowed' : ''}`}
          >
            <SubtaskTitleContent task={task} />
          </span>
        )}

        {!isEditing && !readOnly && (
          <button
            type="button"
            onClick={async () => {
              await moveTaskToRecentlyDeleted(task.id);
            }}
            className="shrink-0 cursor-pointer rounded-sm p-0.5 text-surface-500 opacity-0 outline-hidden transition-all hover:bg-semantic-error/10 hover:text-semantic-error focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-semantic-error group-hover/row:opacity-100 dark:text-surface-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
