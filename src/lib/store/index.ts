/**
 * Core data store, cache management, and listeners
 */

import * as db from '$lib/database';
import { loggers } from '$lib/logger';
import type { DataChangeListener, DataStore, UIState } from '$lib/store/types';
import { DEFAULT_SORT_CONFIG } from '$utils/constants';

const log = loggers.taskData;

// Default UI state
export const defaultUIState: UIState = {
  activeAccountId: null,
  activeCalendarId: null,
  activeTagId: null,
  selectedTaskId: null,
  searchQuery: '',
  sortConfig: DEFAULT_SORT_CONFIG,
  showCompletedTasks: true,
  showUnstartedTasks: true,
  isEditorOpen: false,
};

// Default data store
export const defaultDataStore: DataStore = {
  tasks: [],
  tags: [],
  accounts: [],
  pendingDeletions: [],
  ui: defaultUIState,
};

// In-memory cache of the data store
let dataStoreCache: DataStore | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Event listeners for data changes
const listeners: Set<DataChangeListener> = new Set();

export const subscribeToDataChanges = (listener: DataChangeListener) => {
  listeners.add(listener);
  // Also subscribe to database changes
  db.subscribeToDataChanges(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const notifyListeners = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

// Initialize the database and load data into cache
export const initializeDataStore = async () => {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await db.initDatabase();
    await refreshCache();
    isInitialized = true;
    log.info('Data store initialized with SQLite');
  })();

  return initPromise;
};

// Refresh cache from database
export const refreshCache = async () => {
  try {
    dataStoreCache = await db.getDataSnapshot();
  } catch (error) {
    log.error('Failed to refresh cache:', error);
  }
};

// Load data from cache (must be initialized first)
export const loadDataStore = () => {
  if (!dataStoreCache) {
    log.warn('Data store not initialized, returning defaults');
    return { ...defaultDataStore };
  }
  return dataStoreCache;
};

// Save data to cache and notify listeners
// Note: Individual operations must call db.* functions to persist to SQLite
export const saveDataStore = (data: DataStore) => {
  dataStoreCache = data;
  notifyListeners();
};

// Get a snapshot of the current data
export const getDataSnapshot = () => {
  return loadDataStore();
};

// Check if the data store is initialized
export const getIsInitialized = () => {
  return isInitialized;
};
