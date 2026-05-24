import BellRing from 'lucide-react/icons/bell-ring';
import { ModalWrapper } from '$components/ModalWrapper';
import type { DefaultReminderOffset } from '$types';

interface TaskDefaultsReminderPickerModalProps {
  available: { value: DefaultReminderOffset; label: string }[];
  onSelect: (offset: DefaultReminderOffset) => void;
  onClose: () => void;
  editing?: DefaultReminderOffset;
}

export const TaskDefaultsReminderPickerModal = ({
  available,
  onSelect,
  onClose,
  editing,
}: TaskDefaultsReminderPickerModalProps) => {
  return (
    <ModalWrapper
      onClose={onClose}
      title={editing ? 'Edit Default Reminder' : 'Add Default Reminder'}
      zIndex="z-70"
      className="max-w-xs"
      contentPadding={false}
    >
      <div className="py-2 max-h-112 overflow-y-auto">
        {available.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onSelect(opt.value);
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors outline-hidden focus-visible:bg-surface-50 dark:focus-visible:bg-surface-700 ${
              opt.value === editing
                ? 'bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-surface-200 font-medium'
                : 'text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'
            }`}
          >
            <BellRing className="w-4 h-4 text-surface-400 shrink-0" />
            {opt.label}
          </button>
        ))}
      </div>
    </ModalWrapper>
  );
};
