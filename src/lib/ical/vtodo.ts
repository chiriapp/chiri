import {
  escapeICalText,
  foldLine,
  formatICalDate,
  formatICalDateOnly,
  parseICalDate,
  parseProperty,
  unescapeICalText,
  unfoldLines,
} from '$lib/ical';
import { loggers } from '$lib/logger';
import { getAllTags } from '$lib/store/tags';
import type { Priority, Reminder, Task, TaskStatus } from '$types';
import { generateUUID } from '$utils/misc';

const log = loggers.iCal;

// Apple epoch: January 1, 2001 00:00:00 GMT in milliseconds since Unix epoch
// Used for X-APPLE-SORT-ORDER which stores seconds since Apple epoch
export const APPLE_EPOCH = 978307200000;

// Convert Unix timestamp (milliseconds) to Apple epoch (seconds)
export const toAppleEpoch = (timestamp: number) => {
  return Math.floor((timestamp - APPLE_EPOCH) / 1000);
};

// Convert Apple epoch (seconds) to Unix timestamp (milliseconds)
export const fromAppleEpoch = (appleSeconds: number) => {
  return appleSeconds * 1000 + APPLE_EPOCH;
};

/**
 * default descriptions used by CalDAV clients that should be filtered out
 * these are placeholder descriptions that apps like Tasks.org and Mozilla Thunderbird
 * insert when no description is provided
 */
const DEFAULT_CALDAV_DESCRIPTIONS = [
  'Default Tasks.org description',
  'Default Mozilla Description',
];

/**
 * check if a description is a default placeholder from a CalDAV client
 * @param description the description to check
 * @returns true if the description should be filtered out
 */
export const isDefaultCalDavDescription = (description: string | undefined | null) => {
  if (!description) return false;
  return DEFAULT_CALDAV_DESCRIPTIONS.includes(description.trim());
};

/**
 * filter out default CalDAV descriptions, returning empty string if it's a default
 * @param description the description to filter
 * @returns the description if not a default, empty string otherwise
 */
export const filterCalDavDescription = (description: string | undefined | null) => {
  if (!description) return '';
  if (isDefaultCalDavDescription(description)) return '';
  return description;
};

// Status mapping: iCalendar VTODO STATUS ↔ TaskStatus
const icalStatusToTaskStatus = (icalStatus: string | undefined): TaskStatus => {
  switch (icalStatus?.toUpperCase()) {
    case 'COMPLETED':
      return 'completed';
    case 'IN-PROCESS':
      return 'in-process';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'needs-action';
  }
};

const taskStatusToIcal = (status: TaskStatus) => {
  switch (status) {
    case 'completed':
      return 'COMPLETED';
    case 'in-process':
      return 'IN-PROCESS';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return 'NEEDS-ACTION';
  }
};

// Priority mapping: iCalendar uses 1-9 (1 = highest, 9 = lowest)
// We map: high = 1, medium = 5, low = 9, none = 0
const priorityToIcal: Record<Priority, number> = {
  high: 1,
  medium: 5,
  low: 9,
  none: 0,
};

const icalToPriority = (priority: number): Priority => {
  if (priority === 0) return 'none';
  if (priority >= 1 && priority <= 4) return 'high';
  if (priority === 5) return 'medium';
  return 'low';
};

const HEX_COLOR_PATTERN = /^[0-9A-F]{6}$/i;

const normalizeTagColor = (value: string) => {
  const normalized = value.trim().replace(/^#/, '').toUpperCase();
  if (!HEX_COLOR_PATTERN.test(normalized)) return undefined;
  return `#${normalized}`;
};

const toIcalHexColor = (value: string) => {
  const normalized = normalizeTagColor(value);
  return normalized ? normalized.slice(1) : undefined;
};

const splitFirstUnescaped = (value: string, separator: string) => {
  let escaped = false;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === separator) {
      return [value.slice(0, i), value.slice(i + 1)];
    }
  }

  return null;
};

const parseTagColorValue = (value: string) => {
  const parts = splitFirstUnescaped(value, '|');
  if (!parts) return null;

  const [rawTagName, rawColor] = parts;
  const tagName = unescapeICalText(rawTagName.trim());
  if (!tagName) return null;

  const color = normalizeTagColor(unescapeICalText(rawColor.trim()));
  if (!color) return null;

  return { tagName, color };
};

export interface ParsedVAlarm {
  action?: string;
  trigger?: Date;
  description?: string;
}

export interface ParsedVTodo {
  uid?: string;
  summary?: string;
  description?: string;
  status?: string;
  percentComplete?: number;
  priority?: number;
  categories?: string[];
  tagColorsByName?: Record<string, string>;
  dtstart?: Date;
  dtstartAllDay?: boolean;
  due?: Date;
  dueAllDay?: boolean;
  completed?: Date;
  created?: Date;
  lastModified?: Date;
  sortOrder?: number;
  isCollapsed?: boolean;
  parentUid?: string;
  alarms?: ParsedVAlarm[];
  url?: string;
  rrule?: string;
  recurrenceId?: Date;
}

/**
 * Parse VALARM content into structured data
 */
const parseVAlarm = (valarmContent: string): ParsedVAlarm => {
  const result: ParsedVAlarm = {};
  const lines = unfoldLines(valarmContent).split('\n');

  for (const line of lines) {
    if (!line.trim() || line.startsWith('BEGIN:') || line.startsWith('END:')) {
      continue;
    }

    const prop = parseProperty(line);
    if (!prop) continue;

    switch (prop.name) {
      case 'ACTION':
        result.action = prop.value.toUpperCase();
        break;
      case 'DESCRIPTION':
        result.description = unescapeICalText(prop.value);
        break;
      case 'TRIGGER':
        // Support both VALUE=DATE-TIME and relative triggers
        if (prop.params.VALUE === 'DATE-TIME') {
          result.trigger = parseICalDate(prop.value);
        } else if (prop.value.startsWith('P') || prop.value.startsWith('-P')) {
          // Relative trigger (e.g., -PT15M = 15 minutes before)
          // For now, we skip relative triggers since we use absolute times
        } else {
          // Try parsing as absolute time
          result.trigger = parseICalDate(prop.value);
        }
        break;
    }
  }

  return result;
};

/**
 * Extract VALARM blocks from VTODO content
 */
const extractVAlarms = (vtodoContent: string) => {
  const alarms: string[] = [];
  const content = unfoldLines(vtodoContent);
  const lines = content.split('\n');

  let inAlarm = false;
  let currentAlarm: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim().toUpperCase();

    if (trimmed === 'BEGIN:VALARM') {
      inAlarm = true;
      currentAlarm = [];
    } else if (trimmed === 'END:VALARM') {
      if (inAlarm) {
        alarms.push(currentAlarm.join('\n'));
        currentAlarm = [];
      }
      inAlarm = false;
    } else if (inAlarm) {
      currentAlarm.push(line);
    }
  }

  return alarms;
};

/**
 * Parse VTODO content into structured data
 */
export const parseVTodo = (vtodoContent: string): ParsedVTodo => {
  const result: ParsedVTodo = {};
  const lines = unfoldLines(vtodoContent).split('\n');

  // Extract and parse VALARMs first
  const alarmContents = extractVAlarms(vtodoContent);
  if (alarmContents.length > 0) {
    result.alarms = alarmContents.map(parseVAlarm).filter((a) => a.trigger);
  }

  for (const line of lines) {
    if (!line.trim() || line.startsWith('BEGIN:') || line.startsWith('END:')) {
      continue;
    }

    const prop = parseProperty(line);
    if (!prop) continue;

    switch (prop.name) {
      case 'UID':
        result.uid = prop.value;
        break;
      case 'SUMMARY':
        result.summary = unescapeICalText(prop.value);
        break;
      case 'DESCRIPTION':
        result.description = unescapeICalText(prop.value);
        break;
      case 'STATUS':
        result.status = prop.value.toUpperCase();
        break;
      case 'PERCENT-COMPLETE': {
        const pct = parseInt(prop.value, 10);
        if (!Number.isNaN(pct) && pct >= 0 && pct <= 100) {
          result.percentComplete = pct;
        }
        break;
      }
      case 'PRIORITY':
        result.priority = parseInt(prop.value, 10) || 0;
        break;
      case 'CATEGORIES':
        // Categories can be comma-separated
        result.categories = prop.value.split(',').map((c) => unescapeICalText(c.trim()));
        break;
      case 'X-TASKS-TAG-COLOR': {
        const parsedTagColor = parseTagColorValue(prop.value);
        if (parsedTagColor) {
          if (!result.tagColorsByName) {
            result.tagColorsByName = {};
          }
          result.tagColorsByName[parsedTagColor.tagName.toLowerCase()] = parsedTagColor.color;
        }
        break;
      }
      case 'DTSTART':
        result.dtstart = parseICalDate(prop.value);
        // Check if it's an all-day date (VALUE=DATE parameter)
        result.dtstartAllDay = prop.params.VALUE === 'DATE';
        break;
      case 'DUE':
        result.due = parseICalDate(prop.value);
        // Check if it's an all-day date (VALUE=DATE parameter)
        result.dueAllDay = prop.params.VALUE === 'DATE';
        break;
      case 'COMPLETED':
        result.completed = parseICalDate(prop.value);
        break;
      case 'CREATED':
        result.created = parseICalDate(prop.value);
        break;
      case 'LAST-MODIFIED':
        result.lastModified = parseICalDate(prop.value);
        break;
      case 'X-APPLE-SORT-ORDER':
        result.sortOrder = parseInt(prop.value, 10);
        break;
      case 'RELATED-TO': {
        // Only use PARENT relationship
        const relType = prop.params.RELTYPE;
        if (!relType || relType.toUpperCase() === 'PARENT') {
          result.parentUid = prop.value;
        }
        break;
      }
      case 'URL':
        result.url = prop.value;
        break;
      case 'RRULE':
        // Strip leading "RRULE:" prefix if present (some servers include it in the value)
        result.rrule = prop.value.replace(/^RRULE:/i, '');
        break;
      case 'RECURRENCE-ID':
        result.recurrenceId = parseICalDate(prop.value);
        break;
    }
  }

  return result;
};

/**
 * Extract VTODO blocks from iCalendar content.
 *
 * When a VCALENDAR contains multiple VTODOs with the same UID (the two-VTODO
 * format used for completed recurring instances: master + RECURRENCE-ID override),
 * we return only the master (the one with RRULE / without RECURRENCE-ID) so the
 * app always works with the live series, not a completed snapshot.
 */
export const extractVTodos = (icalContent: string) => {
  const all: string[] = [];
  const content = unfoldLines(icalContent);
  const lines = content.split('\n');

  let inVTodo = false;
  let currentVTodo: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim().toUpperCase();

    if (trimmed === 'BEGIN:VTODO') {
      inVTodo = true;
      currentVTodo = [];
    } else if (trimmed === 'END:VTODO') {
      if (inVTodo) {
        all.push(currentVTodo.join('\n'));
        currentVTodo = [];
      }
      inVTodo = false;
    } else if (inVTodo) {
      currentVTodo.push(line);
    }
  }

  if (all.length <= 1) return all;

  // Multiple VTODOs: prefer the master (has RRULE, no RECURRENCE-ID).
  // If none qualifies fall back to returning all of them.
  const masters = all.filter((block) => {
    const upper = block.toUpperCase();
    return upper.includes('RRULE:') && !upper.includes('RECURRENCE-ID:');
  });
  return masters.length > 0 ? masters : all;
};

/**
 * Generate a VALARM component as string
 */
const generateVAlarm = (reminder: Reminder) => {
  const lines: string[] = [];

  lines.push('BEGIN:VALARM');
  lines.push('ACTION:DISPLAY');
  lines.push(`TRIGGER;VALUE=DATE-TIME:${formatICalDate(new Date(reminder.trigger))}`);
  lines.push('END:VALARM');

  return lines.join('\r\n');
};

/**
 * Generate a VTODO component as string
 */
export const generateVTodo = (task: Task) => {
  const lines: string[] = [];

  lines.push('BEGIN:VTODO');
  lines.push(`UID:${task.uid}`);
  lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
  lines.push(`CREATED:${formatICalDate(new Date(task.createdAt))}`);
  lines.push(`LAST-MODIFIED:${formatICalDate(new Date(task.modifiedAt))}`);
  lines.push(`SUMMARY:${escapeICalText(task.title)}`);

  if (task.description) {
    lines.push(`DESCRIPTION:${escapeICalText(task.description)}`);
  }

  lines.push(
    `STATUS:${taskStatusToIcal(task.status ?? (task.completed ? 'completed' : 'needs-action'))}`,
  );

  if (task.status === 'completed' && task.completedAt) {
    lines.push(`COMPLETED:${formatICalDate(new Date(task.completedAt))}`);
  }

  if (task.percentComplete !== undefined && task.percentComplete !== null) {
    lines.push(`PERCENT-COMPLETE:${task.percentComplete}`);
  }

  lines.push(`PRIORITY:${priorityToIcal[task.priority]}`);

  if (task.startDate) {
    if (task.startDateAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatICalDateOnly(new Date(task.startDate))}`);
    } else {
      lines.push(`DTSTART:${formatICalDate(new Date(task.startDate))}`);
    }
  }

  if (task.dueDate) {
    if (task.dueDateAllDay) {
      lines.push(`DUE;VALUE=DATE:${formatICalDateOnly(new Date(task.dueDate))}`);
    } else {
      lines.push(`DUE:${formatICalDate(new Date(task.dueDate))}`);
    }
  }

  lines.push(`X-APPLE-SORT-ORDER:${task.sortOrder}`);

  // Tags as CATEGORIES
  if (task.tags && task.tags.length > 0) {
    const tags = getAllTags();
    const taskTags = task.tags
      .map((tagId) => tags.find((t) => t.id === tagId)?.name)
      .filter((name): name is string => Boolean(name));

    if (taskTags.length > 0) {
      const escaped = taskTags.map((n) => escapeICalText(n));
      lines.push(`CATEGORIES:${escaped.join(',')}`);

      for (const tagName of taskTags) {
        const tag = tags.find((t) => t.name === tagName);
        if (!tag?.color) continue;

        const hexColor = toIcalHexColor(tag.color);
        if (!hexColor) continue;

        lines.push(`X-TASKS-TAG-COLOR:${escapeICalText(tagName)}|${hexColor}`);
      }
    }
  }

  // Parent relationship
  if (task.parentUid) {
    lines.push(`RELATED-TO;RELTYPE=PARENT:${task.parentUid}`);
  }

  // URL (RFC 7986)
  if (task.url) {
    lines.push(`URL:${escapeICalText(task.url)}`);
  }

  // Recurrence rule (RFC 5545)
  if (task.rrule) {
    lines.push(`RRULE:${task.rrule}`);
  }

  // Reminders as VALARMs
  if (task.reminders && task.reminders.length > 0) {
    for (const reminder of task.reminders) {
      lines.push(generateVAlarm(reminder));
    }
  }

  lines.push('END:VTODO');

  // Fold long lines
  return lines.map(foldLine).join('\r\n');
};

/**
 * Generate a complete VCALENDAR with VTODOs
 */
export const generateVCalendar = (vtodos: string[]) => {
  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Chiri//EN');

  for (const vtodo of vtodos) {
    lines.push(vtodo);
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
};

/**
 * Shared helper: convert a ParsedVTodo into a Task or Partial<Task>.
 * Used by both vtodoToTask (full Task) and parseIcsFile (Partial<Task>).
 */
export const parsedVTodoToTask = (
  parsed: ParsedVTodo,
  overrides: {
    accountId?: string;
    calendarId?: string;
    href?: string;
    etag?: string;
    synced: boolean;
  },
): Task | Partial<Task> => {
  let reminders: Reminder[] | undefined;
  if (parsed.alarms && parsed.alarms.length > 0) {
    reminders = parsed.alarms
      .filter((a) => a.trigger)
      .map((a) => ({
        id: generateUUID(),
        trigger: a.trigger!,
      }));
  }

  // Calculate sort order
  const createdDate = parsed.created ?? new Date();
  let sortOrder: number;
  if (parsed.sortOrder !== undefined && !Number.isNaN(parsed.sortOrder)) {
    sortOrder = parsed.sortOrder;
  } else {
    sortOrder = toAppleEpoch(createdDate.getTime());
  }

  const taskStatus = icalStatusToTaskStatus(parsed.status);

  return {
    id: generateUUID(),
    uid: parsed.uid ?? generateUUID(),
    etag: overrides.etag,
    href: overrides.href,
    title: parsed.summary ?? 'Untitled Task',
    description: filterCalDavDescription(parsed.description),
    status: taskStatus,
    completed: taskStatus === 'completed',
    completedAt: parsed.completed,
    percentComplete: parsed.percentComplete,
    priority: icalToPriority(parsed.priority ?? 0),
    categoryId: parsed.categories?.join(',') ?? undefined,
    tagColorsByName: parsed.tagColorsByName,
    startDate: parsed.dtstart,
    startDateAllDay: parsed.dtstartAllDay,
    dueDate: parsed.due,
    dueDateAllDay: parsed.dueAllDay,
    createdAt: createdDate,
    modifiedAt: parsed.lastModified ?? new Date(),
    parentUid: parsed.parentUid,
    isCollapsed: parsed.isCollapsed ?? false,
    sortOrder,
    url: parsed.url,
    rrule: parsed.rrule,
    accountId: overrides.accountId,
    calendarId: overrides.calendarId,
    synced: overrides.synced,
    reminders,
  };
};

/**
 * Convert a Task to iCalendar VTODO format
 */
export const taskToVTodo = (task: Task) => {
  const vtodo = generateVTodo(task);
  return generateVCalendar([vtodo]);
};

/**
 * Parse iCalendar string and convert to Task
 */
export const vtodoToTask = (
  icalString: string,
  accountId: string,
  calendarId: string,
  href?: string,
  etag?: string,
) => {
  try {
    const vtodos = extractVTodos(icalString);
    if (vtodos.length === 0) return null;

    const parsed = parseVTodo(vtodos[0]);

    return parsedVTodoToTask(parsed, { accountId, calendarId, href, etag, synced: true }) as Task;
  } catch (error) {
    log.error('Error parsing VTODO:', error);
    return null;
  }
};

/**
 * Generate a unique iCalendar UID
 */
export const generateICalUid = () => {
  return `${generateUUID()}@chiri`;
};
