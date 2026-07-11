import type { ReactNode } from 'react';

interface AboutSettingsSectionProps {
  title: string;
  children: ReactNode;
}

export const AboutSettingsSection = ({ title, children }: AboutSettingsSectionProps) => (
  <div className="space-y-2">
    <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">{title}</h4>
    <div className="divide-y divide-surface-100 overflow-hidden rounded-lg border border-surface-200 bg-white dark:divide-surface-700 dark:border-surface-700 dark:bg-surface-800">
      {children}
    </div>
  </div>
);
