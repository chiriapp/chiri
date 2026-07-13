import { useAccountCommands } from '$hooks/commands/useAccountCommands';
import { useCalendarCommands } from '$hooks/commands/useCalendarCommands';
import { useTaskCommands } from '$hooks/commands/useTaskCommands';
import { useViewCommands } from '$hooks/commands/useViewCommands';
import type { AppModals } from '$types/controller';

interface UseAppCommandsOptions {
  modals: AppModals;
  onSyncCalendar?: (calendarId: string) => void;
}

export const useAppCommands = ({ modals, onSyncCalendar }: UseAppCommandsOptions) => {
  const accountCommands = useAccountCommands({ modals });
  const calendarCommands = useCalendarCommands({ modals, onSyncCalendar });
  const taskCommands = useTaskCommands();
  const viewCommands = useViewCommands({ modals });

  return {
    ...accountCommands,
    ...calendarCommands,
    ...taskCommands,
    ...viewCommands,
  };
};

export type AppCommands = ReturnType<typeof useAppCommands>;
