import { loggers } from '$lib/logger';
import type { Task } from '$types';
import type { ParsedTaskWithStatus } from '$types/import';
import { generateUUID } from '$utils/misc';
import { extractVTodos, parsedVTodoToTask, parseVTodo } from './vtodo';

const log = loggers.iCal;

/** materialize a parsed import task without dropping fields that are not shown in the review UI */
export const createImportedTask = (
  partialTask: ParsedTaskWithStatus,
  uidMap: Map<string, string>,
  accountId: string,
  calendarId: string,
): Task => {
  const {
    importStatus: _importStatus,
    importError: _importError,
    id: _id,
    uid: originalUid,
    accountId: _accountId,
    calendarId: _calendarId,
    synced: _synced,
    parentUid: originalParentUid,
    modifiedAt: _modifiedAt,
    ...imported
  } = partialTask;
  const uid = originalUid ? uidMap.get(originalUid) : undefined;
  const parentUid = originalParentUid ? uidMap.get(originalParentUid) : undefined;

  return {
    ...imported,
    id: generateUUID(),
    uid: uid || `${generateUUID()}@chiri`,
    title: partialTask.title || 'Untitled Task',
    description: partialTask.description || '',
    status: partialTask.status || 'needs-action',
    completed: partialTask.completed || false,
    priority: partialTask.priority || 'none',
    createdAt: partialTask.createdAt || new Date(),
    modifiedAt: new Date(),
    parentUid,
    sortOrder: partialTask.sortOrder ?? Date.now(),
    accountId,
    calendarId,
    synced: false,
  };
};

/**
 * parse an ICS file and extract all tasks (VTODOs)
 * returns parsed tasks without accountId/calendarId - caller must assign them
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
 * detect whether a parsed JSON object is a Tasks.org backup file
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
 * parse a Tasks.org backup JSON file and extract all tasks
 * each task entry contains a fully-formed VCALENDAR/VTODO string in the `vtodo` field
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
 * parse a JSON file containing tasks (exported from this app or Tasks.org backup)
 */
export const parseJsonTasksFile = (jsonContent: string): Partial<Task>[] => {
  try {
    const data = JSON.parse(jsonContent);

    // detect Tasks.org backup format
    if (isTasksOrgBackup(data)) {
      return parseTasksOrgBackup(data);
    }

    // handle array of tasks directly
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
