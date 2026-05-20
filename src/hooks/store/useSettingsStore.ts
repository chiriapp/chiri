import { useContext } from 'react';
import { SettingsContext } from '$context/settingsContext';
import type { SettingsStore } from '$types/settings';

export const useSettingsStore = (): SettingsStore => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsStore must be used within a SettingsProvider');
  }
  return context;
};
