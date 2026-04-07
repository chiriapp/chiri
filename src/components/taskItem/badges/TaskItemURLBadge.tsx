import { openUrl } from '@tauri-apps/plugin-opener';
import Link from 'lucide-react/icons/link';

export const TaskItemURLBadge = ({ url }: { url: string }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      openUrl(url);
    }}
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border border-surface-200 dark:border-surface-600 bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400 hover:opacity-80 transition-opacity outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
    title={url}
  >
    <Link className="w-3 h-3 text-primary-500" />
    URL
  </button>
);
