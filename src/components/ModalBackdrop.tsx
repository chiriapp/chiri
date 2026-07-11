import type { DragEventHandler, ReactNode } from 'react';

interface ModalBackdropProps {
  children: ReactNode;
  onClose?: () => void;
  onDrop?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDragLeave?: DragEventHandler<HTMLDivElement>;
  className?: string;
  backdropClassName?: string;
  zIndex?: string;
  /** whether clicking the backdrop closes the modal. Default: false */
  closeOnBackdropClick?: boolean;
}

/**
 * accessible modal backdrop component
 * uses a button element for the backdrop to satisfy accessibility requirements
 * by default, clicking the backdrop does NOT close the modal - users close via X button or Escape key
 */
export const ModalBackdrop = ({
  children,
  onClose,
  onDrop,
  onDragOver,
  onDragLeave,
  className = '',
  backdropClassName = 'bg-black/50',
  zIndex = 'z-60',
  closeOnBackdropClick = false,
}: ModalBackdropProps) => (
  // biome-ignore lint/a11y/noStaticElementInteractions: Import modals need drag handlers on the backdrop to prevent browser file navigation
  <div
    role="presentation"
    className={`modal-backdrop-layer pointer-events-none fixed inset-0 ${zIndex} flex animate-fade-in items-center justify-center ${className}`}
    onDrop={onDrop}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
  >
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${backdropClassName}`}
    />
    {/* Backdrop button - accessible interactive element */}
    <button
      type="button"
      onClick={closeOnBackdropClick ? onClose : undefined}
      className="pointer-events-auto absolute inset-0 cursor-default"
      aria-label="Close modal"
      tabIndex={-1}
    />
    <div
      data-tauri-drag-region
      aria-hidden="true"
      className="modal-titlebar-drag-region pointer-events-auto absolute top-0 right-0 left-0 hidden h-13"
    />
    {/* Modal content container */}
    <div className="pointer-events-auto contents">{children}</div>
  </div>
);
