import AlignJustify from 'lucide-react/icons/align-justify';
import LayoutList from 'lucide-react/icons/layout-list';
import type { ReactNode } from 'react';
import { BadgesSettings } from '$components/settings/BadgesSettings/BadgesSettings';
import { TaskListDensityPreview } from '$components/settings/TaskListLayoutSettings/TaskListDensityPreview';
import { useSettingsStore } from '$context/settingsContext';
import type { TaskListDensity } from '$types/settings';

const DENSITY_OPTIONS: { value: TaskListDensity; label: string; icon: ReactNode }[] = [
  { value: 'comfortable', label: 'Comfortable', icon: <LayoutList className="h-4 w-4" /> },
  { value: 'compact', label: 'Compact', icon: <AlignJustify className="h-4 w-4" /> },
];

const SWITCHER_CLASS =
  'flex flex-1 items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset';
const SWITCHER_ACTIVE =
  'border-surface-300 dark:border-surface-500 bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100';
const SWITCHER_INACTIVE =
  'border-surface-200 dark:border-surface-700 hover:border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400';

export const TaskListLayoutSettings = () => {
  const { taskListDensity, setTaskListDensity } = useSettingsStore();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">
        List & layout
      </h3>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="p-4">
          <p className="mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
            Task list density
          </p>
          <div className="flex gap-2">
            {DENSITY_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setTaskListDensity(option.value)}
                className={`${SWITCHER_CLASS} ${taskListDensity === option.value ? SWITCHER_ACTIVE : SWITCHER_INACTIVE}`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-4 mb-2 font-medium text-surface-500 text-xs dark:text-surface-400">
            Preview
          </p>
          <TaskListDensityPreview density={taskListDensity} />
        </div>
      </div>

      <BadgesSettings />
    </div>
  );
};
