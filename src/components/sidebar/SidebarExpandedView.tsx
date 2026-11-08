import Inbox from 'lucide-react/icons/inbox';
import Trash2 from 'lucide-react/icons/trash-2';
import { SidebarFooter } from '$components/sidebar/SidebarFooter';
import { SidebarSections, type SidebarSectionsProps } from '$components/sidebar/SidebarSections';

interface SidebarExpandedNavigationProps {
  activeView: 'tasks' | 'recently-deleted' | 'filter';
  onAllTasks: () => void;
  onRecentlyDeleted: () => void;
}

interface SidebarExpandedFooterProps {
  updateAvailable?: boolean;
  onUpdateClick?: () => void;
  onOpenImport?: () => void;
  onOpenSettings?: () => void;
  importShortcut?: string;
  settingsShortcut?: string;
  isAnyModalOpen: boolean;
}

interface SidebarExpandedViewProps {
  showExpandedContent: boolean;
  navigation: SidebarExpandedNavigationProps;
  sections: SidebarSectionsProps;
  footer: SidebarExpandedFooterProps;
}

const isActiveTask = (task: SidebarSectionsProps['tasks'][number]) =>
  !task.deletedAt && task.status !== 'completed' && task.status !== 'cancelled';

export const SidebarExpandedView = ({
  showExpandedContent,
  navigation,
  sections,
  footer,
}: SidebarExpandedViewProps) => {
  const activeTaskCount = sections.tasks.filter(isActiveTask).length;
  const deletedTaskCount = sections.tasks.filter((task) => task.deletedAt).length;

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col motion-safe:transition-opacity motion-safe:duration-150 ${showExpandedContent ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-2.25 py-2">
        <button
          type="button"
          onClick={navigation.onAllTasks}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
            navigation.activeView === 'tasks' &&
            sections.activeCalendarId === null &&
            sections.activeTagId === null
              ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
              : `text-surface-600 dark:text-surface-400 ${!sections.isAnyModalOpen ? 'hover:bg-surface-200 dark:hover:bg-surface-700' : ''}`
          }`}
        >
          <Inbox className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">All Tasks</span>
          {sections.showSidebarTaskCounts && <span className="text-xs">{activeTaskCount}</span>}
        </button>

        <button
          type="button"
          onClick={navigation.onRecentlyDeleted}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
            navigation.activeView === 'recently-deleted'
              ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
              : `text-surface-600 dark:text-surface-400 ${!sections.isAnyModalOpen ? 'hover:bg-surface-200 dark:hover:bg-surface-700' : ''}`
          }`}
        >
          <Trash2 className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Recently Deleted</span>
          {sections.showSidebarTaskCounts && <span className="text-xs">{deletedTaskCount}</span>}
        </button>

        <div
          aria-hidden="true"
          className="-mx-2.25 h-px w-[calc(100%+18px)] shrink-0 bg-surface-200 dark:bg-surface-700"
        />

        <SidebarSections {...sections} />
      </div>

      <SidebarFooter {...footer} />
    </div>
  );
};
