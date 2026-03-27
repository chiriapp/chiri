import Activity from 'lucide-react/icons/activity';
import AlignLeft from 'lucide-react/icons/align-left';
import Bell from 'lucide-react/icons/bell';
import CalendarClock from 'lucide-react/icons/calendar-clock';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import Flag from 'lucide-react/icons/flag';
import FolderSync from 'lucide-react/icons/folder-sync';
import Link from 'lucide-react/icons/link';
import Tag from 'lucide-react/icons/tag';
import type { EditorFieldVisibility } from '$context/settingsContext';
import { useSettingsStore } from '$hooks/useSettingsStore';

type FieldConfig = {
  key: keyof EditorFieldVisibility;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const FIELDS: FieldConfig[] = [
  {
    key: 'status',
    label: 'Status & progress',
    description: 'Status buttons and progress slider',
    icon: <Activity className="w-4 h-4" />,
  },
  {
    key: 'description',
    label: 'Description',
    description: 'Free-text notes for the task',
    icon: <AlignLeft className="w-4 h-4" />,
  },
  {
    key: 'url',
    label: 'URL',
    description: 'Link associated with the task',
    icon: <Link className="w-4 h-4" />,
  },
  {
    key: 'dates',
    label: 'Dates',
    description: 'Start date and due date pickers',
    icon: <CalendarClock className="w-4 h-4" />,
  },
  {
    key: 'priority',
    label: 'Priority',
    description: 'Low, medium, high, or none',
    icon: <Flag className="w-4 h-4" />,
  },
  {
    key: 'calendar',
    label: 'Calendar',
    description: 'Which calendar the task belongs to',
    icon: <FolderSync className="w-4 h-4" />,
  },
  {
    key: 'tags',
    label: 'Tags',
    description: 'Labels attached to the task',
    icon: <Tag className="w-4 h-4" />,
  },
  {
    key: 'reminders',
    label: 'Reminders',
    description: 'Scheduled notifications for the task',
    icon: <Bell className="w-4 h-4" />,
  },
  {
    key: 'subtasks',
    label: 'Subtasks',
    description: 'Nested child tasks',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
];

export const EditorSettings = () => {
  const { editorFieldVisibility, setEditorFieldVisibility } = useSettingsStore();

  const toggle = (key: keyof EditorFieldVisibility, value: boolean) => {
    setEditorFieldVisibility({ ...editorFieldVisibility, [key]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">Editor</h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        {FIELDS.map((field, index) => (
          <div key={field.key}>
            {index > 0 && <div className="border-t border-surface-200 dark:border-surface-700" />}
            <label className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-surface-400 dark:text-surface-500 shrink-0">
                  {field.icon}
                </span>
                <div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">{field.label}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    {field.description}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={editorFieldVisibility[field.key]}
                onChange={(e) => toggle(field.key, e.target.checked)}
                className="rounded border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-none shrink-0"
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};
