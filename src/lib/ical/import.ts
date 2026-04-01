import { loggers } from '$lib/logger';
import type { Task } from '$types';
import { generateUUID } from '$utils/misc';
import { extractVTodos, parsedVTodoToTask, parseVTodo } from './vtodo';

const log = loggers.iCal;

/**
 * Parse an ICS file and extract all tasks (VTODOs)
 * Returns parsed tasks without accountId/calendarId - caller must assign them
 */
export const parseIcsFile = (icsContent: string) => {
  try {
    const vtodos = extractVTodos(icsContent);
    const tasks: Partial<Task>[] = [];

    for (const vtodoContent of vtodos) {
      const parsed = parseVTodo(vtodoContent);
      tasks.push(parsedVTodoToTask(parsed, { synced: false }) as Partial<Task>);
    }

    return tasks;
  } catch (error) {
    log.error('Error parsing ICS file:', error);
    return [];
  }
};

/**
 * Detect whether a parsed JSON object is a Tasks.org backup file
 */
const isTasksOrgBackup = (data: unknown) => {
  if (typeof data !== 'object' || data === null) return false;
  const inner = (data as Record<string, unknown>).data;
  if (typeof inner !== 'object' || inner === null) return false;
  const tasks = (inner as Record<string, unknown>).tasks;
  if (!Array.isArray(tasks)) return false;
  return typeof (tasks[0] as Record<string, unknown>)?.vtodo === 'string';
};

/**
 * Parse a Tasks.org backup JSON file and extract all tasks
 * Each task entry contains a fully-formed VCALENDAR/VTODO string in the `vtodo` field
 */
export const parseTasksOrgBackup = (data: unknown) => {
  try {
    const taskEntries = ((data as Record<string, unknown>).data as Record<string, unknown>)
      .tasks as Record<string, unknown>[];

    const result: Partial<Task>[] = [];

    for (const entry of taskEntries) {
      const vtodoContent = entry.vtodo as string;
      if (!vtodoContent) continue;

      const parsed = parseIcsFile(vtodoContent);
      if (parsed.length > 0) {
        result.push(parsed[0]);
      }
    }

    return result;
  } catch (error) {
    log.error('Error parsing Tasks.org backup:', error);
    return [];
  }
};

/**
 * Parse a JSON file containing tasks (exported from this app or Tasks.org backup)
 */
export const parseJsonTasksFile = (jsonContent: string): Partial<Task>[] => {
  try {
    const data = JSON.parse(jsonContent);

    // Detect Tasks.org backup format
    if (isTasksOrgBackup(data)) {
      return parseTasksOrgBackup(data);
    }

    // Handle array of tasks directly
    if (Array.isArray(data)) {
      return data.map((task) => ({
        ...task,
        id: generateUUID(), // Always generate new IDs
        synced: false,
      }));
    }

    return [];
  } catch (error) {
    log.error('Error parsing JSON tasks file:', error);
    return [];
  }
};
