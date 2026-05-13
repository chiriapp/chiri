import type { ReactNode } from 'react';

interface AboutSettingsSectionProps {
  title: string;
  children: ReactNode;
}

export const AboutSettingsSection = ({ title, children }: AboutSettingsSectionProps) => (
  <div className="space-y-2">
    <p className="text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider px-1">
      {title}
    </p>
    <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden divide-y divide-surface-100 dark:divide-surface-700">
      {children}
    </div>
  </div>
);
