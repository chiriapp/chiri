import { useContext } from 'react';
import { ConnectionContext, type ConnectionStore } from '$context/connectionContext';

export const useConnectionStore = (): ConnectionStore => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnectionStore must be used within a ConnectionProvider');
  }
  return context;
};
