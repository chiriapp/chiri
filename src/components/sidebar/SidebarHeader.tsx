import PanelLeftClose from 'lucide-react/icons/panel-left-close';
import PanelLeftOpen from 'lucide-react/icons/panel-left-open';
import AppIcon from '$components/Icon';
import { Tooltip } from '$components/Tooltip';

interface SidebarHeaderProps {
  isCollapsed: boolean;
  showExpandedContent: boolean;
  onToggleCollapse: () => void;
}

export const SidebarHeader = ({
  isCollapsed,
  showExpandedContent,
  onToggleCollapse,
}: SidebarHeaderProps) => {
  return (
    <div className="h-[53px] px-2 flex items-center justify-center border-b border-surface-200 dark:border-surface-700 shrink-0">
      {isCollapsed ? (
        <Tooltip content="Expand sidebar" position="right">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
        </Tooltip>
      ) : (
        <div
          className={`flex items-center flex-1 px-2 transition-opacity duration-150 ${showExpandedContent ? 'opacity-100' : 'opacity-0'}`}
        >
          <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2 flex-1 min-w-0">
            <AppIcon className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
            <span className="truncate">Chiri</span>
          </h1>
          <Tooltip content="Collapse sidebar" position="bottom">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors shrink-0 outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
};
