import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';
import { DatePickerModal } from '$components/modals/DatePickerModal';
import { RepeatRuleEditor } from '$components/modals/RepeatModal/RepeatRuleEditor';
import { useSettingsStore } from '$context/settingsContext';
import { useRepeatDraft } from '$hooks/ui/useRepeatDraft';
import { parseDateInputValue } from '$utils/date';

interface RepeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  rrule: string | undefined;
  repeatFrom: number;
  dueDate?: Date;
  initialCustom?: boolean;
  onSave: (rrule: string | undefined, repeatFrom: number) => void;
}

export const RepeatModal = ({
  isOpen,
  onClose,
  rrule,
  repeatFrom,
  dueDate,
  initialCustom = false,
  onSave,
}: RepeatModalProps) => {
  const { dateFormat, startOfWeek, workingDays } = useSettingsStore();
  const draft = useRepeatDraft({
    isOpen,
    rrule,
    repeatFrom,
    dueDate,
    initialCustom,
    startOfWeek,
    workingDays,
  });

  if (!isOpen) return null;

  const handleDone = () => {
    onSave(draft.draftRrule, draft.localRepeatFrom);
    onClose();
  };

  return (
    <>
      <ModalWrapper
        isOpen={isOpen}
        onClose={onClose}
        title="Repeat"
        className="max-w-140"
        zIndex="z-60"
        contentPadding={false}
        contentOverflow="auto"
        footerLeft={
          rrule ? (
            <ModalButton
              variant="secondary"
              onClick={() => {
                onSave(undefined, draft.localRepeatFrom);
                onClose();
              }}
              className="text-surface-500 hover:bg-semantic-error/10 hover:text-semantic-error"
            >
              Clear
            </ModalButton>
          ) : null
        }
        footer={
          <>
            <ModalButton variant="secondary" onClick={onClose}>
              Cancel
            </ModalButton>
            <ModalButton onClick={handleDone} disabled={draft.isActionDisabled}>
              {draft.actionLabel}
            </ModalButton>
          </>
        }
      >
        <RepeatRuleEditor
          draft={draft}
          dueDate={dueDate}
          dateFormat={dateFormat}
          onOpenUntilPicker={() => draft.setShowUntilPicker(true)}
        />
      </ModalWrapper>

      {draft.showUntilPicker && (
        <DatePickerModal
          isOpen
          onClose={() => draft.setShowUntilPicker(false)}
          value={parseDateInputValue(draft.ui.until)}
          onChange={(date) => {
            if (date) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              draft.update({ until: `${year}-${month}-${day}` });
            } else {
              draft.update({ until: '' });
            }
            draft.setShowUntilPicker(false);
          }}
          title="End Date"
          hideTimeControls
        />
      )}
    </>
  );
};
