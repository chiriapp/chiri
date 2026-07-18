import CloudOff from 'lucide-react/icons/cloud-off';
import { Tooltip } from '$components/Tooltip';
import { useConnectionStore } from '$context/connectionContext';

export const SidebarAccountItemDisconnectedIndicator = ({
  accountId,
  isCalDAV,
}: {
  accountId: string;
  isCalDAV: boolean;
}) => {
  const { hasConnection } = useConnectionStore();
  if (!isCalDAV || hasConnection(accountId)) return null;
  return (
    <Tooltip content="Disconnected" position="top">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        <CloudOff className="h-3.5 w-3.5 text-semantic-warning" />
      </span>
    </Tooltip>
  );
};
