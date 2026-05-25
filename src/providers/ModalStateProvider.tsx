import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import { useDismissableLayerState } from '$context/dismissableLayerContext';
import { ModalStateContext } from '$context/modalStateContext';

// This provider tracks modal state and manages hover state resets
export const ModalStateProvider = ({ children }: { children: ReactNode }) => {
  const { isAnyModalOpen, isContextMenuOpen } = useDismissableLayerState();
  const wasAnyModalOpenRef = useRef(false);

  useEffect(() => {
    if (isAnyModalOpen && !wasAnyModalOpenRef.current) {
      document.documentElement.setAttribute('data-modal-open', 'true');

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    } else if (!isAnyModalOpen && wasAnyModalOpenRef.current) {
      document.documentElement.removeAttribute('data-modal-open');
    }

    wasAnyModalOpenRef.current = isAnyModalOpen;
  }, [isAnyModalOpen]);

  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute('data-modal-open');
    };
  }, []);

  const value = useMemo(
    () => ({ isAnyModalOpen, isContextMenuOpen }),
    [isAnyModalOpen, isContextMenuOpen],
  );

  return <ModalStateContext.Provider value={value}>{children}</ModalStateContext.Provider>;
};
