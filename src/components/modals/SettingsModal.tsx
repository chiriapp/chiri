import BadgeCheck from 'lucide-react/icons/badge-check';
import Bell from 'lucide-react/icons/bell';
import Cpu from 'lucide-react/icons/cpu';
import Database from 'lucide-react/icons/database';
import Download from 'lucide-react/icons/download';
import Globe from 'lucide-react/icons/globe';
import HelpCircle from 'lucide-react/icons/help-circle';
import Info from 'lucide-react/icons/info';
import Keyboard from 'lucide-react/icons/keyboard';
import Link2 from 'lucide-react/icons/link-2';
import ListTodo from 'lucide-react/icons/list-todo';
import Monitor from 'lucide-react/icons/monitor';
import Palette from 'lucide-react/icons/palette';
import RefreshCw from 'lucide-react/icons/refresh-cw';
import Settings from 'lucide-react/icons/settings';
import Sliders from 'lucide-react/icons/sliders';
import SquarePen from 'lucide-react/icons/square-pen';
import User from 'lucide-react/icons/user';
import { useState } from 'react';
import { ModalWrapper } from '$components/ModalWrapper';
import { AboutSettings } from '$components/settings/AboutSettings/AboutSettings';
import { BadgesSettings } from '$components/settings/BadgesSettings/BadgesSettings';
import { BehaviorSettings } from '$components/settings/BehaviorSettings';
import { ConnectionsSettings } from '$components/settings/ConnectionSettings/ConnectionsSettings';
import { DataSettings } from '$components/settings/DataSettings';
import { EditorSettings } from '$components/settings/EditorSettings/EditorSettings';
import { LookAndFeelSettings } from '$components/settings/LookAndFeelSettings';
import { NotificationSettings } from '$components/settings/NotificationSettings';
import { RegionAndTimeSettings } from '$components/settings/RegionAndTimeSettings';
import { ShortcutsSettings } from '$components/settings/ShortcutsSettings/ShortcutsSettings';
import { SyncSettings } from '$components/settings/SyncSettings/SyncSettings';
import { SystemSettings } from '$components/settings/SystemSettings';
import { TaskDefaultsSettings } from '$components/settings/TaskDefaultsSettings/TaskDefaultsSettings';
import { UpdateSettings } from '$components/settings/UpdateSettings';
import { useAccounts } from '$hooks/queries/useAccounts';
import type { SettingsCategory, SettingsSubtab } from '$types/settings';

interface SettingsModalProps {
  onClose: () => void;
  onAddAccount: () => void;
  onEditAccount: (accountId: string) => void;
  initialCategory?: SettingsCategory;
  initialSubtab?: SettingsSubtab;
}

type SettingsSubtabInfo = {
  id: SettingsSubtab;
  label: string;
  icon: React.ReactNode;
};

export const SettingsModal = ({
  onClose,
  onAddAccount,
  onEditAccount,
  initialCategory,
  initialSubtab,
}: SettingsModalProps) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(initialCategory || 'app');
  const [activeSubtabs, setActiveSubtabs] = useState<Record<SettingsCategory, SettingsSubtab>>({
    tasks: initialCategory === 'tasks' && initialSubtab ? initialSubtab : 'defaults',
    app: initialCategory === 'app' && initialSubtab ? initialSubtab : 'behavior',
    accounts: initialCategory === 'accounts' && initialSubtab ? initialSubtab : 'connections',
    misc: initialCategory === 'misc' && initialSubtab ? initialSubtab : 'updates',
  });
  const [isChildModalOpen, setIsChildModalOpen] = useState(false);
  const { data: accounts = [] } = useAccounts();

  const categories: {
    id: SettingsCategory;
    label: string;
    icon: React.ReactNode;
    subtabs: SettingsSubtabInfo[];
  }[] = [
    {
      id: 'app',
      label: 'App',
      icon: <Monitor className="h-4 w-4" />,
      subtabs: [
        { id: 'behavior', label: 'Behavior', icon: <Settings className="h-4 w-4" /> },
        { id: 'data', label: 'Data', icon: <Database className="h-4 w-4" /> },
        {
          id: 'keyboard-shortcuts',
          label: 'Keyboard shortcuts',
          icon: <Keyboard className="h-4 w-4" />,
        },
        { id: 'look-and-feel', label: 'Look & feel', icon: <Palette className="h-4 w-4" /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
        { id: 'region-and-time', label: 'Region & time', icon: <Globe className="h-4 w-4" /> },
        { id: 'system', label: 'System', icon: <Cpu className="h-4 w-4" /> },
      ],
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <ListTodo className="h-4 w-4" />,
      subtabs: [
        { id: 'badges', label: 'Badges', icon: <BadgeCheck className="h-4 w-4" /> },
        { id: 'defaults', label: 'Defaults', icon: <Sliders className="h-4 w-4" /> },
        { id: 'editor', label: 'Editor', icon: <SquarePen className="h-4 w-4" /> },
      ],
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: <User className="h-4 w-4" />,
      subtabs: [
        { id: 'connections', label: 'Connections', icon: <Link2 className="h-4 w-4" /> },
        { id: 'sync', label: 'Sync', icon: <RefreshCw className="h-4 w-4" /> },
      ],
    },
    {
      id: 'misc',
      label: 'Help',
      icon: <HelpCircle className="h-4 w-4" />,
      subtabs: [
        { id: 'updates', label: 'Updates', icon: <Download className="h-4 w-4" /> },
        { id: 'about', label: 'About', icon: <Info className="h-4 w-4" /> },
      ],
    },
  ];

  const currentSubtab = activeSubtabs[activeCategory];

  return (
    <ModalWrapper
      isOpen={true}
      onClose={isChildModalOpen ? () => {} : onClose}
      title="Settings"
      zIndex="z-60"
      className="max-h-[75vh] max-w-3xl"
      contentPadding={false}
    >
      <div className="flex h-[calc(85vh-12rem)] max-h-[75vh] overflow-hidden">
        <div className="w-56 space-y-4 overflow-y-auto overscroll-contain rounded-l-xl border-surface-200 border-r bg-white p-3 pr-5 dark:border-surface-700 dark:bg-surface-800">
          {categories.map((category) => (
            <div key={category.id} className="space-y-2">
              <p className="px-2 font-semibold text-surface-500 text-xs uppercase tracking-wide dark:text-surface-400">
                {category.label}
              </p>
              <div className="space-y-1">
                {category.subtabs.map((tab) => {
                  const isActiveCategory = activeCategory === category.id;
                  const isActiveTab = isActiveCategory && activeSubtabs[category.id] === tab.id;

                  return (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => {
                        setActiveCategory(category.id);
                        setActiveSubtabs((prev) => ({
                          ...prev,
                          [category.id]: tab.id,
                        }));
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                        isActiveTab
                          ? 'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-100'
                          : 'text-surface-600 hover:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-700'
                      }`}
                    >
                      <span
                        className={`shrink-0 ${isActiveTab ? 'text-surface-900 dark:text-surface-100' : 'text-surface-500 dark:text-surface-400'}`}
                      >
                        {tab.icon}
                      </span>
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-6">
          {activeCategory === 'tasks' && currentSubtab === 'badges' && <BadgesSettings />}
          {activeCategory === 'tasks' && currentSubtab === 'defaults' && <TaskDefaultsSettings />}
          {activeCategory === 'tasks' && currentSubtab === 'editor' && <EditorSettings />}

          {activeCategory === 'app' && (
            <>
              {currentSubtab === 'behavior' && <BehaviorSettings />}
              {currentSubtab === 'data' && <DataSettings onClose={onClose} />}
              {currentSubtab === 'keyboard-shortcuts' && (
                <ShortcutsSettings onEditingShortcutChange={setIsChildModalOpen} />
              )}
              {currentSubtab === 'look-and-feel' && <LookAndFeelSettings />}
              {currentSubtab === 'notifications' && <NotificationSettings />}
              {currentSubtab === 'region-and-time' && <RegionAndTimeSettings />}
              {currentSubtab === 'system' && <SystemSettings />}
            </>
          )}

          {activeCategory === 'accounts' && (
            <>
              {currentSubtab === 'connections' && (
                <ConnectionsSettings
                  accounts={accounts}
                  onAddAccount={onAddAccount}
                  onEditAccount={onEditAccount}
                />
              )}
              {currentSubtab === 'sync' && <SyncSettings />}
            </>
          )}

          {activeCategory === 'misc' && (
            <>
              {currentSubtab === 'updates' && <UpdateSettings />}
              {currentSubtab === 'about' && (
                <AboutSettings
                  onNavigateToUpdates={() => {
                    setActiveCategory('misc');
                    setActiveSubtabs((prev) => ({ ...prev, misc: 'updates' }));
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
};
