import type { Calendar, ExportFormat, ExportType, Task } from '$types/index';
import { pluralize } from '$utils/format';
import {
  exportTasksAsCsv,
  exportTasksAsIcs,
  exportTasksAsJson,
  exportTasksAsMarkdown,
} from '$utils/ical';

/**
 * Get export modal title based on export type
 */
export const getExportTitle = (type: ExportType) => {
  switch (type) {
    case 'all-calendars':
      return 'Export all calendars';
    case 'single-calendar':
      return 'Export calendar';
    case 'tasks':
      return 'Export tasks';
  }
};

/**
 * Get export modal description based on type
 */
export const getExportDescription = (
  type: ExportType,
  tasks: Task[],
  calendars: Calendar[],
  calendarName?: string,
) => {
  switch (type) {
    case 'all-calendars':
      return `${calendars.length} ${pluralize(calendars.length, 'calendar')}, ${tasks.length} ${pluralize(tasks.length, 'task')}`;

    case 'single-calendar':
      return `${tasks.length} ${pluralize(tasks.length, 'task')} in ${calendarName || 'Calendar'}`;

    case 'tasks': {
      // calculate subtask count based on array length (for flattened task hierarchies)
      const descendantCount = tasks.length > 1 ? tasks.length - 1 : 0;
      const firstTaskSubtasks = tasks[0]?.subtasks?.length || 0;
      const totalSubtasks = descendantCount > 0 ? descendantCount : firstTaskSubtasks;

      if (totalSubtasks > 0) {
        return `${tasks.length} ${pluralize(tasks.length, 'task')} + ${totalSubtasks} ${pluralize(totalSubtasks, 'subtask')}`;
      }
      return `${tasks.length} ${pluralize(tasks.length, 'task')}`;
    }
  }
};

/**
 * Get export content string based on format
 */
export const getExportContent = (format: ExportFormat, tasks: Task[]) => {
  switch (format) {
    case 'ics':
      return exportTasksAsIcs(tasks);
    case 'json':
      return exportTasksAsJson(tasks);
    case 'markdown':
      return exportTasksAsMarkdown(tasks);
    case 'csv':
      return exportTasksAsCsv(tasks);
    default:
      return '';
  }
};
