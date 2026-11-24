import type { MouseEvent } from 'react';
import { SidebarExpandedAccountsList } from '$components/sidebar/expanded/SidebarExpandedAccountsList';
import { SidebarExpandedFiltersList } from '$components/sidebar/expanded/SidebarExpandedFiltersList';
import { SidebarExpandedLocalList } from '$components/sidebar/expanded/SidebarExpandedLocalList';
import { SidebarExpandedTagsList } from '$components/sidebar/expanded/SidebarExpandedTagsList';
import type { Account } from '$types/account';
import type { Filter } from '$types/filter';
import type { SidebarSectionKey } from '$types/settings/categories/navigation';
import type { Tag } from '$types/tag';
import type { Task } from '$types/task/model';

export type SidebarExpandedContextMenuState = {
  type: 'account' | 'calendar' | 'tag' | 'filter' | 'accounts-section';
  id: string;
  accountId?: string;
} | null;

export interface SidebarExpandedSectionsProps {
  activeCalendarId: string | null;
  activeTagId: string | null;
  activeFilterId: string | null;
  localAccounts: Account[];
  caldavAccounts: Account[];
  tags: Tag[];
  filters: Filter[];
  tasks: Task[];
  expandedAccounts: Set<string>;
  contextMenu: SidebarExpandedContextMenuState;
  isAnyModalOpen: boolean;
  activeAccountMenuTriggerId: string | null;
  showSidebarTaskCounts: boolean;
  localSectionCollapsed: boolean;
  accountsSectionCollapsed: boolean;
  filtersSectionCollapsed: boolean;
  tagsSectionCollapsed: boolean;
  showLocalSection: boolean;
  showAccountsSection: boolean;
  showFiltersSection: boolean;
  showTagsSection: boolean;
  sidebarSectionOrder: SidebarSectionKey[];
  onSelectCalendar: (accountId: string, calendarId: string) => void;
  onSelectTag: (tagId: string) => void;
  onSelectFilter: (filterId: string) => void;
  onContextMenu: (
    event: MouseEvent,
    type: 'account' | 'calendar' | 'tag' | 'filter' | 'accounts-section',
    id: string,
    accountId?: string,
  ) => void;
  onToggleLocalSection: () => void;
  onToggleAccountsSection: () => void;
  onToggleFiltersSection: () => void;
  onToggleTagsSection: () => void;
  onToggleAccount: (accountId: string) => void;
  onAddLocalCalendar: () => void;
  onCreateCalendar: (accountId: string) => void;
  onAddAccount: () => void;
  onAddFilter: () => void;
  onAddTag: () => void;
}

export const SidebarExpandedSections = ({
  activeCalendarId,
  activeTagId,
  activeFilterId,
  localAccounts,
  caldavAccounts,
  tags,
  filters,
  tasks,
  expandedAccounts,
  contextMenu,
  isAnyModalOpen,
  activeAccountMenuTriggerId,
  showSidebarTaskCounts,
  localSectionCollapsed,
  accountsSectionCollapsed,
  filtersSectionCollapsed,
  tagsSectionCollapsed,
  showLocalSection,
  showAccountsSection,
  showFiltersSection,
  showTagsSection,
  sidebarSectionOrder,
  onSelectCalendar,
  onSelectTag,
  onSelectFilter,
  onContextMenu,
  onToggleLocalSection,
  onToggleAccountsSection,
  onToggleFiltersSection,
  onToggleTagsSection,
  onToggleAccount,
  onAddLocalCalendar,
  onCreateCalendar,
  onAddAccount,
  onAddFilter,
  onAddTag,
}: SidebarExpandedSectionsProps) => {
  const renderSection = (section: SidebarSectionKey) => {
    if (section === 'filters') {
      return showFiltersSection ? (
        <SidebarExpandedFiltersList
          key={section}
          filters={filters}
          tasks={tasks}
          activeFilterId={activeFilterId}
          contextMenu={contextMenu}
          isAnyModalOpen={isAnyModalOpen}
          showTaskCounts={showSidebarTaskCounts}
          collapsed={filtersSectionCollapsed}
          onToggle={onToggleFiltersSection}
          onSelectFilter={onSelectFilter}
          onAddFilter={onAddFilter}
          onContextMenu={onContextMenu}
        />
      ) : null;
    }

    if (section === 'local') {
      return showLocalSection ? (
        <SidebarExpandedLocalList
          key={section}
          accounts={localAccounts}
          tasks={tasks}
          activeCalendarId={activeCalendarId}
          contextMenu={contextMenu}
          isAnyModalOpen={isAnyModalOpen}
          showTaskCounts={showSidebarTaskCounts}
          collapsed={localSectionCollapsed}
          onToggle={onToggleLocalSection}
          onContextMenu={onContextMenu}
          onSelectCalendar={onSelectCalendar}
          onAddCalendar={onAddLocalCalendar}
        />
      ) : null;
    }

    if (section === 'accounts') {
      return showAccountsSection ? (
        <SidebarExpandedAccountsList
          key={section}
          accounts={caldavAccounts}
          tasks={tasks}
          expandedAccounts={expandedAccounts}
          activeCalendarId={activeCalendarId}
          contextMenu={contextMenu}
          isAnyModalOpen={isAnyModalOpen}
          activeAccountMenuTriggerId={activeAccountMenuTriggerId}
          showTaskCounts={showSidebarTaskCounts}
          accountsSectionCollapsed={accountsSectionCollapsed}
          onToggleAccountsSection={onToggleAccountsSection}
          onContextMenu={onContextMenu}
          onToggleAccount={onToggleAccount}
          onSelectCalendar={onSelectCalendar}
          onCreateCalendar={onCreateCalendar}
          onAddAccount={onAddAccount}
        />
      ) : null;
    }

    return showTagsSection ? (
      <SidebarExpandedTagsList
        key={section}
        tags={tags}
        tasks={tasks}
        activeTagId={activeTagId}
        contextMenu={contextMenu}
        isAnyModalOpen={isAnyModalOpen}
        showTaskCounts={showSidebarTaskCounts}
        tagsSectionCollapsed={tagsSectionCollapsed}
        onToggleTagsSection={onToggleTagsSection}
        onSelectTag={onSelectTag}
        onContextMenu={onContextMenu}
        onAddTag={onAddTag}
      />
    ) : null;
  };

  return <>{sidebarSectionOrder.map(renderSection)}</>;
};
