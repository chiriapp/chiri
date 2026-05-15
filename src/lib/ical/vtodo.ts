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

type ParsedProperty = NonNullable<ReturnType<typeof parseProperty>>;

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
const DEFAULT_VALARM_DESCRIPTION = 'Default Chiri description';

const DEFAULT_CALDAV_DESCRIPTIONS = [
  DEFAULT_VALARM_DESCRIPTION,
  'Default Tasks.org description', // Tasks.org
  'Default Mozilla Description', // Mozilla Thunderbird
  'Event reminder', // Fruux (when setting due date)
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

const parseICalDuration = (value: string): number | null => {
  const match = value.match(
    /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );
  if (!match) return null;
  const sign = match[1] === '-' ? -1 : 1;
  const weeks = parseInt(match[2] ?? '0', 10);
  const days = parseInt(match[3] ?? '0', 10);
  const hours = parseInt(match[4] ?? '0', 10);
  const minutes = parseInt(match[5] ?? '0', 10);
  const seconds = parseInt(match[6] ?? '0', 10);
  const totalSeconds =
    weeks * 7 * 24 * 3600 + days * 24 * 3600 + hours * 3600 + minutes * 60 + seconds;
  return sign * totalSeconds * 1000;
};

/**
 * Format millisecond offset as an RFC 5545 duration string.
 * Examples: -900000 → "-PT15M", 3600000 → "PT1H"
 */
const formatICalDuration = (offsetMs: number): string => {
  const sign = offsetMs < 0 ? '-' : '';
  const totalSeconds = Math.floor(Math.abs(offsetMs) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const remSeconds = totalSeconds % 86400;
  const hours = Math.floor(remSeconds / 3600);
  const minutes = Math.floor((remSeconds % 3600) / 60);
  const seconds = remSeconds % 60;

  let result = `${sign}P`;
  if (days > 0) result += `${days}D`;
  const timePart =
    (hours > 0 ? `${hours}H` : '') +
    (minutes > 0 ? `${minutes}M` : '') +
    (seconds > 0 ? `${seconds}S` : '');
  if (timePart) result += `T${timePart}`;
  if (result === `${sign}P`) result += 'T0S'; // zero duration edge case
  return result;
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

const splitAllUnescaped = (value: string, separator: string) => {
  const parts: string[] = [];
  let escaped = false;
  let start = 0;

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
      parts.push(value.slice(start, i));
      start = i + 1;
    }
  }

  parts.push(value.slice(start));
  return parts;
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
  relativeOffset?: number; // milliseconds; present when trigger was a relative duration
  relatedTo?: 'start' | 'end'; // RELATED=START or RELATED=END (defaults to START per RFC 5545)
  repeat?: number; // RFC 5545 REPEAT count (additional repetitions)
  duration?: number; // RFC 5545 DURATION between repetitions (milliseconds)
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
        if (prop.params.VALUE === 'DATE-TIME') {
          result.trigger = parseICalDate(prop.value);
        } else if (
          prop.value.startsWith('P') ||
          prop.value.startsWith('-P') ||
          prop.value.startsWith('+P')
        ) {
          // Relative duration trigger (e.g. -PT15M, PT1H, RELATED=END:-PT15M)
          const offsetMs = parseICalDuration(prop.value);
          if (offsetMs !== null) {
            result.relativeOffset = offsetMs;
            result.relatedTo = prop.params.RELATED?.toUpperCase() === 'END' ? 'end' : 'start';
          }
        } else {
          result.trigger = parseICalDate(prop.value);
        }
        break;
      case 'REPEAT': {
        const repeatCount = parseInt(prop.value, 10);
        if (!Number.isNaN(repeatCount) && repeatCount > 0) {
          result.repeat = repeatCount;
        }
        break;
      }
      case 'DURATION': {
        const durationMs = parseICalDuration(prop.value);
        if (durationMs !== null) {
          result.duration = durationMs;
        }
        break;
      }
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

const applyVTodoProp = (result: ParsedVTodo, prop: ParsedProperty) => {
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
      result.categories = splitAllUnescaped(prop.value, ',').map((c) => unescapeICalText(c.trim()));
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
      result.dtstartAllDay = prop.params.VALUE === 'DATE';
      break;
    case 'DUE':
      result.due = parseICalDate(prop.value);
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
      result.rrule = prop.value.replace(/^RRULE:/i, '');
      break;
    case 'RECURRENCE-ID':
      result.recurrenceId = parseICalDate(prop.value);
      break;
  }
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

  let inSubComponent = false;

  for (const line of lines) {
    if (!line.trim()) continue;

    const trimmedUpper = line.trim().toUpperCase();

    // Track nested components (VALARM, etc.) so their properties don't leak into VTODO
    if (trimmedUpper.startsWith('BEGIN:') && trimmedUpper !== 'BEGIN:VTODO') {
      inSubComponent = true;
      continue;
    }
    if (trimmedUpper.startsWith('END:') && trimmedUpper !== 'END:VTODO') {
      inSubComponent = false;
      continue;
    }
    if (inSubComponent || trimmedUpper.startsWith('BEGIN:') || trimmedUpper.startsWith('END:')) {
      continue;
    }

    const prop = parseProperty(line);
    if (prop) applyVTodoProp(result, prop);
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
  lines.push(`DESCRIPTION:${DEFAULT_VALARM_DESCRIPTION}`); // required by RFC 5545 §3.6.6 for ACTION:DISPLAY

  if (reminder.relativeOffset !== undefined) {
    const related = reminder.relatedTo === 'end' ? 'END' : 'START';
    lines.push(`TRIGGER;RELATED=${related}:${formatICalDuration(reminder.relativeOffset)}`);
  } else {
    lines.push(`TRIGGER;VALUE=DATE-TIME:${formatICalDate(new Date(reminder.trigger))}`);
  }

  if (reminder.repeat !== undefined && reminder.duration !== undefined) {
    lines.push(`REPEAT:${reminder.repeat}`);
    lines.push(`DURATION:${formatICalDuration(reminder.duration)}`);
  }

  lines.push('END:VALARM');

  return lines.join('\r\n');
};

/**
 * Generate date property line (DTSTART or DUE)
 */
const generateDateLine = (property: 'DTSTART' | 'DUE', date: Date, allDay: boolean): string => {
  if (allDay) {
    return `${property};VALUE=DATE:${formatICalDateOnly(date)}`;
  }
  return `${property}:${formatICalDate(date)}`;
};

/**
 * Generate CATEGORIES and tag color lines
 */
const generateTagLines = (taskTagIds: string[]): string[] => {
  const lines: string[] = [];
  const tags = getAllTags();
  const taskTags = taskTagIds
    .map((tagId) => tags.find((t) => t.id === tagId)?.name)
    .filter((name): name is string => Boolean(name));

  if (taskTags.length === 0) return lines;

  const escaped = taskTags.map((n) => escapeICalText(n));
  lines.push(`CATEGORIES:${escaped.join(',')}`);

  for (const tagName of taskTags) {
    const tag = tags.find((t) => t.name === tagName);
    if (!tag?.color) continue;

    const hexColor = toIcalHexColor(tag.color);
    if (!hexColor) continue;

    lines.push(`X-TASKS-TAG-COLOR:${escapeICalText(tagName)}|${hexColor}`);
  }

  return lines;
};

/**
 * Generate a VTODO component as string
 */
export const generateVTodo = (task: Task) => {
  const lines: string[] = [];

  // Core properties
  lines.push('BEGIN:VTODO');
  lines.push(`UID:${task.uid}`);
  lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
  lines.push(`CREATED:${formatICalDate(new Date(task.createdAt))}`);
  lines.push(`LAST-MODIFIED:${formatICalDate(new Date(task.modifiedAt))}`);
  lines.push(`SUMMARY:${escapeICalText(task.title)}`);

  if (task.description) {
    lines.push(`DESCRIPTION:${escapeICalText(task.description)}`);
  }

  // Status and completion
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

  // Dates
  if (task.startDate) {
    lines.push(generateDateLine('DTSTART', new Date(task.startDate), !!task.startDateAllDay));
  }

  if (task.dueDate) {
    lines.push(generateDateLine('DUE', new Date(task.dueDate), !!task.dueDateAllDay));
  }

  lines.push(`X-APPLE-SORT-ORDER:${task.sortOrder}`);

  // Tags as CATEGORIES
  if (task.tags && task.tags.length > 0) {
    lines.push(...generateTagLines(task.tags));
  }

  // Optional properties
  if (task.parentUid) {
    lines.push(`RELATED-TO;RELTYPE=PARENT:${task.parentUid}`);
  }

  if (task.url) {
    lines.push(`URL:${escapeICalText(task.url)}`);
  }

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
        relativeOffset: a.relativeOffset,
        relatedTo: a.relatedTo,
        repeat: a.repeat,
        duration: a.duration,
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
