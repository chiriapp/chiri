import { useRecentlyDeletedCleanup } from '$hooks/deletion/useRecentlyDeletedCleanup';
import { useWebDAVPush } from '$hooks/push/useWebDAVPush';
import type { useSyncQuery } from '$hooks/queries/useSync';
import { useAppBadge } from '$hooks/system/useAppBadge';
import { useConfirmQuit } from '$hooks/system/useConfirmQuit';
import { useDeepLink } from '$hooks/system/useDeepLink';
import { useNotifications } from '$hooks/system/useNotifications';
import { useTray } from '$hooks/system/useTray';
import { useCursorPointers } from '$hooks/ui/useCursorPointers';
import { useKeyboardShortcuts } from '$hooks/ui/useKeyboardShortcuts';
import { useRefreshStaleCursorAfterPointerMutation } from '$hooks/ui/useStaleCursorReset';
import { useTheme } from '$hooks/ui/useTheme';
import { useAppMenu } from '$hooks/useAppMenu';

type SyncQuery = ReturnType<typeof useSyncQuery>;

interface UseAppLifecycleOptions {
  isSyncInProgress: boolean;
  lastSyncTime: Date | null;
  onSyncCalendar: SyncQuery['syncCalendar'];
  onTraySync: () => void;
  onKeyboardSync: () => void;
  onOpenSettings: () => void;
  onOpenKeyboardShortcuts: () => void;
  onOpenImport: () => void;
}

export const useAppLifecycle = ({
  isSyncInProgress,
  lastSyncTime,
  onSyncCalendar,
  onTraySync,
  onKeyboardSync,
  onOpenSettings,
  onOpenKeyboardShortcuts,
  onOpenImport,
}: UseAppLifecycleOptions) => {
  useWebDAVPush({ onSyncCalendar, lastSyncTime });
  useTray({
    isSyncing: isSyncInProgress,
    lastSyncTime,
    onSyncRequest: onTraySync,
  });
  useAppMenu(isSyncInProgress);
  useTheme();
  useCursorPointers();
  useRefreshStaleCursorAfterPointerMutation();
  useConfirmQuit();
  useDeepLink();
  useNotifications();
  useRecentlyDeletedCleanup();
  useAppBadge();

  useKeyboardShortcuts({
    onOpenSettings,
    onOpenKeyboardShortcuts,
    onOpenImport,
    onSync: onKeyboardSync,
  });
};
