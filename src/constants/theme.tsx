import Monitor from 'lucide-react/icons/monitor';
import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import type { Theme } from '$types/color';

/**
 * Theme options for appearance settings
 */
export const THEME_OPTIONS: Array<{
  value: Theme;
  icon: React.ReactNode;
  label: string;
}> = [
  { value: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
  { value: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
  { value: 'system', icon: <Monitor className="w-4 h-4" />, label: 'System' },
];
