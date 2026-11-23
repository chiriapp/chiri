import Check from 'lucide-react/icons/check';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Timer from 'lucide-react/icons/timer';
import X from 'lucide-react/icons/x';
import type { RefObject } from 'react';
import { FloatingDropdownFrame } from '$components/FloatingDropdownFrame';
import { PRIORITIES } from '$constants/priority';
import type { TaskBatchMenu } from '$hooks/ui/useTaskBatchActions';
import type { Priority, Status, Task } from '$types/task/model';

const STATUS_OPTIONS = [
  { value: 'needs-action' as const, label: 'Needs Action', Icon: RotateCcw },
  { value: 'in-process' as const, label: 'In Process', Icon: Timer },
  { value: 'completed' as const, label: 'Completed', Icon: CheckCircle2 },
  { value: 'cancelled' as const, label: 'Cancelled', Icon: X },
];

const getMenuItemClass = (index: number, itemCount: number) => {
  const positionClass =
    index === 0
      ? 'rounded-t-lg border-b border-surface-300 dark:border-surface-700'
      : index === itemCount - 1
        ? 'rounded-b-lg'
        : 'border-b border-surface-300 dark:border-surface-700';

  return `w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${positionClass}`;
};

interface TaskBatchActionMenusProps {
  openMenu: TaskBatchMenu;
  selectedTasks: Task[];
  statusButtonRef: RefObject<HTMLButtonElement | null>;
  priorityButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onStatusChange: (status: Status) => void;
  onPriorityChange: (priority: Priority) => void;
}

export const TaskBatchActionMenus = ({
  openMenu,
  selectedTasks,
  statusButtonRef,
  priorityButtonRef,
  onClose,
  onStatusChange,
  onPriorityChange,
}: TaskBatchActionMenusProps) => (
  <>
    {openMenu === 'status' && (
      <FloatingDropdownFrame
        anchorRef={statusButtonRef}
        onClose={onClose}
        fallbackWidth={180}
        fallbackHeight={STATUS_OPTIONS.length * 36}
        dropdownClassName="z-50 min-w-44 overflow-hidden"
      >
        {STATUS_OPTIONS.map(({ value, label, Icon }, index) => (
          <button
            type="button"
            key={value}
            onClick={() => onStatusChange(value)}
            className={getMenuItemClass(index, STATUS_OPTIONS.length)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {selectedTasks.every((task) => task.status === value) && (
              <Check className="h-3.5 w-3.5 shrink-0 text-primary-ink" />
            )}
          </button>
        ))}
      </FloatingDropdownFrame>
    )}

    {openMenu === 'priority' && (
      <FloatingDropdownFrame
        anchorRef={priorityButtonRef}
        onClose={onClose}
        fallbackWidth={160}
        fallbackHeight={PRIORITIES.length * 36}
        dropdownClassName="z-50 min-w-36 overflow-hidden"
      >
        {PRIORITIES.map((priority, index) => (
          <button
            type="button"
            key={priority.value}
            onClick={() => onPriorityChange(priority.value)}
            className={getMenuItemClass(index, PRIORITIES.length)}
          >
            <span className={`flex-1 text-left ${priority.color}`}>{priority.label}</span>
            {selectedTasks.every((task) => task.priority === priority.value) && (
              <Check className="h-3.5 w-3.5 shrink-0 text-primary-ink" />
            )}
          </button>
        ))}
      </FloatingDropdownFrame>
    )}
  </>
);
