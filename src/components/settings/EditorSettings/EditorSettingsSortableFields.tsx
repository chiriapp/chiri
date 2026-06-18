import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import GripVertical from 'lucide-react/icons/grip-vertical';
import type { CSSProperties, ReactNode } from 'react';
import type { EditorFieldKey } from '$types/settings';

export type FieldConfig = {
  key: EditorFieldKey;
  label: string;
  description: string;
  icon: ReactNode;
};

interface EditorSettingsSortableFieldsProps {
  field: FieldConfig;
  showBorder: boolean;
  checked: boolean;
  onToggle: (key: EditorFieldKey, value: boolean) => void;
}

export const EditorSettingsSortableFields = ({
  field,
  showBorder,
  checked,
  onToggle,
}: EditorSettingsSortableFieldsProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.key,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white dark:bg-surface-800">
      {showBorder && <div className="border-surface-200 border-t dark:border-surface-700" />}
      <div className="flex items-center justify-between p-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="shrink-0 cursor-grab rounded-sm text-surface-400 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 active:cursor-grabbing dark:text-surface-500"
            aria-label={`Reorder ${field.label}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="shrink-0 text-surface-400 dark:text-surface-500">{field.icon}</span>
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">{field.label}</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">{field.description}</p>
          </div>
        </div>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(field.key, e.target.checked)}
          className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        />
      </div>
    </div>
  );
};
