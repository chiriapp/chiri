import type { AnimateLayoutChanges } from '@dnd-kit/sortable';
import { defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import { openUrl } from '@tauri-apps/plugin-opener';
import Check from 'lucide-react/icons/check';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Clock from 'lucide-react/icons/clock';
import Edit2 from 'lucide-react/icons/edit-2';
import Link from 'lucide-react/icons/link';
import Share2 from 'lucide-react/icons/share-2';
import Trash2 from 'lucide-react/icons/trash-2';
import { useEffect, useRef, useState } from 'react';
import {
  useAccounts,
  useSetActiveAccount,
  useSetActiveCalendar,
  useSetActiveTag,
  useSetEditorOpen,
  useSetSelectedTask,
  useToggleTaskComplete,
  useUIState,
} from '@/hooks/queries';
import { useConfirmTaskDelete } from '@/hooks/useConfirmTaskDelete';
import { useContextMenu } from '@/hooks/useContextMenu';
import * as taskData from '@/lib/taskData';
import { useSettingsStore } from '@/store/settingsStore';
import type { Priority, Task } from '@/types';

import { FALLBACK_ITEM_COLOR } from '@/utils/constants';
import { formatDueDate } from '@/utils/date';
import { filterCalDavDescription } from '@/utils/ical';
import { getPriorityColor, getPriorityRingColor } from '@/utils/priority';
import { getIconByName } from '../data/icons';
import { getContrastTextColor } from '../utils/color';
import { pluralize } from '../utils/format';
import { ExportModal } from './modals/ExportModal';

interface TaskItemProps {
  task: Task;
  depth: number;
  ancestorIds: string[];
  isDragEnabled: boolean;
  isOverlay?: boolean;
}

export function TaskItem({ task, depth, ancestorIds, isDragEnabled, isOverlay }: TaskItemProps) {
  const { data: uiState } = useUIState();
  const { data: accounts = [] } = useAccounts();
  const toggleTaskCompleteMutation = useToggleTaskComplete();
  const setSelectedTaskMutation = useSetSelectedTask();
  const setEditorOpenMutation = useSetEditorOpen();
  const setActiveTagMutation = useSetActiveTag();
  const setActiveCalendarMutation = useSetActiveCalendar();
  const setActiveAccountMutation = useSetActiveAccount();
  const { accentColor } = useSettingsStore();
  const { contextMenu, handleContextMenu, handleCloseContextMenu, setContextMenu } =
    useContextMenu();
  const [showExportModal, setShowExportModal] = useState(false);
  const { confirmAndDelete } = useConfirmTaskDelete();

  // Ref for the task element to manage focus
  const taskElementRef = useRef<HTMLDivElement>(null);

  const selectedTaskId = uiState?.selectedTaskId ?? null;
  const activeCalendarId = uiState?.activeCalendarId ?? null;
  const showCompletedTasks = uiState?.showCompletedTasks ?? true;
  const isEditorOpen = uiState?.isEditorOpen ?? false;
  const isSelected = selectedTaskId === task.id;

  // Focus the task element when it becomes selected via keyboard navigation
  useEffect(() => {
    if (isSelected && !isOverlay) {
      // Only focus if this element is not already focused
      // This prevents re-focusing when clicking with mouse
      if (document.activeElement !== taskElementRef.current) {
        taskElementRef.current?.focus();
      }
    }
  }, [isSelected, isOverlay]);

  // get contrast color for checkbox checkmark
  const checkmarkColor = getContrastTextColor(accentColor);

  const childCount = taskData.countChildren(task.uid);
  const allChildTasks = taskData.getChildTasks(task.uid);
  const hiddenChildCount = !showCompletedTasks
    ? allChildTasks.filter((child) => child.completed).length
    : 0;
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  // helper to get tag by id
  const getTagById = (tagId: string) => taskData.getTags().find((t) => t.id === tagId);

  // Custom animateLayoutChanges: disable animation when the drag ends (wasDragging transitions to false)
  // This prevents the "items crossing each other" animation glitch
  const animateLayoutChanges: AnimateLayoutChanges = (args) => {
    const { isSorting, wasDragging } = args;
    // Disable animation when sorting ends (wasDragging means this item was being dragged)
    // or when any sorting operation ends (isSorting becoming false)
    if (wasDragging || !isSorting) {
      return false;
    }
    return defaultAnimateLayoutChanges(args);
  };

  // pass ancestorIds as data so it can be accessed in handleDragEnd
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: task.id,
    disabled: !isDragEnabled,
    data: { ancestorIds },
    animateLayoutChanges,
  });

  // Merge refs: need both sortable's setNodeRef and our taskElementRef for focus management
  const mergedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    taskElementRef.current = node;
  };

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

  const taskTags = (task.tags || []).map((tagId) => getTagById(tagId)).filter(Boolean);
  const calendar = accounts.flatMap((a) => a.calendars).find((c) => c.id === task.calendarId);
  const showCalendar = activeCalendarId === null && calendar;
  const calendarColor = calendar?.color ?? FALLBACK_ITEM_COLOR;
  const dueDateDisplay = task.dueDate ? formatDueDate(task.dueDate) : null;

  const handleClick = (e: React.MouseEvent) => {
    // don't select if clicking the checkbox or collapse button
    if (
      (e.target as HTMLElement).closest('.task-checkbox-wrapper') ||
      (e.target as HTMLElement).closest('.collapse-button')
    ) {
      return;
    }

    // If the task is already selected and editor is open, close the editor
    if (isSelected && isEditorOpen) {
      setEditorOpenMutation.mutate(false);
      return;
    }

    setSelectedTaskMutation.mutate(task.id);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskCompleteMutation.mutate(task.id);
  };

  const handleDelete = async () => {
    // Close context menu before opening the confirm dialog so Esc only targets the dialog
    setContextMenu(null);
    const deleted = await confirmAndDelete(task.id);
    if (deleted) {
      setContextMenu(null);
    }
  };

  const handleExport = () => {
    const result = taskData.exportTaskAndChildren(task.id);
    if (result) {
      setShowExportModal(true);
    }
    setContextMenu(null);
  };

  const handleToggleCollapsed = (e: React.MouseEvent) => {
    e.stopPropagation();
    taskData.toggleTaskCollapsed(task.id);
  };

  // todo: implement duplicate functionality at some point

  // calculate left margin based on depth
  const marginLeft = depth * 24; // 24px per level
  const paddingLeft = 12 + depth * 4;

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: Task item div contains complex drag-drop layout that button element can't support */}
      <div
        ref={mergedRef}
        style={{ ...style, marginLeft: `${marginLeft}px`, paddingLeft: `${paddingLeft}px` }}
        {...attributes}
        {...(isDragEnabled ? listeners : {})}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick(e as unknown as React.MouseEvent)}
        onContextMenu={handleContextMenu}
        role="button"
        tabIndex={0}
        data-context-menu
        className={`
          group relative flex items-start gap-3 pr-3 py-3 bg-white dark:bg-surface-800 rounded-lg border transition-all focus:outline-none
          ${isOverlay ? 'shadow-xl' : 'shadow-sm hover:shadow-md'}
          ${isSelected ? '' : task.priority === 'none' ? 'border-surface-200 dark:border-surface-700' : ''}
          ${task.completed ? 'opacity-60' : ''}
          ${isDragEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
          ${!isOverlay ? 'hover:bg-surface-50 dark:hover:bg-surface-800/70' : ''}
          ${isSelected && `border-transparent ${getPriorityRingColor(task.priority)}`}
          ${getPriorityColor(task.priority)}
        `}
      >
        <div className="task-checkbox-wrapper flex-shrink-0">
          <button
            type="button"
            onClick={handleCheckboxClick}
            className={`
              w-5 h-5 rounded border-2 flex items-center justify-center transition-all
              ${
                task.completed
                  ? 'bg-primary-500 border-primary-500'
                  : 'border-surface-300 dark:border-surface-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30'
              }
            `}
          >
            {task.completed && (
              <Check className="w-4 h-4" style={{ color: checkmarkColor }} strokeWidth={3} />
            )}
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div
              className={`text-sm font-medium leading-5 truncate flex-1 min-w-0 ${task.completed ? 'line-through text-surface-400' : 'text-surface-800 dark:text-surface-200'}`}
            >
              {task.title || <span className="text-surface-400 italic">Untitled task</span>}
            </div>

            {dueDateDisplay && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
                style={{
                  backgroundColor: dueDateDisplay.bgColor,
                  color: dueDateDisplay.textColor,
                }}
              >
                <Clock className="w-3 h-3" />
                {dueDateDisplay.text}
              </span>
            )}
          </div>

          {filterCalDavDescription(task.description) && (
            <div
              className={`text-xs mt-1 line-clamp-1 ${task.completed ? 'text-surface-400 dark:text-surface-500' : 'text-surface-500 dark:text-surface-400'}`}
            >
              {filterCalDavDescription(task.description)}
            </div>
          )}

          {(taskTags.length > 0 ||
            showCalendar ||
            totalSubtasks > 0 ||
            childCount > 0 ||
            task.url) && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {task.url && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openUrl(task.url!);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:opacity-80 transition-opacity"
                  title={task.url}
                >
                  <Link className="w-3 h-3" />
                  URL
                </button>
              )}

              {taskTags.map((tag) => {
                if (!tag) return null;
                const TagIcon = getIconByName(tag.icon || 'tag');
                return (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTagMutation.mutate(tag.id);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium hover:opacity-80 transition-opacity border"
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
                  </button>
                );
              })}

              {showCalendar &&
                calendar &&
                (() => {
                  const CalendarIcon = getIconByName(calendar.icon || 'calendar');
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Find the account that owns this calendar
                        const account = accounts.find((a) =>
                          a.calendars.some((c) => c.id === calendar.id),
                        );
                        if (account) {
                          setActiveAccountMutation.mutate(account.id);
                        }
                        setActiveCalendarMutation.mutate(calendar.id);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border hover:opacity-80 transition-opacity"
                      style={{
                        borderColor: calendarColor,
                        backgroundColor: `${calendarColor}15`,
                        color: calendarColor,
                      }}
                    >
                      <CalendarIcon className="w-3 h-3" />
                      {calendar.displayName || 'Calendar'}
                    </button>
                  );
                })()}

              {totalSubtasks > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
                  <CheckCircle2 className="w-3 h-3" />
                  {completedSubtasks}/{totalSubtasks}
                </span>
              )}

              {childCount > 0 && (
                <button
                  type="button"
                  onClick={handleToggleCollapsed}
                  className="collapse-button inline-flex items-center gap-0.5 px-2 py-0.5 rounded border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-xs text-surface-500 dark:text-surface-400"
                >
                  {task.isCollapsed ? (
                    <>
                      <ChevronRight className="w-3 h-3" />
                      <span>
                        {childCount} {pluralize(childCount, 'subtask')}
                      </span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      <span>
                        {childCount} {pluralize(childCount, 'subtask')}
                      </span>
                    </>
                  )}
                </button>
              )}

              {hiddenChildCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400">
                  {hiddenChildCount} hidden {pluralize(hiddenChildCount, 'subtask')}
                </span>
              )}
            </div>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-surface-300 dark:text-surface-600 group-hover:text-surface-500 dark:group-hover:text-surface-400 transition-colors flex-shrink-0" />
      </div>

      {contextMenu && (
        <>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Context menu backdrop for closing on outside click */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: Context menu backdrop for closing on outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleCloseContextMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              handleCloseContextMenu();
            }}
          />
          <div
            data-context-menu-content
            className="fixed bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 my-1 z-50 min-w-[160px] animate-scale-in"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedTaskMutation.mutate(task.id);
                setContextMenu(null);
              }}
              className="w-full rounded-t-md flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <div className="border-t border-surface-200 dark:border-surface-700" />
            <button
              type="button"
              onClick={() => {
                toggleTaskCompleteMutation.mutate(task.id);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
            >
              <CheckCircle2 className="w-4 h-4" />
              {task.completed ? 'Mark Incomplete' : 'Mark Complete'}
            </button>
            <div className="border-t border-surface-200 dark:border-surface-700" />
            <button
              type="button"
              onClick={handleExport}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700"
            >
              <Share2 className="w-4 h-4" />
              Export
            </button>
            <div className="border-t border-surface-200 dark:border-surface-700" />
            <button
              type="button"
              onClick={handleDelete}
              className="w-full rounded-b-md flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}

      {showExportModal && (
        <ExportModal
          tasks={[task, ...(taskData.exportTaskAndChildren(task.id)?.descendants || [])]}
          fileName={task.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'task'}
          type="tasks"
          onClose={() => setShowExportModal(false)}
        />
      )}
    </>
  );
}
