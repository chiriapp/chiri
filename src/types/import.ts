import type { Account, Calendar, Task } from '$types';

export type ImportStep = 'upload' | 'destination' | 'review';

export interface ParsedTaskWithStatus extends Partial<Task> {
  importStatus?: 'pending' | 'importing' | 'success' | 'error';
  importError?: string;
}

export interface ImportState {
  step: ImportStep;
  fileName: string;
  parsedTasks: ParsedTaskWithStatus[];
  selectedAccountId: string;
  selectedCalendarId: string;
  error: string;
  parseErrors: string[];
  isImporting: boolean;
  importProgress: number;
  importSuccess: boolean;
}

export interface FileUploadStepProps {
  fileName: string;
  isDraggingOver: boolean;
  onFileSelect: (file: File) => Promise<void>;
  onReset: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  error: string;
  parseErrors: string[];
}

export interface DestinationStepProps {
  accounts: Account[];
  selectedAccountId: string;
  selectedCalendarId: string;
  onSelect: (accountId: string, calendarId: string) => void;
}

export interface ReviewStepProps {
  tasks: ParsedTaskWithStatus[];
  selectedCalendar: Calendar | undefined;
  isImporting: boolean;
  importProgress: number;
}
