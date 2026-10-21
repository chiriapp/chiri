import type { ReactNode } from 'react';
import { Tooltip } from '$components/Tooltip';

interface TaskBatchActionTooltipProps {
  content: string;
  children: ReactNode;
}

export const TaskBatchActionTooltip = ({ content, children }: TaskBatchActionTooltipProps) => (
  <Tooltip content={content} position="bottom">
    {children}
  </Tooltip>
);
