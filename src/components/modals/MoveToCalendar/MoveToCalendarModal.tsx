import AlertTriangle from 'lucide-react/icons/triangle-alert';
import { useMemo } from 'react';
import { CalendarPicker } from '$components/CalendarPicker';
import { ModalWrapper } from '$components/ModalWrapper';
import type { Account } from '$types/account';
import type { Task } from '$types/task/model';

interface MoveToCalendarModalProps {
  task?: Task;
  accounts: Account[];
  onMove: (calendarId: string) => void;
  onClose: () => void;
  currentCalendarIds?: string[];
  title?: string;
  description?: string;
  zIndex?: 'z-50' | 'z-60' | 'z-70';
}

export const MoveToCalendarModal = ({
  task,
  accounts,
  onMove,
  onClose,
  currentCalendarIds,
  title = 'Move to Calendar',
  description,
  zIndex = 'z-60',
}: MoveToCalendarModalProps) => {
  const excludedCalendarIds = useMemo(() => {
    const ids = currentCalendarIds ?? (task ? [task.calendarId] : []);
    return ids.length === 1 ? new Set(ids) : new Set<string>();
  }, [currentCalendarIds, task]);

  return (
    <ModalWrapper
      onClose={onClose}
      title={title}
      description={description}
      zIndex={zIndex}
      className="max-w-sm"
      contentPadding={false}
    >
      {task?.parentUid && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-semantic-warning/30 bg-semantic-warning/10 px-3 py-2 text-sm text-surface-700 dark:text-surface-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-semantic-warning" />
          <span>Changing the calendar will convert this subtask to a regular task.</span>
        </div>
      )}

      <CalendarPicker
        accounts={accounts}
        excludedCalendarIds={[...excludedCalendarIds]}
        onSelect={(_, calendarId) => {
          onMove(calendarId);
          onClose();
        }}
        emptyMessage="No other calendars available."
      />
    </ModalWrapper>
  );
};
