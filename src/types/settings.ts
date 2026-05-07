import type { ServerType } from '$types';

export type TaskListDensity = 'comfortable' | 'compact';

export type WindowDecorationsMode = 'auto' | 'on' | 'off';

export interface EditorFieldVisibility {
  status: boolean;
  description: boolean;
  url: boolean;
  dates: boolean;
  repeat: boolean;
  priority: boolean;
  calendar: boolean;
  tags: boolean;
  reminders: boolean;
  subtasks: boolean;
}

export type EditorFieldKey = keyof EditorFieldVisibility;

export interface TaskBadgeVisibility {
  startDate: boolean;
  dueDate: boolean;
  tags: boolean;
  calendar: boolean;
  url: boolean;
  status: boolean;
  repeat: boolean;
  subtasks: boolean;
}

export type TaskBadgeKey = keyof TaskBadgeVisibility;

export interface QuickTimePresets {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
}

export interface OnboardingStep {
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  illustration?: React.ReactNode;
}

export interface ServerTypeOption {
  value: ServerType;
  label: string;
  description: string;
}

export interface ServerTypeGroup {
  label: string;
  options: ServerTypeOption[];
}
