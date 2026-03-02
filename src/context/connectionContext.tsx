import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useSyncExternalStore,
} from 'react';
import type { CalDAVCredentials } from '@/lib/tauri-http';
import type { ServerType } from '@/types';

export interface AccountConnection {
  serverUrl: string;
  credentials: CalDAVCredentials;
  principalUrl: string;
  calendarHome: string;
  serverType: ServerType;
}

interface ConnectionState {
  connections: Record<string, AccountConnection>;
}

interface ConnectionActions {
  setConnection: (accountId: string, connection: AccountConnection) => void;
  getConnection: (accountId: string) => AccountConnection | undefined;
  deleteConnection: (accountId: string) => void;
  hasConnection: (accountId: string) => boolean;
}

type ConnectionStore = ConnectionState & ConnectionActions;

// Singleton store for accessing state outside React
let state: ConnectionState = { connections: {} };
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

// Actions that can be called from anywhere
export const connectionStore = {
  getState: () => state,

  setConnection: (accountId: string, connection: AccountConnection) => {
    state = {
      ...state,
      connections: {
        ...state.connections,
        [accountId]: connection,
      },
    };
    emitChange();
  },

  getConnection: (accountId: string) => state.connections[accountId],

  deleteConnection: (accountId: string) => {
    const { [accountId]: _, ...rest } = state.connections;
    state = { ...state, connections: rest };
    emitChange();
  },

  hasConnection: (accountId: string) => accountId in state.connections,
};

// Context for React components
const ConnectionContext = createContext<ConnectionStore | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const currentState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setConnection = useCallback((accountId: string, connection: AccountConnection) => {
    connectionStore.setConnection(accountId, connection);
  }, []);

  const getConnection = useCallback((accountId: string) => {
    return connectionStore.getConnection(accountId);
  }, []);

  const deleteConnection = useCallback((accountId: string) => {
    connectionStore.deleteConnection(accountId);
  }, []);

  const hasConnection = useCallback((accountId: string) => {
    return connectionStore.hasConnection(accountId);
  }, []);

  const value: ConnectionStore = {
    ...currentState,
    setConnection,
    getConnection,
    deleteConnection,
    hasConnection,
  };

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnectionStore(): ConnectionStore {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnectionStore must be used within a ConnectionProvider');
  }
  return context;
}
