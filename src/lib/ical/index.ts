/**
 * Format a Date as iCalendar datetime (UTC)
 * Format: YYYYMMDDTHHMMSSZ
 */
export const formatICalDate = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
};

/**
 * Format a Date as iCalendar date (no time component)
 * Format: YYYYMMDD (VALUE=DATE)
 */
export const formatICalDateOnly = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  // Use local date parts for all-day dates
  return date.getFullYear().toString() + pad(date.getMonth() + 1) + pad(date.getDate());
};

/**
 * Parse an iCalendar datetime string to Date
 * Supports: YYYYMMDDTHHMMSSZ, YYYYMMDDTHHMMSS, YYYYMMDD
 */
export const parseICalDate = (value: string) => {
  if (!value) return undefined;

  // Remove any parameters before the value (e.g., TZID=...)
  const cleanValue = value.trim();

  // UTC format: 20231225T120000Z
  if (cleanValue.endsWith('Z')) {
    const match = cleanValue.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      return new Date(
        Date.UTC(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          parseInt(hour, 10),
          parseInt(minute, 10),
          parseInt(second, 10),
        ),
      );
    }
  }

  // Local datetime: 20231225T120000
  const dtMatch = cleanValue.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (dtMatch) {
    const [, year, month, day, hour, minute, second] = dtMatch;
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10),
    );
  }

  // Date only: 20231225
  const dateMatch = cleanValue.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }

  return undefined;
};

/**
 * Escape text for iCalendar format
 * Escapes: backslash, semicolon, comma, newline
 */
export const escapeICalText = (text: string) => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

/**
 * Unescape iCalendar text
 */
export const unescapeICalText = (text: string) => {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
};

/**
 * Fold long lines according to RFC 5545 (max 75 octets per line)
 */
export const foldLine = (line: string) => {
  const maxLength = 75;
  if (line.length <= maxLength) return line;

  const lines: string[] = [];
  let remaining = line;

  // First line can be up to 75 chars
  lines.push(remaining.slice(0, maxLength));
  remaining = remaining.slice(maxLength);

  // Continuation lines start with space and can have 74 more chars
  while (remaining.length > 0) {
    lines.push(` ${remaining.slice(0, maxLength - 1)}`);
    remaining = remaining.slice(maxLength - 1);
  }

  return lines.join('\r\n');
};

/**
 * Unfold iCalendar content lines (join lines that start with space/tab)
 */
export const unfoldLines = (content: string) => {
  // Normalize line endings
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '');
};

export interface ICalProperty {
  name: string;
  params: Record<string, string>;
  value: string;
}

/**
 * Parse a single iCalendar property line
 * Format: NAME;PARAM=value:VALUE or NAME:VALUE
 */
export const parseProperty = (line: string): ICalProperty | null => {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return null;

  const header = line.slice(0, colonIndex);
  const value = line.slice(colonIndex + 1);

  // Parse name and parameters
  const parts = header.split(';');
  const name = parts[0].toUpperCase();
  const params: Record<string, string> = {};

  for (let i = 1; i < parts.length; i++) {
    const paramPart = parts[i];
    const eqIndex = paramPart.indexOf('=');
    if (eqIndex !== -1) {
      const paramName = paramPart.slice(0, eqIndex).toUpperCase();
      let paramValue = paramPart.slice(eqIndex + 1);
      // Remove quotes if present
      if (paramValue.startsWith('"') && paramValue.endsWith('"')) {
        paramValue = paramValue.slice(1, -1);
      }
      params[paramName] = paramValue;
    }
  }

  return { name, params, value };
};
