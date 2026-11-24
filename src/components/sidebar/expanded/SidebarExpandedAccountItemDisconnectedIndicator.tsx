import CloudOff from 'lucide-react/icons/cloud-off';
import { LoadingSpinner } from '$components/LoadingSpinner';
import { Tooltip } from '$components/Tooltip';
import { useConnectionStore } from '$context/connectionContext';

export const SidebarExpandedAccountItemDisconnectedIndicator = ({
  accountId,
  isCalDAV,
}: {
  accountId: string;
  isCalDAV: boolean;
}) => {
  const { getStatus } = useConnectionStore();
  if (!isCalDAV) return null;

  const status = getStatus(accountId);
  if (status === 'connected') return null;

  const isConnecting = status === 'connecting';
  const label = isConnecting
    ? 'Connecting…'
    : status === 'reconnecting'
      ? 'Reconnecting…'
      : 'Disconnected';
  return (
    <Tooltip content={label} position="top">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        {status === 'disconnected' ? (
          <CloudOff className="h-3.5 w-3.5 text-semantic-warning" />
        ) : (
          <LoadingSpinner className="h-3.5 w-3.5 text-surface-400" />
        )}
      </span>
    </Tooltip>
  );
};
