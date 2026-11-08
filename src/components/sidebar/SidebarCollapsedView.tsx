import Download from 'lucide-react/icons/download';
import Import from 'lucide-react/icons/import';
import Inbox from 'lucide-react/icons/inbox';
import Settings from 'lucide-react/icons/settings';
import Trash2 from 'lucide-react/icons/trash-2';
import type { MouseEvent } from 'react';
import { SidebarCollapsedCalendarSection } from '$components/sidebar/SidebarCollapsedCalendarSection';
import { SidebarCollapsedFilters } from '$components/sidebar/SidebarCollapsedFilters';
import { SidebarCollapsedTags } from '$components/sidebar/SidebarCollapsedTags';
import { Tooltip } from '$components/Tooltip';
import { useSidebarCollapsedDragState } from '$hooks/ui/useSidebarCollapsedDragState';
import type { Account } from '$types/account';
import type { Filter } from '$types/filter';
import type { SidebarSectionKey } from '$types/settings/categories/navigation';
import type { Tag } from '$types/tag';
import type { Task } from '$types/task/model';

interface SidebarCollapsedNavigationProps {
  activeCalendarId: string | null;
  activeTagId: string | null;
  activeFilterId: string | null;
  activeView: 'tasks' | 'recently-deleted' | 'filter';
  onAllTasks: () => void;
  onRecentlyDeleted: () => void;
  onSelectCalendar: (accountId: string, calendarId: string) => void;
  onSelectTag: (tagId: string) => void;
  onSelectFilter: (filterId: string) => void;
  onContextMenu: (
    event: MouseEvent,
    type: 'account' | 'calendar' | 'tag' | 'filter',
    id: string,
    accountId?: string,
  ) => void;
}

interface SidebarCollapsedSectionsProps {
  accounts: Account[];
  tags: Tag[];
  filters: Filter[];
  tasks: Task[];
  contextMenu: { type: string; id: string; accountId?: string } | null;
  localSectionCollapsed: boolean;
  accountsSectionCollapsed: boolean;
  filtersSectionCollapsed: boolean;
  tagsSectionCollapsed: boolean;
  showLocalSection: boolean;
  showAccountsSection: boolean;
  showFiltersSection: boolean;
  showTagsSection: boolean;
  sidebarSectionOrder: SidebarSectionKey[];
  onToggleLocalSection: () => void;
  onToggleAccountsSection: () => void;
  onToggleFiltersSection: () => void;
  onToggleTagsSection: () => void;
}

interface SidebarCollapsedFooterProps {
  updateAvailable?: boolean;
  importShortcut?: string;
  settingsShortcut?: string;
  onOpenImport?: () => void;
  onOpenSettings?: () => void;
  onUpdateClick?: () => void;
}

interface SidebarCollapsedViewProps {
  showCollapsedContent: boolean;
  navigation: SidebarCollapsedNavigationProps;
  sections: SidebarCollapsedSectionsProps;
  footer: SidebarCollapsedFooterProps;
}

export const SidebarCollapsedView = ({
  showCollapsedContent,
  navigation,
  sections,
  footer,
}: SidebarCollapsedViewProps) => {
  const {
    sensors,
    filtersDragBoundsRef,
    localCalendarsDragBoundsRef,
    accountsCalendarsDragBoundsRef,
    tagsDragBoundsRef,
    setIsDraggingFilters,
    draggingCalendarAccountId,
    setDraggingCalendarAccountId,
    setIsDraggingTags,
    isAnyCollapsedItemDragging,
    restrictFilterDragToSection,
    restrictLocalCalendarDragToSection,
    restrictAccountCalendarDragToSection,
    restrictTagDragToSection,
  } = useSidebarCollapsedDragState();

  const sectionOrder = [
    ...sections.sidebarSectionOrder,
    ...(['filters', 'local', 'accounts', 'tags'] as const).filter(
      (section) => !sections.sidebarSectionOrder.includes(section),
    ),
  ];

  const importTooltip = (
    <span className="flex items-center gap-3 whitespace-nowrap">
      <span>Import tasks...</span>
      {footer.importShortcut && (
        <span className="font-normal text-white/70 text-xs">{footer.importShortcut}</span>
      )}
    </span>
  );
  const settingsTooltip = (
    <span className="flex items-center gap-3 whitespace-nowrap">
      <span>Settings</span>
      {footer.settingsShortcut && (
        <span className="font-normal text-white/70 text-xs">{footer.settingsShortcut}</span>
      )}
    </span>
  );

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col items-center motion-safe:transition-opacity motion-safe:duration-150 ${showCollapsedContent ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto overscroll-contain py-2">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <Tooltip
            content={
              <span className="flex flex-col whitespace-nowrap leading-tight">
                <span>All Tasks</span>
                <span className="font-normal text-[10px] text-white/65">View</span>
              </span>
            }
            position="right"
            disabled={isAnyCollapsedItemDragging}
          >
            <button
              type="button"
              onClick={navigation.onAllTasks}
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
                navigation.activeView === 'tasks' &&
                navigation.activeCalendarId === null &&
                navigation.activeTagId === null
                  ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
                  : 'text-surface-500 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-700'
              }`}
            >
              <Inbox className="h-5 w-5" />
            </button>
          </Tooltip>

          <Tooltip
            content={
              <span className="flex flex-col whitespace-nowrap leading-tight">
                <span>Recently Deleted</span>
                <span className="font-normal text-[10px] text-white/65">View</span>
              </span>
            }
            position="right"
            disabled={isAnyCollapsedItemDragging}
          >
            <button
              type="button"
              onClick={navigation.onRecentlyDeleted}
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset ${
                navigation.activeView === 'recently-deleted'
                  ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
                  : 'text-surface-500 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-700'
              }`}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>

        <div
          aria-hidden="true"
          className="my-1 h-px w-8 shrink-0 bg-surface-200 dark:bg-surface-700"
        />

        {sectionOrder.map((section) => {
          if (section === 'filters') {
            return (
              <SidebarCollapsedFilters
                key={section}
                filters={sections.filters}
                activeFilterId={navigation.activeFilterId}
                contextMenu={sections.contextMenu}
                showFiltersSection={sections.showFiltersSection}
                filtersSectionCollapsed={sections.filtersSectionCollapsed}
                sensors={sensors}
                dragBoundsRef={filtersDragBoundsRef}
                restrictDragToSection={restrictFilterDragToSection}
                isAnyDragging={isAnyCollapsedItemDragging}
                onDraggingChange={setIsDraggingFilters}
                onToggleSection={sections.onToggleFiltersSection}
                onSelectFilter={navigation.onSelectFilter}
                onContextMenu={navigation.onContextMenu}
              />
            );
          }

          if (section === 'local' || section === 'accounts') {
            const isLocal = section === 'local';
            return (
              <SidebarCollapsedCalendarSection
                key={section}
                accounts={sections.accounts}
                tasks={sections.tasks}
                activeCalendarId={navigation.activeCalendarId}
                contextMenu={sections.contextMenu}
                section={section}
                collapsed={
                  isLocal ? sections.localSectionCollapsed : sections.accountsSectionCollapsed
                }
                showSection={isLocal ? sections.showLocalSection : sections.showAccountsSection}
                sensors={sensors}
                dragBoundsRef={
                  isLocal ? localCalendarsDragBoundsRef : accountsCalendarsDragBoundsRef
                }
                restrictDragToSection={
                  isLocal
                    ? restrictLocalCalendarDragToSection
                    : restrictAccountCalendarDragToSection
                }
                isAnyDragging={isAnyCollapsedItemDragging}
                draggingCalendarAccountId={draggingCalendarAccountId}
                onDraggingAccountChange={setDraggingCalendarAccountId}
                onToggleSection={
                  isLocal ? sections.onToggleLocalSection : sections.onToggleAccountsSection
                }
                onSelectCalendar={navigation.onSelectCalendar}
                onContextMenu={navigation.onContextMenu}
              />
            );
          }

          return (
            <SidebarCollapsedTags
              key={section}
              tags={sections.tags}
              tasks={sections.tasks}
              activeTagId={navigation.activeTagId}
              contextMenu={sections.contextMenu}
              showTagsSection={sections.showTagsSection}
              tagsSectionCollapsed={sections.tagsSectionCollapsed}
              sensors={sensors}
              dragBoundsRef={tagsDragBoundsRef}
              restrictDragToSection={restrictTagDragToSection}
              isAnyDragging={isAnyCollapsedItemDragging}
              onDraggingChange={setIsDraggingTags}
              onToggleSection={sections.onToggleTagsSection}
              onSelectTag={navigation.onSelectTag}
              onContextMenu={navigation.onContextMenu}
            />
          );
        })}
      </div>

      <div className="relative flex w-full shrink-0 flex-col items-center gap-2 bg-surface-100 px-1 py-2 dark:bg-surface-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-surface-100 to-transparent dark:from-surface-900"
        />
        <div aria-hidden="true" className="h-px w-8 shrink-0 bg-surface-200 dark:bg-surface-700" />
        {footer.updateAvailable && (
          <Tooltip
            content="Update available!"
            position="right"
            disabled={isAnyCollapsedItemDragging}
          >
            <button
              type="button"
              onClick={() => footer.onUpdateClick?.()}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-surface-500 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
            >
              <Download className="h-5 w-5 text-primary-ink" />
            </button>
          </Tooltip>
        )}
        <div className="flex flex-col items-center gap-2">
          <Tooltip content={importTooltip} position="right" disabled={isAnyCollapsedItemDragging}>
            <button
              type="button"
              onClick={() => footer.onOpenImport?.()}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-surface-500 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
            >
              <Import className="h-5 w-5" />
            </button>
          </Tooltip>
          <Tooltip content={settingsTooltip} position="right" disabled={isAnyCollapsedItemDragging}>
            <button
              type="button"
              onClick={() => footer.onOpenSettings?.()}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-surface-500 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-inset dark:text-surface-400 dark:hover:bg-surface-700"
            >
              <Settings className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
