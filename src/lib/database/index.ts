import DatabasePlugin from '@tauri-apps/plugin-sql';
import * as accountOps from '$lib/database/accounts';
import * as calendarOps from '$lib/database/calendars';
import * as historyOps from '$lib/database/history';
import * as pendingOps from '$lib/database/pendingDeletions';
import * as snapshotOps from '$lib/database/snapshot';
import * as tagOps from '$lib/database/tags';
import * as taskOps from '$lib/database/tasks';
import * as uiOps from '$lib/database/ui';
import { loggers } from '$lib/logger';
import type {
  Account,
  AccountSortConfig,
  Calendar,
  CalendarSortConfig,
  SortConfig,
  Tag,
  TagSortConfig,
  Task,
} from '$types';
import type { TaskHistoryEntry } from '$types/database';
import type { DataChangeListener, DataStore, PendingDeletion, UIState } from '$types/store';

const DB_NAME = 'sqlite:chiri.db';

class Database {
  private connection: DatabasePlugin | null = null;
  private listeners: Set<DataChangeListener> = new Set();
  private log = loggers.database;

  // Connection
  async init() {
    if (this.connection) return;
    try {
      this.connection = await DatabasePlugin.load(DB_NAME);
      this.log.info('Connected to SQLite database');
    } catch (error) {
      this.log.error('Failed to connect:', error);
      throw error;
    }
  }

  private async conn(): Promise<DatabasePlugin> {
    if (!this.connection) await this.init();
    return this.connection!;
  }

  // Listeners
  subscribe(listener: DataChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(): void {
    for (const listener of this.listeners) listener();
  }

  // Accounts
  async getAllAccounts(): Promise<Account[]> {
    return accountOps.getAllAccounts(await this.conn());
  }

  async getAccountById(id: string): Promise<Account | undefined> {
    return accountOps.getAccountById(await this.conn(), id);
  }

  async createAccount(data: Partial<Account>): Promise<Account> {
    const result = await accountOps.createAccount(await this.conn(), data);
    this.notify();
    return result;
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account | undefined> {
    const result = await accountOps.updateAccount(await this.conn(), id, updates);
    this.notify();
    return result;
  }

  async deleteAccount(id: string): Promise<void> {
    await accountOps.deleteAccount(await this.conn(), id);
    this.notify();
  }

  // Calendars
  async addCalendar(accountId: string, data: Partial<Calendar>): Promise<void> {
    await calendarOps.addCalendar(await this.conn(), accountId, data);
    this.notify();
  }

  async updateCalendar(calendarId: string, updates: Partial<Calendar>): Promise<void> {
    await calendarOps.updateCalendar(await this.conn(), calendarId, updates);
    this.notify();
  }

  async deleteCalendar(accountId: string, calendarId: string): Promise<void> {
    await calendarOps.deleteCalendar(await this.conn(), accountId, calendarId);
    this.notify();
  }

  // Tasks
  async getAllTasks(): Promise<Task[]> {
    return taskOps.getAllTasks(await this.conn());
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    return taskOps.getTaskById(await this.conn(), id);
  }

  async getTaskByUid(uid: string): Promise<Task | undefined> {
    return taskOps.getTaskByUid(await this.conn(), uid);
  }

  async getTasksByCalendar(calendarId: string): Promise<Task[]> {
    return taskOps.getTasksByCalendar(await this.conn(), calendarId);
  }

  async getTasksByTag(tagId: string): Promise<Task[]> {
    return taskOps.getTasksByTag(await this.conn(), tagId);
  }

  async getChildTasks(parentUid: string): Promise<Task[]> {
    return taskOps.getChildTasks(await this.conn(), parentUid);
  }

  async countChildren(parentUid: string): Promise<number> {
    return taskOps.countChildren(await this.conn(), parentUid);
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    const result = await taskOps.createTask(await this.conn(), data);
    this.notify();
    return result;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const result = await taskOps.updateTask(await this.conn(), id, updates);
    this.notify();
    return result;
  }

  async deleteTask(id: string, deleteChildren?: boolean): Promise<void> {
    await taskOps.deleteTask(await this.conn(), id, deleteChildren);
    this.notify();
  }

  async toggleTaskComplete(id: string): Promise<void> {
    await taskOps.toggleTaskComplete(await this.conn(), id);
    this.notify();
  }

  // Tags
  async getAllTags(): Promise<Tag[]> {
    return tagOps.getAllTags(await this.conn());
  }

  async getTagById(id: string): Promise<Tag | undefined> {
    return tagOps.getTagById(await this.conn(), id);
  }

  async createTag(data: Partial<Tag>): Promise<Tag> {
    const result = await tagOps.createTag(await this.conn(), data);
    this.notify();
    return result;
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag | undefined> {
    const result = await tagOps.updateTag(await this.conn(), id, updates);
    this.notify();
    return result;
  }

  async deleteTag(id: string): Promise<void> {
    await tagOps.deleteTag(await this.conn(), id);
    this.notify();
  }

  // UI state
  async getUIState(): Promise<UIState> {
    return uiOps.getUIState(await this.conn());
  }

  async setActiveAccount(id: string | null): Promise<void> {
    await uiOps.setActiveAccount(await this.conn(), id);
    this.notify();
  }

  async setActiveCalendar(id: string | null): Promise<void> {
    await uiOps.setActiveCalendar(await this.conn(), id);
    this.notify();
  }

  async setActiveTag(id: string | null): Promise<void> {
    await uiOps.setActiveTag(await this.conn(), id);
    this.notify();
  }

  async setAllTasksView(): Promise<void> {
    await uiOps.setAllTasksView(await this.conn());
    this.notify();
  }

  async setSelectedTask(id: string | null): Promise<void> {
    await uiOps.setSelectedTask(await this.conn(), id);
    this.notify();
  }

  async setEditorOpen(open: boolean): Promise<void> {
    await uiOps.setEditorOpen(await this.conn(), open);
    this.notify();
  }

  async setSearchQuery(query: string): Promise<void> {
    await uiOps.setSearchQuery(await this.conn(), query);
    this.notify();
  }

  async setSortConfig(config: SortConfig): Promise<void> {
    await uiOps.setSortConfig(await this.conn(), config);
    this.notify();
  }

  async setAccountSortConfig(config: AccountSortConfig): Promise<void> {
    await uiOps.setAccountSortConfig(await this.conn(), config);
    this.notify();
  }

  async setCalendarSortConfig(config: CalendarSortConfig): Promise<void> {
    await uiOps.setCalendarSortConfig(await this.conn(), config);
    this.notify();
  }

  async setTagSortConfig(config: TagSortConfig): Promise<void> {
    await uiOps.setTagSortConfig(await this.conn(), config);
    this.notify();
  }

  async setShowCompletedTasks(show: boolean): Promise<void> {
    await uiOps.setShowCompletedTasks(await this.conn(), show);
    this.notify();
  }

  async setShowUnstartedTasks(show: boolean): Promise<void> {
    await uiOps.setShowUnstartedTasks(await this.conn(), show);
    this.notify();
  }

  // History
  async logHistoryForTaskUpdate(
    taskUid: string,
    oldTask: Task,
    updates: Partial<Task>,
  ): Promise<void> {
    return historyOps.logHistoryForTaskUpdate(await this.conn(), taskUid, oldTask, updates);
  }

  async logTaskChange(
    taskUid: string,
    field: string,
    oldValue: string | null,
    newValue: string | null,
  ): Promise<void> {
    return historyOps.logTaskChange(await this.conn(), taskUid, field, oldValue, newValue);
  }

  async getTaskHistory(taskUid: string): Promise<TaskHistoryEntry[]> {
    return historyOps.getTaskHistory(await this.conn(), taskUid);
  }

  // Pending deletions
  async getPendingDeletions(): Promise<PendingDeletion[]> {
    return pendingOps.getPendingDeletions(await this.conn());
  }

  async addPendingDeletion(deletion: PendingDeletion): Promise<void> {
    await pendingOps.addPendingDeletion(await this.conn(), deletion);
    this.notify();
  }

  async clearPendingDeletion(uid: string): Promise<void> {
    await pendingOps.clearPendingDeletion(await this.conn(), uid);
    this.notify();
  }

  // Snapshot
  async getSnapshot(): Promise<DataStore> {
    return snapshotOps.getSnapshot(await this.conn());
  }
}

export const db = new Database();
