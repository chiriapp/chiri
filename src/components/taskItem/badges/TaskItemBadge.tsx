import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { Tooltip } from '$components/Tooltip';
import type { BadgeTone } from '$types/badge';

interface TaskItemBadgeProps {
  children?: ReactNode;
  color?: string;
  tone?: BadgeTone;
  className?: string;
  title?: string;
  tooltip?: ReactNode;
  tooltipDelay?: number;
  ariaLabel?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

type TaskItemBadgeStyle = CSSProperties & {
  '--task-item-badge-background'?: string;
  '--task-item-badge-hover-background'?: string;
};

const BASE_CLASS_NAME =
  'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-medium text-surface-700 text-xs dark:text-surface-300';

const TONE_CLASS_NAMES: Record<BadgeTone, string> = {
  neutral: 'border-surface-400 bg-surface-100 dark:border-surface-600 dark:bg-surface-700',
  primary: 'border-primary-ink bg-primary-500/15',
  info: 'border-semantic-info bg-semantic-info/10',
  'due-today': 'border-semantic-due-today bg-semantic-due-today/10',
  warning: 'border-semantic-warning bg-semantic-warning/10',
  error: 'border-semantic-error bg-semantic-error/10',
  'in-process': 'border-status-in-process bg-status-in-process/15',
};

const TONE_HOVER_CLASS_NAMES: Record<BadgeTone, string> = {
  neutral: 'hover:bg-surface-200 dark:hover:bg-surface-600',
  primary: 'hover:bg-primary-500/25',
  info: 'hover:bg-semantic-info/20',
  'due-today': 'hover:bg-semantic-due-today/20',
  warning: 'hover:bg-semantic-warning/20',
  error: 'hover:bg-semantic-error/20',
  'in-process': 'hover:bg-status-in-process/20',
};

const getColorTint = (color: string, percentage: number) =>
  `color-mix(in oklab, ${color} ${percentage}%, transparent)`;

const getClassName = (color: string | undefined, tone: BadgeTone, className: string | undefined) =>
  [BASE_CLASS_NAME, color ? 'task-item-badge-colored' : TONE_CLASS_NAMES[tone], className ?? '']
    .filter(Boolean)
    .join(' ');

export const TaskItemBadge = ({
  children,
  color,
  tone = 'neutral',
  className,
  title,
  tooltip,
  tooltipDelay = 350,
  ariaLabel,
  onClick,
}: TaskItemBadgeProps) => {
  const style: TaskItemBadgeStyle | undefined = color
    ? {
        borderColor: color,
        '--task-item-badge-background': getColorTint(color, 15),
        '--task-item-badge-hover-background': getColorTint(color, 25),
      }
    : undefined;
  const sharedProps = {
    className: getClassName(color, tone, className),
    style,
    title: tooltip ? undefined : title,
  };

  const badge = onClick ? (
    <button
      type="button"
      {...sharedProps}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${sharedProps.className} ${color ? '' : TONE_HOVER_CLASS_NAMES[tone]} task-item-badge-interactive cursor-pointer outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary-ink focus-visible:ring-offset-2 dark:ring-offset-surface-800`}
    >
      {children}
    </button>
  ) : (
    <span {...sharedProps}>{children}</span>
  );

  if (tooltip) {
    return (
      <Tooltip content={tooltip} delay={tooltipDelay}>
        {badge}
      </Tooltip>
    );
  }

  return badge;
};
