import type { AnimateLayoutChanges } from '@dnd-kit/sortable';
import { defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import Check from 'lucide-react/icons/check';
import ChevronRight from 'lucide-react/icons/chevron-right';
import X from 'lucide-react/icons/x';
import { useRef, useState } from 'react';
import { useChildTasks } from '$hooks/queries/useTasks';
import type { Task } from '$types';

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

// Each depth level adds 20px of left-padding. The chevron/spacer (w-4) + gap (gap-1.5)
// is always shown before the checkbox so all levels align consistently.
const getPaddingLeft = (depth: number) => 8 + depth * 20;

interface TaskEditorSubtaskItemProps {
  task: Task;
  depth: number;
  checkmarkColor: string;
  useAccentColorForCheckboxes: boolean;
  expandedSubtasks: Set<string>;
  setExpandedSubtasks: React.Dispatch<React.SetStateAction<Set<string>>>;
  updateTask: (id: string, updates: Partial<Task>) => void;
  confirmAndDelete: (id: string) => Promise<boolean>;
  isDragEnabled: boolean;
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
  confirmAndDelete,
  isDragEnabled,
  isOverlay = false,
}: TaskEditorSubtaskItemProps) => {
  const { data: children = [] } = useChildTasks(task.uid);
  const hasChildren = children.length > 0;
  const isExpanded = expandedSubtasks.has(task.id);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const { listeners, setNodeRef, transform, isDragging } = useSortable({
    id: task.id,
    disabled: !isDragEnabled,
    animateLayoutChanges,
  });

  // Disable all transitions - items will snap to positions immediately.
  // This prevents the "jumping" animation when drag ends and displaced items
  // return to their natural positions.
  // Use opacity: 0 instead of visibility: hidden for instant hiding without flash.
  const style: React.CSSProperties = {
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
    setEditValue(task.title);
    setIsEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleCommitEdit = () => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setIsEditing(false);
      confirmAndDelete(task.id);
      return;
    }
    if (trimmed !== task.title) {
      updateTask(task.id, { title: trimmed });
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      <div
        {...(isDragEnabled ? listeners : {})}
        className={`group/row flex items-center gap-1.5 py-1.5 pr-2 rounded-md transition-colors ${
          isDragEnabled ? 'cursor-grab active:cursor-grabbing' : ''
        } ${
          isOverlay
            ? 'bg-surface-50 dark:bg-surface-800 shadow-lg'
            : 'hover:bg-surface-50 dark:hover:bg-surface-800/60'
        }`}
        style={{ paddingLeft: `${getPaddingLeft(depth)}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={toggleExpanded}
            className="cursor-pointer shrink-0 w-4 h-4 flex items-center justify-center rounded-sm text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
          >
            <ChevronRight
              className={`w-3 h-3 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
        ) : depth > 0 ? (
          <div className="shrink-0 w-4 h-4" aria-hidden="true" />
        ) : null}

        <button
          type="button"
          onClick={() => {
            const newStatus = task.status === 'needs-action' ? 'completed' : 'needs-action';
            updateTask(task.id, {
              status: newStatus,
              completed: newStatus === 'completed',
              completedAt: newStatus === 'completed' ? new Date() : undefined,
            });
          }}
          className={`cursor-pointer w-4 h-4 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 ${
            task.status === 'completed'
              ? useAccentColorForCheckboxes
                ? 'bg-primary-500 border-primary-500'
                : 'bg-status-completed border-status-completed'
              : task.status === 'cancelled'
                ? 'bg-status-cancelled border-status-cancelled'
                : 'border-surface-300 dark:border-surface-600 hover:border-primary-400 dark:hover:border-primary-500'
          }`}
        >
          {task.completed && (
            <Check
              className={`w-2.5 h-2.5 ${!useAccentColorForCheckboxes ? 'text-surface-900' : ''}`}
              style={useAccentColorForCheckboxes ? { color: checkmarkColor } : undefined}
              strokeWidth={3}
            />
          )}
        </button>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleCommitEdit}
            className="flex-1 pl-0.5 text-sm bg-transparent outline-hidden text-surface-700 dark:text-surface-300 min-w-0"
          />
        ) : (
          <button
            type="button"
            onClick={handleStartEdit}
            className={`flex-1 pl-0.5 text-sm text-left whitespace-nowrap outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:rounded-sm ${
              task.completed
                ? 'line-through text-surface-400 dark:text-surface-500'
                : 'text-surface-700 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100'
            }`}
          >
            {task.title || (
              <span className="text-surface-400 dark:text-surface-500 italic">Untitled</span>
            )}
          </button>
        )}

        {!isEditing && (
          <button
            type="button"
            onClick={async () => {
              await confirmAndDelete(task.id);
            }}
            className="cursor-pointer opacity-0 group-hover/row:opacity-100 p-0.5 shrink-0 rounded-sm text-surface-400 hover:text-semantic-error hover:bg-semantic-error/10 transition-all outline-hidden focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-semantic-error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
