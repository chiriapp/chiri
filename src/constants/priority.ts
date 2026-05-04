import type { Priority } from '$types';

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
    color: 'text-priority-high',
    borderColor: 'border-priority-high',
    bgColor: 'bg-priority-high/15',
  },
  medium: {
    value: 'medium',
    label: 'Medium',
    color: 'text-priority-medium',
    borderColor: 'border-priority-medium',
    bgColor: 'bg-priority-medium/15',
  },
  low: {
    value: 'low',
    label: 'Low',
    color: 'text-priority-low',
    borderColor: 'border-priority-low',
    bgColor: 'bg-priority-low/15',
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
  high: 'border-priority-high bg-priority-high/15',
  medium: 'border-priority-medium bg-priority-medium/15',
  low: 'border-priority-low bg-priority-low/15',
  none: 'border-transparent',
};

export const RING_COLORS: Record<Priority, string> = {
  high: 'ring-3 ring-priority-high',
  medium: 'ring-3 ring-priority-medium',
  low: 'ring-3 ring-priority-low',
  none: 'ring-3 ring-primary-500',
};

/**
 * Priority dot colors for subtask indicators
 */
export const PRIORITY_DOTS: Record<Priority, string> = {
  high: 'bg-priority-high',
  medium: 'bg-priority-medium',
  low: 'bg-priority-low',
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
