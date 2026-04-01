import type { Task } from '$types';
import { formatDate } from '$utils/date';
import { generateVCalendar, generateVTodo } from './vtodo';

/**
 * Export a single task as iCalendar format with all its child tasks
 */
export const exportTaskAsIcs = (task: Task, childTasks: Task[] = []) => {
  const vtodos: string[] = [];
  vtodos.push(generateVTodo(task));

  for (const childTask of childTasks) {
    vtodos.push(generateVTodo(childTask));
  }

  return generateVCalendar(vtodos);
};

/**
 * Export multiple tasks as iCalendar format
 */
export const exportTasksAsIcs = (tasks: Task[]) => {
  const vtodos = tasks.map((task) => generateVTodo(task));
  return generateVCalendar(vtodos);
};

/**
 * Export tasks as JSON for backup/export
 */
export const exportTasksAsJson = (tasks: Task[]) => {
  return JSON.stringify(tasks, null, 2);
};

/**
 * Export tasks as Markdown checklist format
 */
export const exportTasksAsMarkdown = (tasks: Task[], level: number = 0) => {
  let markdown = '';

  for (const task of tasks) {
    const indent = '  '.repeat(level);
    const checkbox =
      task.status === 'completed' ? '[x]' : task.status === 'cancelled' ? '[-]' : '[ ]';
    let line = `${indent}${checkbox} ${task.title}`;

    // Add metadata if present
    const metadata: string[] = [];
    if (task.priority !== 'none') {
      metadata.push(`Priority: ${task.priority}`);
    }
    if (task.dueDate) {
      metadata.push(`Due: ${formatDate(new Date(task.dueDate), true)}`);
    }
    if (task.categoryId) {
      metadata.push(`Category: ${task.categoryId}`);
    }

    if (metadata.length > 0) {
      line += ` (${metadata.join(', ')})`;
    }

    if (task.description) {
      line += `\n${indent}  > ${task.description.replace(/\n/g, `\n${indent}  > `)}`;
    }

    markdown += `${line}\n`;
  }

  return markdown;
};

/**
 * Export tasks as CSV format
 */
export const exportTasksAsCsv = (tasks: Task[]) => {
  const headers = [
    'Title',
    'Description',
    'Status',
    'Priority',
    'Due Date',
    'Start Date',
    'Category',
    'Created',
    'Modified',
  ];
  const rows = tasks.map((task) => [
    `"${task.title.replace(/"/g, '""')}"`,
    `"${task.description.replace(/"/g, '""')}"`,
    task.status === 'completed'
      ? 'Completed'
      : task.status === 'cancelled'
        ? 'Cancelled'
        : task.status === 'in-process'
          ? 'In Process'
          : 'Needs Action',
    task.priority,
    task.dueDate ? formatDate(new Date(task.dueDate), true) : '',
    task.startDate ? formatDate(new Date(task.startDate), true) : '',
    task.categoryId ?? '',
    formatDate(new Date(task.createdAt), true),
    formatDate(new Date(task.modifiedAt), true),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
};
