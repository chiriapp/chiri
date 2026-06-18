import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import GripVertical from 'lucide-react/icons/grip-vertical';
import type { CSSProperties, ReactNode } from 'react';
import type { TaskBadgeKey } from '$types/settings';

export type BadgeConfig = {
  key: TaskBadgeKey;
  label: string;
  description: string;
  icon: ReactNode;
};

interface BadgesSettingsSortableBadgesProps {
  badge: BadgeConfig;
  showBorder: boolean;
  checked: boolean;
  onToggle: (key: TaskBadgeKey, value: boolean) => void;
}

export const BadgesSettingsSortableBadges = ({
  badge,
  showBorder,
  checked,
  onToggle,
}: BadgesSettingsSortableBadgesProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: badge.key,
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
            aria-label={`Reorder ${badge.label}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="shrink-0 text-surface-400 dark:text-surface-500">{badge.icon}</span>
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">{badge.label}</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">{badge.description}</p>
          </div>
        </div>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(badge.key, e.target.checked)}
          className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        />
      </div>
    </div>
  );
};
