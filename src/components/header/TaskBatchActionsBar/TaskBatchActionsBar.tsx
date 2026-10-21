import { TaskBatchActionMenus } from '$components/header/TaskBatchActionsBar/TaskBatchActionMenus';
import { TaskBatchActionModals } from '$components/header/TaskBatchActionsBar/TaskBatchActionModals';
import { TaskBatchActionsToolbar } from '$components/header/TaskBatchActionsBar/TaskBatchActionsToolbar';
import { useTaskBatchActions } from '$hooks/ui/useTaskBatchActions';
import { useTaskBatchActionsLayout } from '$hooks/ui/useTaskBatchActionsLayout';
import type { Task } from '$types/task/model';

interface TaskBatchActionsBarProps {
  selectedTasks: Task[];
  onClearSelection: () => void;
  mode?: 'active' | 'deleted';
  'data-drag-region-pass-through'?: boolean;
}

export const TaskBatchActionsBar = ({
  selectedTasks,
  onClearSelection,
  mode = 'active',
  'data-drag-region-pass-through': dataDragRegionPassThrough,
}: TaskBatchActionsBarProps) => {
  const { toolbarRef, isTight } = useTaskBatchActionsLayout();
  const actions = useTaskBatchActions({ selectedTasks, onClearSelection });

  if (actions.selectedCount === 0) return null;

  return (
    <>
      <TaskBatchActionsToolbar
        selectedCount={actions.selectedCount}
        mode={mode}
        isTight={isTight}
        toolbarRef={toolbarRef}
        openMenu={actions.openMenu}
        statusButtonRef={actions.statusButtonRef}
        priorityButtonRef={actions.priorityButtonRef}
        allCalendarsCount={actions.allCalendars.length}
        dataDragRegionPassThrough={dataDragRegionPassThrough}
        onClearSelection={onClearSelection}
        onToggleMenu={actions.toggleMenu}
        onOpenTagsModal={actions.openTagsModal}
        onOpenDatesModal={actions.openDatesModal}
        onOpenMoveModal={actions.openMoveModal}
        onOpenExportModal={actions.openExportModal}
        onDelete={actions.handleDelete}
        onPermanentDelete={actions.handlePermanentDelete}
        onRestore={actions.handleRestore}
      />

      <TaskBatchActionMenus
        openMenu={actions.openMenu}
        selectedTasks={selectedTasks}
        statusButtonRef={actions.statusButtonRef}
        priorityButtonRef={actions.priorityButtonRef}
        onClose={actions.closeMenu}
        onStatusChange={actions.handleStatusChange}
        onPriorityChange={actions.handlePriorityChange}
      />

      <TaskBatchActionModals
        selectedTasks={selectedTasks}
        accounts={actions.accounts}
        tags={actions.tags}
        timeFormat={actions.timeFormat}
        currentCalendarIds={actions.currentCalendarIds}
        exportTasks={actions.exportTasks}
        showTagsModal={actions.showTagsModal}
        showDatesModal={actions.showDatesModal}
        showMoveModal={actions.showMoveModal}
        showExportModal={actions.showExportModal}
        onCloseTagsModal={actions.closeTagsModal}
        onCloseDatesModal={actions.closeDatesModal}
        onCloseMoveModal={actions.closeMoveModal}
        onCloseExportModal={actions.closeExportModal}
        onMoveToCalendar={actions.handleMoveToCalendar}
      />
    </>
  );
};
