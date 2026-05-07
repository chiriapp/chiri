import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ArrowUpDown from 'lucide-react/icons/arrow-up-down';
import ChevronDown from 'lucide-react/icons/chevron-down';
import Import from 'lucide-react/icons/import';
import Plus from 'lucide-react/icons/plus';
import { useCallback, useRef, useState } from 'react';
import { SidebarAccountItem } from '$components/sidebar/SidebarAccountItem';
import { SidebarAccountsSortMenu } from '$components/sidebar/SidebarAccountsSortMenu';
import { Tooltip } from '$components/Tooltip';
import { useReorderAccounts } from '$hooks/queries/useAccounts';
import { useAccountSortConfig, useCalendarSortConfig } from '$hooks/queries/useUIState';
import { useEscapeKey } from '$hooks/ui/useEscapeKey';
import type { Account, Task } from '$types';

interface SidebarAccountsListProps {
  accounts: Account[];
  tasks: Task[];
  expandedAccounts: Set<string>;
  activeCalendarId: string | null;
  contextMenu: { type: string; id: string; accountId?: string } | null;
  isAnyModalOpen: boolean;
  accountsSectionCollapsed: boolean;
  onToggleAccountsSection: () => void;
  onContextMenu: (
    e: React.MouseEvent,
    type: 'account' | 'calendar' | 'tag' | 'accounts-section',
    id: string,
    accountId?: string,
  ) => void;
  onToggleAccount: (accountId: string) => void;
  onSelectCalendar: (accountId: string, calendarId: string) => void;
  onCreateCalendar: (accountId: string) => void;
  onOpenImport?: () => void;
  onAddAccount: () => void;
}

export const SidebarAccountsList = ({
  accounts,
  tasks,
  expandedAccounts,
  activeCalendarId,
  contextMenu,
  isAnyModalOpen,
  accountsSectionCollapsed,
  onToggleAccountsSection,
  onContextMenu,
  onToggleAccount,
  onSelectCalendar,
  onCreateCalendar,
  onOpenImport,
  onAddAccount,
}: SidebarAccountsListProps) => {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isDraggingAccount, setIsDraggingAccount] = useState(false);
  const accountsDragBoundsRef = useRef<HTMLDivElement>(null);

  const accountSortConfig = useAccountSortConfig();
  const calendarSortConfig = useCalendarSortConfig();
  const reorderAccountsMutation = useReorderAccounts();
  const accountSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const closeSortMenu = useCallback(() => setShowSortMenu(false), []);
  useEscapeKey(closeSortMenu, { enabled: showSortMenu });

  const sortedAccounts = (() => {
    const sorted = [...accounts];
    if (accountSortConfig.mode === 'title') {
      sorted.sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return accountSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      sorted.sort((a, b) => {
        const cmp = a.sortOrder - b.sortOrder;
        return accountSortConfig.direction === 'desc' ? -cmp : cmp;
      });
    }
    return sorted;
  })();

  const handleAccountDragEnd = (event: DragEndEvent) => {
    setIsDraggingAccount(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderAccountsMutation.mutate({ activeId: active.id as string, overId: over.id as string });
  };

  const restrictAccountDragToSection = useCallback<Modifier>(({ draggingNodeRect, transform }) => {
    const bounds = accountsDragBoundsRef.current?.getBoundingClientRect();
    if (!bounds || !draggingNodeRect) return transform;

    return {
      ...transform,
      x: Math.min(
        Math.max(transform.x, bounds.left - draggingNodeRect.left),
        bounds.right - draggingNodeRect.right,
      ),
      y: Math.min(
        Math.max(transform.y, bounds.top - draggingNodeRect.top),
        bounds.bottom - draggingNodeRect.bottom,
      ),
    };
  }, []);

  const sharedAccountProps = (account: Account) => ({
    account,
    tasks,
    expandedAccounts,
    activeCalendarId,
    contextMenu,
    isAnyModalOpen,
    isAnyAccountDragging: isDraggingAccount,
    calendarSortConfig,
    onToggleAccount,
    onSelectCalendar,
    onCreateCalendar,
    onContextMenu,
  });

  return (
    <div>
      <div className="relative">
        {/* biome-ignore lint/a11y/useSemanticElements: Section header toggle div contains icon+text layout that button element can't replicate */}
        <div
          onClick={onToggleAccountsSection}
          onKeyDown={(e) => e.key === 'Enter' && onToggleAccountsSection()}
          onContextMenu={(e) => onContextMenu(e, 'accounts-section', 'accounts')}
          role="button"
          tabIndex={0}
          aria-expanded={!accountsSectionCollapsed}
          className="flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
        >
          <div className="flex items-center gap-1.5">
            <ChevronDown
              className={`w-4 h-4 text-surface-400 motion-safe:transition-transform motion-safe:duration-200 ${accountsSectionCollapsed ? '-rotate-90' : 'rotate-0'}`}
            />
            <span className="text-sm font-semibold text-surface-500 dark:text-surface-400">
              Accounts
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip content="Import tasks" position="top">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenImport?.();
                }}
                className={`p-1 rounded-sm ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''} text-surface-500 dark:text-surface-400 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
              >
                <Import className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip content="List order" position="top">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSortMenu((v) => !v);
                }}
                className={`p-1 rounded transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                  showSortMenu
                    ? 'bg-surface-300 dark:bg-surface-600 text-surface-700 dark:text-surface-200'
                    : `text-surface-500 dark:text-surface-400 ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''}`
                }`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip content="Add account" position="top">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddAccount();
                }}
                className={`p-1 rounded-sm ${!isAnyModalOpen ? 'hover:bg-surface-300 dark:hover:bg-surface-600 hover:text-surface-700 dark:hover:text-surface-300' : ''} text-surface-500 dark:text-surface-400 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {showSortMenu && (
          <SidebarAccountsSortMenu
            accountSortConfig={accountSortConfig}
            calendarSortConfig={calendarSortConfig}
            onClose={closeSortMenu}
          />
        )}
      </div>

      <div
        className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-in-out ${accountsSectionCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
      >
        <div className="overflow-hidden">
          {accounts.length === 0 ? (
            <div className="px-3 py-1 text-sm text-surface-500 dark:text-surface-400">
              No accounts. Click + to add one!
            </div>
          ) : accountSortConfig.mode === 'manual' ? (
            <div ref={accountsDragBoundsRef}>
              <DndContext
                sensors={accountSensors}
                collisionDetection={closestCenter}
                modifiers={[restrictAccountDragToSection]}
                onDragStart={() => setIsDraggingAccount(true)}
                onDragEnd={handleAccountDragEnd}
                onDragCancel={() => setIsDraggingAccount(false)}
              >
                <SortableContext
                  items={sortedAccounts.map((a) => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedAccounts.map((account) => (
                    <SidebarAccountItem
                      key={account.id}
                      {...sharedAccountProps(account)}
                      sortable
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            <div ref={accountsDragBoundsRef}>
              {sortedAccounts.map((account) => (
                <SidebarAccountItem key={account.id} {...sharedAccountProps(account)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
