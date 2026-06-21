import type { ExportFormat } from '$types';

/**
 * export format options with descriptions and file extensions
 */
export const EXPORT_FORMATS: Array<{
  id: ExportFormat;
  label: string;
  description: string;
  ext: string;
}> = [
  {
    id: 'ics',
    label: 'iCalendar (.ics)',
    description: 'Universal calendar format, compatible with most apps',
    ext: 'ics',
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'Complete data export for backup or reimport',
    ext: 'json',
  },
  {
    id: 'markdown',
    label: 'Markdown',
    description: 'Readable checklist format for notes and wikis',
    ext: 'md',
  },
  {
    id: 'csv',
    label: 'CSV',
    description: 'Spreadsheet-compatible format',
    ext: 'csv',
  },
];
