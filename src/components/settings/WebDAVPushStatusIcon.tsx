import CircleAlert from 'lucide-react/icons/circle-alert';
import Loader2 from 'lucide-react/icons/loader-2';
import TriangleAlert from 'lucide-react/icons/triangle-alert';
import Zap from 'lucide-react/icons/zap';
import ZapOff from 'lucide-react/icons/zap-off';
import type { WebDAVPushStatus } from '$lib/push/status';

export const WebDAVPushStatusIcon = ({ icon }: { icon: WebDAVPushStatus['icon'] }) => {
  switch (icon) {
    case 'checking':
      return <Loader2 className="size-3.5 shrink-0 animate-spin" />;
    case 'alert':
      return <TriangleAlert className="size-3.5 shrink-0" />;
    case 'warning':
      return <CircleAlert className="size-3.5 shrink-0" />;
    case 'off':
      return <ZapOff className="size-3.5 shrink-0" />;
    case 'ready':
      return <Zap className="size-3.5 shrink-0 fill-current" />;
  }
};
