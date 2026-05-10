import BellRing from 'lucide-react/icons/bell-ring';
import X from 'lucide-react/icons/x';
import { useFocusTrap } from '$hooks/ui/useFocusTrap';
import { useModalEscapeKey } from '$hooks/ui/useModalEscapeKey';
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
  const focusTrapRef = useFocusTrap();
  useModalEscapeKey(onClose);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop
    // biome-ignore lint/a11y/useKeyWithClickEvents: Modal backdrop
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-xs animate-scale-in"
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
            {editing ? 'Edit Default Reminder' : 'Add Default Reminder'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
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
      </div>
    </div>
  );
};
