import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import GripVertical from 'lucide-react/icons/grip-vertical';
import type { EditorFieldKey } from '$types/settings';

export type FieldConfig = {
  key: EditorFieldKey;
  label: string;
  description: string;
  icon: React.ReactNode;
};

interface EditorSettingsSortableFieldRowProps {
  field: FieldConfig;
  showBorder: boolean;
  checked: boolean;
  onToggle: (key: EditorFieldKey, value: boolean) => void;
}

export const EditorSettingsSortableFieldRow = ({
  field,
  showBorder,
  checked,
  onToggle,
}: EditorSettingsSortableFieldRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.key,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white dark:bg-surface-800">
      {showBorder && <div className="border-t border-surface-200 dark:border-surface-700" />}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="text-surface-400 dark:text-surface-500 shrink-0 cursor-grab active:cursor-grabbing rounded-sm focus-visible:ring-2 focus-visible:ring-primary-500 outline-hidden"
            aria-label={`Reorder ${field.label}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="text-surface-400 dark:text-surface-500 shrink-0">{field.icon}</span>
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">{field.label}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">{field.description}</p>
          </div>
        </div>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(field.key, e.target.checked)}
          className="rounded-sm border-surface-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 outline-hidden shrink-0"
        />
      </div>
    </div>
  );
};
