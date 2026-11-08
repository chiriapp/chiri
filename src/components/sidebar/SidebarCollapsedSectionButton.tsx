import { Tooltip } from '$components/Tooltip';
import type { LucideIcon } from '$types/lucide';

interface SidebarCollapsedSectionButtonProps {
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  isAnyDragging: boolean;
  onToggle: () => void;
}

export const SidebarCollapsedSectionButton = ({
  label,
  icon: Icon,
  collapsed,
  isAnyDragging,
  onToggle,
}: SidebarCollapsedSectionButtonProps) => (
  <Tooltip
    content={
      <span className="flex flex-col whitespace-nowrap leading-tight">
        <span>{label}</span>
        <span className="font-normal text-[10px] text-white/65">
          Click to {collapsed ? 'expand' : 'collapse'} section
        </span>
      </span>
    }
    position="right"
    disabled={isAnyDragging}
  >
    <button
      type="button"
      aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${label} section`}
      aria-expanded={!collapsed}
      onClick={onToggle}
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-200/50 outline-hidden transition-colors hover:bg-surface-300/70 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:bg-surface-800/50 dark:hover:bg-surface-700/70 ${
        collapsed
          ? 'text-surface-500 dark:text-surface-400'
          : 'text-surface-900 dark:text-surface-100'
      }`}
    >
      <Icon className="h-5 w-5" />
    </button>
  </Tooltip>
);
