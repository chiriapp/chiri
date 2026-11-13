import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
      networkMode: 'always',
    },
    mutations: {
      retry: 1,
      networkMode: 'always',
    },
  },
});

// query keys
export const queryKeys = {
  tasks: {
    all: ['tasks'] as const,
    byCalendar: (calendarId: string) => ['tasks', 'calendar', calendarId] as const,
    byId: (id: string) => ['tasks', 'id', id] as const,
    byTag: (tagId: string) => ['tasks', 'tag', tagId] as const,
    children: (parentUid: string, filter: string) =>
      ['tasks', 'children', parentUid, filter] as const,
  },
  accounts: {
    all: ['accounts'] as const,
    byId: (id: string) => ['accounts', id] as const,
  },
  tags: {
    all: ['tags'] as const,
    byId: (id: string) => ['tags', id] as const,
  },
  filters: {
    all: ['filters'] as const,
    byId: (id: string) => ['filters', id] as const,
  },
  pushSubscriptions: {
    all: ['pushSubscriptions'] as const,
    byCalendar: (calendarId: string) => ['pushSubscriptions', 'calendar', calendarId] as const,
    byConfig: (providerKey: string, accountKey: string) =>
      ['pushSubscriptions', providerKey, accountKey] as const,
  },
  pushDiagnostics: {
    all: ['pushDiagnostics'] as const,
    byAccount: (accountId: string) => ['pushDiagnostics', 'account', accountId] as const,
    byAccountAndConfig: (accountId: string, providerKey: string) =>
      ['pushDiagnostics', 'account', accountId, providerKey] as const,
    byConfig: (providerKey: string, accountKey: string) =>
      ['pushDiagnostics', providerKey, accountKey] as const,
  },
  pushProviderAvailability: {
    byConfig: (providerConfigKey: string) =>
      ['push-provider-availability', providerConfigKey] as const,
  },
  filteredTasks: ['filteredTasks'] as const,
  taskHistory: {
    all: ['taskHistory'] as const,
    byTask: (taskUid: string) => ['taskHistory', taskUid] as const,
  },
  platform: {
    installType: ['platform', 'installType'] as const,
    isGnomeDesktop: ['platform', 'isGnomeDesktop'] as const,
    isKdeDesktop: ['platform', 'isKdeDesktop'] as const,
    shouldDisableUpdates: ['platform', 'shouldDisableUpdates'] as const,
    trayHostAvailable: ['platform', 'trayHostAvailable'] as const,
  },
  pendingDeletions: ['pendingDeletions'] as const,
  uiState: {
    all: ['uiState'] as const,
  },
} as const;
