import { useContext } from 'react';
import { SettingsContext, type SettingsStore } from '$context/settingsContext';

export const useSettingsStore = (): SettingsStore => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsStore must be used within a SettingsProvider');
  }
  return context;
};
