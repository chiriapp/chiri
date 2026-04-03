import type { ReactNode } from 'react';

interface ModalBackdropProps {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
  zIndex?: string;
  /** Whether clicking the backdrop closes the modal. Default: false */
  closeOnBackdropClick?: boolean;
}

/**
 * Accessible modal backdrop component.
 * Uses a button element for the backdrop to satisfy accessibility requirements.
 * By default, clicking the backdrop does NOT close the modal - users close via X button or Escape key.
 */
export const ModalBackdrop = ({
  children,
  onClose,
  className = '',
  zIndex = 'z-50',
  closeOnBackdropClick = false,
}: ModalBackdropProps) => {
  return (
    <div
      role="presentation"
      className={`fixed inset-0 ${zIndex} flex items-center justify-center animate-fade-in ${className}`}
    >
      {/* Backdrop button - accessible interactive element */}
      <button
        type="button"
        onClick={closeOnBackdropClick ? onClose : undefined}
        className="absolute inset-0 bg-black/50 cursor-default"
        aria-label="Close modal"
        tabIndex={-1}
      />
      {/* Modal content container */}
      {children}
    </div>
  );
};
