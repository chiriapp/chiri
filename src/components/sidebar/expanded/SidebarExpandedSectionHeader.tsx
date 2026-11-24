import ChevronDown from 'lucide-react/icons/chevron-down';
import type { MouseEvent, ReactNode } from 'react';
import type { LucideIcon } from '$types/lucide';

interface SidebarSectionHeaderProps {
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  actions: ReactNode;
  onToggle: () => void;
  onContextMenu?: (e: MouseEvent) => void;
}

export const SidebarExpandedSectionHeader = ({
  label,
  icon: Icon,
  collapsed,
  actions,
  onToggle,
  onContextMenu,
}: SidebarSectionHeaderProps) => (
  <div className="relative flex items-center">
    <button
      type="button"
      onClick={onToggle}
      onContextMenu={onContextMenu}
      aria-expanded={!collapsed}
      className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg pr-19 pl-3 text-left outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:hover:bg-surface-700"
    >
      <Icon className="h-4 w-4 shrink-0 text-surface-500 dark:text-surface-400" />
      <span className="truncate font-semibold text-sm text-surface-500 dark:text-surface-400">
        {label}
      </span>
      <ChevronDown
        className={`ml-auto h-4 w-4 shrink-0 text-surface-500 motion-safe:transition-transform motion-safe:duration-200 dark:text-surface-400 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
      />
    </button>

    <div className="absolute top-0 right-0 flex h-9 items-center gap-1">{actions}</div>
  </div>
);
