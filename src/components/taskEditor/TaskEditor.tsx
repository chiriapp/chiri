import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { TaskEditorFields } from '$components/taskEditor/TaskEditorFields';
import { TaskEditorFooter } from '$components/taskEditor/TaskEditorFooter';
import { TaskEditorHeader } from '$components/taskEditor/TaskEditorHeader';
import { TaskEditorModals } from '$components/taskEditor/TaskEditorModals';
import { TaskEditorParentLink } from '$components/taskEditor/TaskEditorParentLink';
import { TaskEditorTitle } from '$components/taskEditor/TaskEditorTitle';
import { useSettingsStore } from '$context/settingsContext';
import { useAccounts } from '$hooks/queries/useAccounts';
import { useTags } from '$hooks/queries/useTags';
import {
  consumeSelectedTaskEditorFocus,
  getTaskEditorFocusRequestVersion,
  subscribeToTaskEditorFocus,
  useSetEditorOpen,
  useSetSelectedTask,
  useUIState,
} from '$hooks/queries/useUIState';
import { useVisibleTasks } from '$hooks/queries/useVisibleTasks';
import { useDismissableLayer } from '$hooks/ui/useDismissableLayer';
import { usePreserveScrollOnWindowFocus } from '$hooks/ui/usePreserveScrollOnWindowFocus';
import { useResolvedAccentColor } from '$hooks/ui/useResolvedAccentColor';
import { useResetStaleCursorOnLayerOpen } from '$hooks/ui/useStaleCursorReset';
import { useTaskEditorActions } from '$hooks/ui/useTaskEditorActions';
import { useTaskEditorModals } from '$hooks/ui/useTaskEditorModals';
import { getTaskByUid } from '$lib/store/tasks';
import type { Task } from '$types/task/model';
import { getContrastTextColor } from '$utils/color';

interface TaskEditorProps {
  task: Task;
  onOpenNotificationSettings?: () => void;
}

export const TaskEditor = ({ task, onOpenNotificationSettings }: TaskEditorProps) => {
  const setSelectedTaskMutation = useSetSelectedTask();
  const setEditorOpenMutation = useSetEditorOpen();
  const { data: uiState } = useUIState();
  const focusRequestVersion = useSyncExternalStore(
    subscribeToTaskEditorFocus,
    getTaskEditorFocusRequestVersion,
    getTaskEditorFocusRequestVersion,
  );
  const { data: tags = [] } = useTags();
  const { data: accounts = [] } = useAccounts();
  const {
    notifications,
    notifyReminders,
    timeFormat,
    editorFieldVisibility,
    editorFieldOrder,
    useAccentColorForCheckboxes,
    syncStatusProgress,
  } = useSettingsStore();
  const resolvedAccentColor = useResolvedAccentColor();
  const actions = useTaskEditorActions({ task, accounts, syncStatusProgress });
  const modals = useTaskEditorModals();
  const [focusEditorField, setFocusEditorField] = useState<'progress' | null>(null);
  const [progressFocusRequest, setProgressFocusRequest] = useState(0);
  const previousTaskIdRef = useRef(task.id);

  useEffect(() => {
    if (uiState?.selectedTaskId !== task.id) return;
    if (focusRequestVersion !== getTaskEditorFocusRequestVersion()) return;

    const taskChanged = previousTaskIdRef.current !== task.id;
    const requestedField = consumeSelectedTaskEditorFocus(task.id);

    if (requestedField) {
      setFocusEditorField(requestedField);
      if (requestedField === 'progress') {
        setProgressFocusRequest((request) => request + 1);
      }
    } else if (taskChanged) {
      setFocusEditorField(null);
    }

    previousTaskIdRef.current = task.id;
  }, [focusRequestVersion, task.id, uiState]);

  const visibleTasks = useVisibleTasks();
  const visibleTaskUids = useMemo(
    () => new Set(visibleTasks.map((visibleTask) => visibleTask.uid)),
    [visibleTasks],
  );
  const parentTask =
    task.parentUid && !visibleTaskUids.has(task.parentUid)
      ? getTaskByUid(task.parentUid)
      : undefined;

  const isReadOnly = !!task.deletedAt;
  const checkmarkColor = getContrastTextColor(resolvedAccentColor);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);

  useResetStaleCursorOnLayerOpen(true);
  usePreserveScrollOnWindowFocus(editorScrollRef);

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

  return (
    <>
      <div className="flex h-full flex-col bg-white dark:bg-surface-900" ref={editorContainerRef}>
        <TaskEditorHeader
          onDelete={actions.handleDelete}
          onClose={actions.handleClose}
          isDeleted={isReadOnly}
          isSubtask={!!task.parentUid}
          onRestore={actions.handleRestore}
          onDeletePermanently={actions.handlePermanentDelete}
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
            <TaskEditorParentLink
              parentTask={parentTask}
              onNavigate={() => setSelectedTaskMutation.mutate(parentTask.id)}
            />
          )}

          <TaskEditorFields
            task={task}
            accounts={accounts}
            tags={tags}
            editorFieldVisibility={editorFieldVisibility}
            editorFieldOrder={editorFieldOrder}
            timeFormat={timeFormat}
            notifications={notifications}
            notifyReminders={notifyReminders}
            checkmarkColor={checkmarkColor}
            useAccentColorForCheckboxes={useAccentColorForCheckboxes}
            isReadOnly={isReadOnly}
            onOpenNotificationSettings={onOpenNotificationSettings}
            actions={actions}
            modals={modals}
            highlightProgress={focusEditorField === 'progress'}
            progressFocusRequest={progressFocusRequest}
          />
        </div>

        <TaskEditorFooter task={task} timeFormat={timeFormat} />
      </div>

      <TaskEditorModals
        task={task}
        accounts={accounts}
        tags={tags}
        isReadOnly={isReadOnly}
        actions={actions}
        modals={modals}
      />
    </>
  );
};
