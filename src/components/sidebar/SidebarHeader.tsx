import PanelLeftClose from 'lucide-react/icons/panel-left-close';
import PanelLeftOpen from 'lucide-react/icons/panel-left-open';
import AppIcon from '$components/Icon';
import { Tooltip } from '$components/Tooltip';

interface SidebarHeaderProps {
  showExpandedContent: boolean;
  showCollapsedContent: boolean;
  onToggleCollapse: () => void;
}

export const SidebarHeader = ({
  showExpandedContent,
  showCollapsedContent,
  onToggleCollapse,
}: SidebarHeaderProps) => (
  <div
    data-tauri-drag-region
    className="app-sidebar-header flex h-13 shrink-0 items-center justify-center px-2"
  >
    <div data-tauri-drag-region className="app-sidebar-header-layers">
      <div
        data-tauri-drag-region
        inert={!showCollapsedContent}
        aria-hidden={!showCollapsedContent}
        className={`app-sidebar-collapsed-header ${showCollapsedContent ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <div data-tauri-drag-region className="app-sidebar-titlebar-spacer" />
        <Tooltip content="Expand sidebar" position="right">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="app-sidebar-toggle rounded-lg p-2 text-surface-500 outline-hidden transition-colors hover:bg-surface-200 hover:text-surface-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        </Tooltip>
      </div>
      <div
        data-tauri-drag-region
        inert={!showExpandedContent}
        aria-hidden={!showExpandedContent}
        className={`app-sidebar-header-content flex items-center px-2 motion-safe:transition-opacity motion-safe:duration-150 ${showExpandedContent ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <h1 className="app-sidebar-brand flex min-w-0 flex-1 items-center gap-2 font-semibold text-lg text-surface-900 dark:text-surface-100">
          <AppIcon className="h-5 w-5 shrink-0 text-primary-500" />
          <span className="truncate">Chiri</span>
        </h1>
        <Tooltip content="Collapse sidebar" position="bottom">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="app-sidebar-toggle shrink-0 rounded-lg p-1.5 text-surface-500 outline-hidden transition-colors hover:bg-surface-200 hover:text-surface-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </Tooltip>
      </div>
    </div>
  </div>
);
