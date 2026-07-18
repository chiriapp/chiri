import Repeat from 'lucide-react/icons/repeat';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import { useState } from 'react';
import { RepeatModal } from '$components/modals/RepeatModal/RepeatModal';
import { useSettingsStore } from '$context/settingsContext';
import { defaultState } from '$context/settingsDefaults';
import { rruleToText } from '$utils/recurrence';

export const TaskDefaultsRecurrenceSection = () => {
  const { defaultRrule, setDefaultRrule, defaultRepeatFrom, setDefaultRepeatFrom, dateFormat } =
    useSettingsStore();
  const [showRepeatModal, setShowRepeatModal] = useState(false);

  const handleReset = () => {
    setDefaultRrule(defaultState.defaultRrule);
    setDefaultRepeatFrom(defaultState.defaultRepeatFrom);
  };

  const hasChanged =
    defaultRrule !== defaultState.defaultRrule ||
    defaultRepeatFrom !== defaultState.defaultRepeatFrom;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-surface-700 dark:text-surface-300">Recurrence</h4>
        {hasChanged && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-surface-500 text-xs outline-hidden transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="p-4">
          <button
            type="button"
            onClick={() => setShowRepeatModal(true)}
            className="flex w-full items-center gap-2 rounded-lg bg-surface-100 px-3 py-2 outline-hidden transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:bg-surface-700 dark:hover:bg-surface-600"
          >
            <Repeat className="h-4 w-4 shrink-0 text-surface-400" />
            <span className="flex-1 text-left text-sm text-surface-700 dark:text-surface-300">
              {defaultRrule
                ? rruleToText(defaultRrule, defaultRepeatFrom, dateFormat)
                : 'Does not repeat'}
            </span>
          </button>
        </div>
      </div>

      {showRepeatModal && (
        <RepeatModal
          isOpen={showRepeatModal}
          onClose={() => setShowRepeatModal(false)}
          rrule={defaultRrule}
          repeatFrom={defaultRepeatFrom}
          dueDate={undefined}
          onSave={(rrule, repeatFrom) => {
            setDefaultRrule(rrule);
            setDefaultRepeatFrom(repeatFrom);
          }}
        />
      )}
    </div>
  );
};
