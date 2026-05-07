import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import CalendarClock from 'lucide-react/icons/calendar-clock';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import Clock from 'lucide-react/icons/clock';
import FolderSync from 'lucide-react/icons/folder-sync';
import Link from 'lucide-react/icons/link';
import Loader from 'lucide-react/icons/loader';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Tag from 'lucide-react/icons/tag';
import {
  type BadgeConfig,
  BadgesSettingsSortableBadgeRow,
} from '$components/settings/BadgesSettingsSortableBadgeRow';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import type { TaskBadgeKey } from '$types/settings';

const BADGES: BadgeConfig[] = [
  {
    key: 'startDate',
    label: 'Start date',
    description: 'Shown when a task has a future start date',
    icon: <CalendarClock className="w-4 h-4" />,
  },
  {
    key: 'dueDate',
    label: 'Due date',
    description: 'When the task is due',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    key: 'tags',
    label: 'Tags',
    description: 'Labels attached to the task',
    icon: <Tag className="w-4 h-4" />,
  },
  {
    key: 'calendar',
    label: 'Calendar',
    description: 'Which calendar the task belongs to',
    icon: <FolderSync className="w-4 h-4" />,
  },
  {
    key: 'url',
    label: 'URL',
    description: 'Link associated with the task',
    icon: <Link className="w-4 h-4" />,
  },
  {
    key: 'status',
    label: 'Status',
    description: 'In-progress status indicators with percent complete',
    icon: <Loader className="w-4 h-4" />,
  },
  {
    key: 'repeat',
    label: 'Repeat',
    description: 'Shown when a task has a recurrence rule',
    icon: <RefreshCw className="w-4 h-4" />,
  },
  {
    key: 'subtasks',
    label: 'Subtasks',
    description: 'Subtask progress count and collapse toggle',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
];

const BADGE_MAP = new Map(BADGES.map((badge) => [badge.key, badge]));

export const BadgesSettings = () => {
  const { taskBadgeVisibility, taskBadgeOrder, setTaskBadgeVisibility, setTaskBadgeOrder } =
    useSettingsStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const orderedBadges = taskBadgeOrder
    .map((key) => BADGE_MAP.get(key))
    .filter(Boolean) as BadgeConfig[];

  const toggle = (key: TaskBadgeKey, value: boolean) => {
    setTaskBadgeVisibility({ ...taskBadgeVisibility, [key]: value });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = taskBadgeOrder.indexOf(active.id as TaskBadgeKey);
    const newIndex = taskBadgeOrder.indexOf(over.id as TaskBadgeKey);
    if (oldIndex === -1 || newIndex === -1) return;
    setTaskBadgeOrder(arrayMove(taskBadgeOrder, oldIndex, newIndex));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">Badges</h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={taskBadgeOrder} strategy={verticalListSortingStrategy}>
            {orderedBadges.map((badge, index) => (
              <BadgesSettingsSortableBadgeRow
                key={badge.key}
                badge={badge}
                showBorder={index > 0}
                checked={taskBadgeVisibility[badge.key]}
                onToggle={toggle}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
