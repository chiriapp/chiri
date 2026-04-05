import Clock from 'lucide-react/icons/clock';
import { formatDueDate } from '$utils/date';

interface TaskItemDueDateBadgeProps {
  dueDate: Date | undefined;
}

export const TaskItemDueDateBadge = ({ dueDate }: TaskItemDueDateBadgeProps) => {
  if (!dueDate) return null;
  const display = formatDueDate(dueDate);
  if (!display) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border ${display.className}`}
    >
      <Clock className="w-3 h-3" />
      {display.text}
    </span>
  );
};
