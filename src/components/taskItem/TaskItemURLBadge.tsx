import { openUrl } from '@tauri-apps/plugin-opener';
import Link from 'lucide-react/icons/link';

export const TaskItemURLBadge = ({ url }: { url: string }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      openUrl(url);
    }}
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium border border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:opacity-80 transition-opacity outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
    title={url}
  >
    <Link className="w-3 h-3" />
    URL
  </button>
);
