import { createContext, type ReactNode, useContext } from 'react';

export interface ConfirmNotice {
  message: string;
  link?: { label: string; href: string };
  suffix?: string;
}

export interface ConfirmOptions {
  title?: string;
  subtitle?: string; // For displaying things like task name being deleted
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  // optional third action for special cases (e.g., "Keep subtasks" when deleting)
  alternateLabel?: string;
  alternateDestructive?: boolean;
  // optional delay before confirm button becomes enabled (in seconds)
  delayConfirmSeconds?: number;
  // optional info notice banner shown between message and buttons
  notice?: ConfirmNotice;
  // disable the confirm button (e.g. when the action is not supported)
  disableConfirm?: boolean;
  // keep dialog open after confirm so the caller can drive loading/error state
  keepOpenOnConfirm?: boolean;
}

export type ConfirmResult = 'confirm' | 'alternate' | 'cancel';

interface ConfirmDialogContextValue {
  confirm: (options?: ConfirmOptions) => Promise<boolean>;
  confirmWithAlternate: (options?: ConfirmOptions) => Promise<ConfirmResult>;
  isOpen: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  close: () => void;
}

export const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export const useConfirmDialog = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  }
  return context;
};

export const defaultConfirmOptions: Required<
  Omit<
    ConfirmOptions,
    | 'alternateLabel'
    | 'alternateDestructive'
    | 'subtitle'
    | 'delayConfirmSeconds'
    | 'notice'
    | 'disableConfirm'
    | 'keepOpenOnConfirm'
  >
> &
  Pick<
    ConfirmOptions,
    | 'alternateLabel'
    | 'alternateDestructive'
    | 'subtitle'
    | 'delayConfirmSeconds'
    | 'notice'
    | 'disableConfirm'
    | 'keepOpenOnConfirm'
  > = {
  title: 'Confirm action',
  subtitle: undefined,
  message: 'Are you sure you want to proceed?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  destructive: false,
  alternateLabel: undefined,
  alternateDestructive: undefined,
  delayConfirmSeconds: undefined,
  notice: undefined,
  disableConfirm: undefined,
  keepOpenOnConfirm: undefined,
};
