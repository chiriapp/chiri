import {
  DEFAULT_ACCOUNT_SORT_CONFIG,
  DEFAULT_CALENDAR_SORT_CONFIG,
  DEFAULT_SORT_CONFIG,
  DEFAULT_TAG_SORT_CONFIG,
} from '$constants';
import { db } from '$lib/database';
import { loggers } from '$lib/logger';
import type { DataChangeListener, DataStore, UIState } from '$types/store';

const log = loggers.dataStore;

export const defaultUIState: UIState = {
  activeAccountId: null,
  activeCalendarId: null,
  activeTagId: null,
  selectedTaskId: null,
  searchQuery: '',
  sortConfig: DEFAULT_SORT_CONFIG,
  accountSortConfig: DEFAULT_ACCOUNT_SORT_CONFIG,
  calendarSortConfig: DEFAULT_CALENDAR_SORT_CONFIG,
  tagSortConfig: DEFAULT_TAG_SORT_CONFIG,
  showCompletedTasks: true,
  showUnstartedTasks: true,
  isEditorOpen: false,
};

export const defaultDataStore: DataStore = {
  tasks: [],
  tags: [],
  accounts: [],
  pendingDeletions: [],
  ui: defaultUIState,
};

class Store {
  private cache: DataStore | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private listeners: Set<DataChangeListener> = new Set();

  subscribe(listener: DataChangeListener) {
    this.listeners.add(listener);
    db.subscribe(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    for (const listener of this.listeners) listener();
  }

  async initialize() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      await db.init();
      await this.refreshCache();
      this.initialized = true;
      log.info('Data store initialized with SQLite');
    })();

    return this.initPromise;
  }

  async refreshCache() {
    try {
      this.cache = await db.getSnapshot();
    } catch (error) {
      log.error('Failed to refresh cache:', error);
    }
  }

  load(): DataStore {
    if (!this.cache) {
      log.warn('Data store not initialized, returning defaults');
      return { ...defaultDataStore };
    }
    return this.cache;
  }

  save(data: DataStore) {
    this.cache = data;
    this.notify();
  }

  getIsInitialized() {
    return this.initialized;
  }
}

export const dataStore = new Store();
