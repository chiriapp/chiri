import type { ReactNode } from 'react';

interface TaskEditorEmptyStateProps {
  icon: ReactNode;
  children: ReactNode;
  title?: string;
}

export const TaskEditorEmptyState = ({ icon, children, title }: TaskEditorEmptyStateProps) => {
  return (
    <div
      className="flex w-full cursor-not-allowed items-center gap-2 rounded-lg border border-surface-300 border-dashed px-3 py-2 text-sm text-surface-400 dark:border-surface-700 dark:text-surface-500"
      title={title}
    >
      {icon}
      {children}
    </div>
  );
};
