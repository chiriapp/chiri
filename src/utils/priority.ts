import type { Priority } from '$types/index';

/**
 * Priority configuration with labels and styling
 */
export const PRIORITY_CONFIG: Record<
  Priority,
  {
    value: Priority;
    label: string;
    color: string;
    borderColor: string;
    bgColor: string;
  }
> = {
  high: {
    value: 'high',
    label: 'High',
    color: 'text-red-500',
    borderColor: 'border-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
  },
  medium: {
    value: 'medium',
    label: 'Medium',
    color: 'text-amber-600 dark:text-amber-500',
    borderColor: 'border-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
  },
  low: {
    value: 'low',
    label: 'Low',
    color: 'text-blue-600 dark:text-blue-500',
    borderColor: 'border-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
  },
  none: {
    value: 'none',
    label: 'None',
    color: 'text-surface-600 dark:text-surface-300',
    borderColor: 'border-surface-300',
    bgColor: 'bg-surface-50 dark:bg-surface-700',
  },
};

/**
 * Array of priority configurations for iteration
 */
export const PRIORITIES = Object.values(PRIORITY_CONFIG);

/**
 * Priority colors for task items (combined border and background)
 */
export const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'border-red-400 bg-red-50 dark:bg-red-900/30',
  medium: 'border-amber-400 bg-amber-50 dark:bg-amber-900/30',
  low: 'border-blue-400 bg-blue-50 dark:bg-blue-900/30',
  none: 'border-transparent',
};

export const RING_COLORS: Record<Priority, string> = {
  high: 'ring ring-red-400 dark:ring-red-500',
  medium: 'ring ring-amber-400 dark:ring-amber-500',
  low: 'ring ring-blue-400 dark:ring-blue-500',
  none: 'ring ring-primary-400 dark:ring-primary-500',
};

/**
 * Priority dot colors for subtask indicators
 */
export const PRIORITY_DOTS: Record<Priority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
  none: '',
};

/**
 * Get priority configuration by priority value
 */
export const getPriorityConfig = (priority: Priority) => {
  return PRIORITY_CONFIG[priority];
};

/**
 * Get priority color classes for task items
 */
export const getPriorityColor = (priority: Priority): string => {
  return PRIORITY_COLORS[priority];
};

/**
 * Get ring color classes for selected task items based on priority
 */
export const getPriorityRingColor = (priority: Priority): string => {
  return RING_COLORS[priority];
};

/**
 * Get priority dot color class for subtasks
 */
export const getPriorityDot = (priority: Priority): string => {
  return PRIORITY_DOTS[priority];
};
