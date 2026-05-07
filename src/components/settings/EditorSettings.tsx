import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Activity from 'lucide-react/icons/activity';
import AlignLeft from 'lucide-react/icons/align-left';
import Bell from 'lucide-react/icons/bell';
import CalendarClock from 'lucide-react/icons/calendar-clock';
import CheckCircle2 from 'lucide-react/icons/check-circle-2';
import Flag from 'lucide-react/icons/flag';
import FolderSync from 'lucide-react/icons/folder-sync';
import Link from 'lucide-react/icons/link';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Tag from 'lucide-react/icons/tag';
import {
  EditorSettingsSortableFieldRow,
  type FieldConfig,
} from '$components/settings/EditorSettingsSortableFieldRow';
import { useSettingsStore } from '$hooks/store/useSettingsStore';
import type { EditorFieldKey } from '$types/settings';

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
    key: 'repeat',
    label: 'Repeat',
    description: 'Recurrence options for the task',
    icon: <RefreshCw className="w-4 h-4" />,
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

const FIELD_MAP = new Map(FIELDS.map((field) => [field.key, field]));

export const EditorSettings = () => {
  const { editorFieldVisibility, editorFieldOrder, setEditorFieldVisibility, setEditorFieldOrder } =
    useSettingsStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const orderedFields = editorFieldOrder
    .map((key) => FIELD_MAP.get(key))
    .filter(Boolean) as FieldConfig[];

  const toggle = (key: EditorFieldKey, value: boolean) => {
    setEditorFieldVisibility({ ...editorFieldVisibility, [key]: value });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = editorFieldOrder.indexOf(active.id as EditorFieldKey);
    const newIndex = editorFieldOrder.indexOf(over.id as EditorFieldKey);
    if (oldIndex === -1 || newIndex === -1) return;
    setEditorFieldOrder(arrayMove(editorFieldOrder, oldIndex, newIndex));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200">Editor</h3>
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-800">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={editorFieldOrder} strategy={verticalListSortingStrategy}>
            {orderedFields.map((field, index) => (
              <EditorSettingsSortableFieldRow
                key={field.key}
                field={field}
                showBorder={index > 0}
                checked={editorFieldVisibility[field.key]}
                onToggle={toggle}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
