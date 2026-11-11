import { PredefinedMenuItem } from '@tauri-apps/api/menu';

export const separator = () => PredefinedMenuItem.new({ item: 'Separator' });
