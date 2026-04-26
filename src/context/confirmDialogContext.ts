import { createContext, type ReactNode } from 'react';

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
  // Optional third action for special cases (e.g., "Keep subtasks" when deleting)
  alternateLabel?: string;
  alternateDestructive?: boolean;
  // Optional delay before confirm button becomes enabled (in seconds)
  delayConfirmSeconds?: number;
  // Optional info notice banner shown between message and buttons
  notice?: ConfirmNotice;
  // Disable the confirm button (e.g. when the action is not supported)
  disableConfirm?: boolean;
}

export type ConfirmResult = 'confirm' | 'alternate' | 'cancel';

export interface ConfirmDialogContextValue {
  confirm: (options?: ConfirmOptions) => Promise<boolean>;
  confirmWithAlternate: (options?: ConfirmOptions) => Promise<ConfirmResult>;
  isOpen: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  close: () => void;
}

export const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export const defaultConfirmOptions: Required<
  Omit<
    ConfirmOptions,
    'alternateLabel' | 'alternateDestructive' | 'subtitle' | 'delayConfirmSeconds' | 'notice' | 'disableConfirm'
  >
> &
  Pick<
    ConfirmOptions,
    'alternateLabel' | 'alternateDestructive' | 'subtitle' | 'delayConfirmSeconds' | 'notice' | 'disableConfirm'
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
};
