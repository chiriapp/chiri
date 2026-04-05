import CalendarClock from 'lucide-react/icons/calendar-clock';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import Clock from 'lucide-react/icons/clock';
import FolderSync from 'lucide-react/icons/folder-sync';
import Link from 'lucide-react/icons/link';
import Loader from 'lucide-react/icons/loader';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Tag from 'lucide-react/icons/tag';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import type { TaskBadgeVisibility } from '$types/settings';

type BadgeConfig = {
  key: keyof TaskBadgeVisibility;
  label: string;
  description: string;
  icon: React.ReactNode;
};

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

export const BadgesSettings = () => {
  const { taskBadgeVisibility, setTaskBadgeVisibility } = useSettingsStore();

  const toggle = (key: keyof TaskBadgeVisibility, value: boolean) => {
    setTaskBadgeVisibility({ ...taskBadgeVisibility, [key]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">Badges</h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        {BADGES.map((badge, index) => (
          <div key={badge.key}>
            {index > 0 && <div className="border-t border-surface-200 dark:border-surface-700" />}
            <label className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-surface-400 dark:text-surface-500 shrink-0">
                  {badge.icon}
                </span>
                <div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">{badge.label}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    {badge.description}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={taskBadgeVisibility[badge.key]}
                onChange={(e) => toggle(badge.key, e.target.checked)}
                className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden shrink-0"
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};
