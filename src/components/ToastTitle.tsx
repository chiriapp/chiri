import type { LucideIcon } from 'lucide-react';
import Check from 'lucide-react/icons/check';
import CircleX from 'lucide-react/icons/circle-x';
import Info from 'lucide-react/icons/info';
import TriangleAlert from 'lucide-react/icons/triangle-alert';
import type { ReactNode } from 'react';
import { LoadingSpinner } from '$components/LoadingSpinner';

export type ToastType = 'error' | 'warning' | 'info' | 'success' | 'loading';

const TYPE_ICONS: Record<ToastType, { icon?: LucideIcon; colorClass: string }> = {
  error: { icon: CircleX, colorClass: 'text-semantic-error' },
  warning: { icon: TriangleAlert, colorClass: 'text-semantic-warning' },
  info: { icon: Info, colorClass: 'text-primary-ink' },
  success: { icon: Check, colorClass: 'text-primary-ink' },
  loading: { colorClass: 'text-primary-ink' },
};

interface ToastTitleProps {
  type: ToastType;
  children?: ReactNode;
}

export const ToastTitle = ({ type, children }: ToastTitleProps) => {
  const { icon: Icon, colorClass } = TYPE_ICONS[type];

  return (
    <span className="inline-flex items-center gap-2">
      {type === 'loading' ? (
        <LoadingSpinner className={`h-4 w-4 ${colorClass}`} />
      ) : Icon ? (
        <Icon className={`h-4 w-4 shrink-0 ${colorClass}`} aria-hidden={true} />
      ) : null}
      {children}
    </span>
  );
};
