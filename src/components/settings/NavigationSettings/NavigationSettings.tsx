import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Cloud from 'lucide-react/icons/cloud';
import Filter from 'lucide-react/icons/filter';
import HardDrive from 'lucide-react/icons/hard-drive';
import Tags from 'lucide-react/icons/tags';
import { Select } from '$components/Select';
import {
  type NavigationSectionConfig,
  NavigationSettingsSortableSection,
} from '$components/settings/NavigationSettings/NavigationSettingsSortableSection';
import { useSettingsStore } from '$context/settingsContext';
import type { DefaultLaunchView, SidebarSectionKey } from '$types/settings';

const SECTIONS: NavigationSectionConfig[] = [
  {
    key: 'filters',
    label: 'Filters',
    description: 'Saved filters in the sidebar',
    icon: <Filter className="h-4 w-4" />,
  },
  {
    key: 'local',
    label: 'Local',
    description: 'Local calendars in the sidebar',
    icon: <HardDrive className="h-4 w-4" />,
  },
  {
    key: 'accounts',
    label: 'Accounts',
    description: 'CalDAV accounts in the sidebar',
    icon: <Cloud className="h-4 w-4" />,
  },
  {
    key: 'tags',
    label: 'Tags',
    description: 'Tags in the sidebar',
    icon: <Tags className="h-4 w-4" />,
  },
];

const SECTION_MAP = new Map(SECTIONS.map((section) => [section.key, section]));

export const NavigationSettings = () => {
  const {
    defaultLaunchView,
    setDefaultLaunchView,
    showSidebarTaskCounts,
    setShowSidebarTaskCounts,
    sidebarSectionOrder,
    setSidebarSectionOrder,
    showLocalSection,
    setShowLocalSection,
    showAccountsSection,
    setShowAccountsSection,
    showFiltersSection,
    setShowFiltersSection,
    showTagsSection,
    setShowTagsSection,
  } = useSettingsStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const orderedSections = sidebarSectionOrder
    .map((key) => SECTION_MAP.get(key))
    .filter(Boolean) as NavigationSectionConfig[];

  const sectionVisibility: Record<SidebarSectionKey, boolean> = {
    filters: showFiltersSection,
    local: showLocalSection,
    accounts: showAccountsSection,
    tags: showTagsSection,
  };

  const toggleSection = (key: SidebarSectionKey, value: boolean) => {
    if (key === 'filters') {
      setShowFiltersSection(value);
    } else if (key === 'local') {
      setShowLocalSection(value);
    } else if (key === 'accounts') {
      setShowAccountsSection(value);
    } else {
      setShowTagsSection(value);
    }
  };

  const handleSectionDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = sidebarSectionOrder.indexOf(active.id as SidebarSectionKey);
    const newIndex = sidebarSectionOrder.indexOf(over.id as SidebarSectionKey);
    if (oldIndex === -1 || newIndex === -1) return;
    setSidebarSectionOrder(arrayMove(sidebarSectionOrder, oldIndex, newIndex));
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base text-surface-800 dark:text-surface-200">Navigation</h3>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <label
          htmlFor="default-launch-view"
          className="flex items-center justify-between gap-4 p-4"
        >
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">Default view on launch</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Choose what opens when Chiri starts
            </p>
          </div>
          <Select
            id="default-launch-view"
            value={defaultLaunchView}
            onChange={(event) => setDefaultLaunchView(event.target.value as DefaultLaunchView)}
            className="shrink-0 rounded-lg border border-transparent bg-surface-100 text-sm text-surface-800 outline-hidden transition-colors focus:border-primary-500 focus:bg-white dark:bg-surface-700 dark:text-surface-200 dark:focus:bg-surface-800"
          >
            <option value="last-view">Last view</option>
            <option value="all-tasks">All Tasks</option>
            <option value="recently-deleted">Recently Deleted</option>
          </Select>
        </label>

        <div className="border-surface-200 border-t dark:border-surface-700" />

        <label className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm text-surface-700 dark:text-surface-300">Task counts</p>
            <p className="text-surface-500 text-xs dark:text-surface-400">
              Show counts next to task views, calendars, filters, and tags in the sidebar
            </p>
          </div>
          <input
            type="checkbox"
            checked={showSidebarTaskCounts}
            onChange={(e) => setShowSidebarTaskCounts(e.target.checked)}
            className="shrink-0 rounded-sm border-surface-300 outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          />
        </label>
      </div>

      <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">
        Sidebar sections
      </h4>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext items={sidebarSectionOrder} strategy={verticalListSortingStrategy}>
            {orderedSections.map((section, index) => (
              <NavigationSettingsSortableSection
                key={section.key}
                section={section}
                showBorder={index > 0}
                checked={sectionVisibility[section.key]}
                onToggle={toggleSection}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
