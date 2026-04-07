import { useState } from 'react';
import { ComposedInput } from '$components/ComposedInput';
import { ModalButton } from '$components/ModalButton';
import { ModalWrapper } from '$components/ModalWrapper';

interface SubtaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string) => void;
}

export const SubtaskModal = ({ isOpen, onClose, onAdd }: SubtaskModalProps) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim());
      setTitle('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const formEvent = new Event('submit', { bubbles: true, cancelable: true });
      handleSubmit(formEvent as unknown as React.FormEvent);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Add Subtask"
      size="sm"
      zIndex="z-60"
      footer={
        <>
          <ModalButton variant="ghost" onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton type="submit" form="subtask-form" disabled={!title.trim()}>
            Add Subtask
          </ModalButton>
        </>
      }
    >
      <form id="subtask-form" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="subtask-title"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            Subtask Title
          </label>
          <ComposedInput
            ref={(el) => {
              if (el) setTimeout(() => el.focus(), 100);
            }}
            id="subtask-title"
            type="text"
            value={title}
            onChange={setTitle}
            onKeyDown={handleKeyDown}
            placeholder="Enter subtask name..."
            required
            className="w-full px-3 py-2 text-sm text-surface-800 dark:text-surface-200 bg-surface-100 dark:bg-surface-700 border border-transparent rounded-lg focus:outline-hidden focus:border-primary-500 focus:bg-white dark:focus:bg-surface-800 transition-colors"
          />
        </div>
      </form>
    </ModalWrapper>
  );
};
