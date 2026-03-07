import { type ReactNode, useCallback, useRef, useState } from 'react';
import { ConfirmDialog } from '$components/ConfirmDialog';
import {
  ConfirmDialogContext,
  type ConfirmOptions,
  type ConfirmResult,
  defaultConfirmOptions,
} from '$context/confirmDialogContext';

export const ConfirmDialogProvider = ({ children }: { children: ReactNode }) => {
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const alternateResolverRef = useRef<((value: ConfirmResult) => void) | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>(defaultConfirmOptions);
  const [dialogKey, setDialogKey] = useState(0);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    resolverRef.current = null;
    alternateResolverRef.current = null;
  }, []);

  const confirm = useCallback((opts: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      alternateResolverRef.current = null;
      setOptions({ ...defaultConfirmOptions, ...opts });
      setDialogKey((k) => k + 1); // Force remount to reset state
      setIsOpen(true);
    });
  }, []);

  const confirmWithAlternate = useCallback((opts: ConfirmOptions = {}) => {
    return new Promise<ConfirmResult>((resolve) => {
      alternateResolverRef.current = resolve;
      resolverRef.current = null;
      setOptions({ ...defaultConfirmOptions, ...opts });
      setDialogKey((k) => k + 1); // Force remount to reset state
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (alternateResolverRef.current) {
      alternateResolverRef.current('confirm');
    } else {
      resolverRef.current?.(true);
    }
    close();
  }, [close]);

  const handleAlternate = useCallback(() => {
    alternateResolverRef.current?.('alternate');
    close();
  }, [close]);

  const handleCancel = useCallback(() => {
    if (alternateResolverRef.current) {
      alternateResolverRef.current('cancel');
    } else {
      resolverRef.current?.(false);
    }
    close();
  }, [close]);

  return (
    <ConfirmDialogContext.Provider
      value={{ confirm, confirmWithAlternate, isOpen, setLoading: setIsLoading, close }}
    >
      {children}
      <ConfirmDialog
        key={dialogKey}
        isOpen={isOpen}
        title={options.title ?? defaultConfirmOptions.title}
        subtitle={options.subtitle}
        message={options.message ?? defaultConfirmOptions.message}
        confirmLabel={options.confirmLabel ?? defaultConfirmOptions.confirmLabel}
        cancelLabel={options.cancelLabel ?? defaultConfirmOptions.cancelLabel}
        destructive={options.destructive ?? defaultConfirmOptions.destructive}
        alternateLabel={options.alternateLabel}
        alternateDestructive={options.alternateDestructive}
        delayConfirmSeconds={options.delayConfirmSeconds}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        onAlternate={handleAlternate}
        onCancel={handleCancel}
      />
    </ConfirmDialogContext.Provider>
  );
};
