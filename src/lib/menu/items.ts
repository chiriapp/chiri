import { PredefinedMenuItem } from '@tauri-apps/api/menu';

export const separator = () => PredefinedMenuItem.new({ item: 'Separator' });

/** the active option of a menu acting as a radio group is marked with a leading checkmark */
export const withCheckmark = (label: string, checked: boolean) => (checked ? `✓ ${label}` : label);
