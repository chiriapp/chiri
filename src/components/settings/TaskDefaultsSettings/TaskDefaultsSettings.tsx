import { TaskDefaultsCalendarSection } from '$components/settings/TaskDefaultsSettings/TaskDefaultsCalendarSection';
import { TaskDefaultsDateSection } from '$components/settings/TaskDefaultsSettings/TaskDefaultsDateSection';
import { TaskDefaultsRecurrenceSection } from '$components/settings/TaskDefaultsSettings/TaskDefaultsRecurrenceSection';
import { TaskDefaultsRemindersSection } from '$components/settings/TaskDefaultsSettings/TaskDefaultsRemindersSection';
import { TaskDefaultsTagsSection } from '$components/settings/TaskDefaultsSettings/TaskDefaultsTagsSection';
import { TaskDefaultsTaskValues } from '$components/settings/TaskDefaultsSettings/TaskDefaultsTaskValues';
import { TaskDefaultsTimeSection } from '$components/settings/TaskDefaultsSettings/TaskDefaultsTimeSection';

export const TaskDefaultsSettings = () => {
  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Defaults</h3>

      <TaskDefaultsTaskValues />

      <div className="grid gap-5">
        <TaskDefaultsDateSection />
        <TaskDefaultsTimeSection />
      </div>

      <TaskDefaultsRecurrenceSection />

      <TaskDefaultsCalendarSection />

      <TaskDefaultsTagsSection />

      <TaskDefaultsRemindersSection />
    </div>
  );
};
