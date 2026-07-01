import DatabasePlugin from '@tauri-apps/plugin-sql';
import * as accountOps from '$lib/database/accounts';
import * as caldavTaskObjectOps from '$lib/database/caldav';
import * as calendarOps from '$lib/database/calendars';
import * as filterOps from '$lib/database/filters';
import * as historyOps from '$lib/database/history';
import * as pendingOps from '$lib/database/pendingDeletions';
import * as pushOps from '$lib/database/pushSubscriptions';
import * as snapshotOps from '$lib/database/snapshot';
import * as tagOps from '$lib/database/tags';
import * as taskOps from '$lib/database/tasks';
import * as uiOps from '$lib/database/ui';
import { loggers } from '$lib/logger';
import type { Account, CalDAVTaskObject, Calendar, Tag, Task } from '$types';
import type { Filter } from '$types/filter';
import type { PushSubscription } from '$types/push';
import type { AccountSortConfig, CalendarSortConfig, SortConfig, TagSortConfig } from '$types/sort';
import type { DataChangeListener, PendingDeletion } from '$types/store';

const DB_NAME = 'sqlite:chiri.db';

class Database {
  private connection: DatabasePlugin | null = null;
  private listeners: Set<DataChangeListener> = new Set();
  private log = loggers.database;

  // connection
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

  private async conn() {
    if (!this.connection) await this.init();
    return this.connection!;
  }

  // listeners
  subscribe(listener: DataChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) listener();
  }

  // accounts
  async getAllAccounts() {
    return accountOps.getAllAccounts(await this.conn());
  }

  async getAccountById(id: string) {
    return accountOps.getAccountById(await this.conn(), id);
  }

  async createAccount(data: Partial<Account>) {
    const result = await accountOps.createAccount(await this.conn(), data);
    this.notify();
    return result;
  }

  async updateAccount(id: string, updates: Partial<Account>) {
    const result = await accountOps.updateAccount(await this.conn(), id, updates);
    this.notify();
    return result;
  }

  async deleteAccount(id: string) {
    await accountOps.deleteAccount(await this.conn(), id);
    this.notify();
  }

  // calendars
  async addCalendar(accountId: string, data: Partial<Calendar>) {
    await calendarOps.addCalendar(await this.conn(), accountId, data);
    this.notify();
  }

  async updateCalendar(calendarId: string, updates: Partial<Calendar>) {
    await calendarOps.updateCalendar(await this.conn(), calendarId, updates);
    this.notify();
  }

  async deleteCalendar(accountId: string, calendarId: string) {
    await calendarOps.deleteCalendar(await this.conn(), accountId, calendarId);
    this.notify();
  }

  // tasks
  async getAllTasks() {
    return taskOps.getAllTasks(await this.conn());
  }

  async getTaskById(id: string) {
    return taskOps.getTaskById(await this.conn(), id);
  }

  async getTaskByUid(uid: string) {
    return taskOps.getTaskByUid(await this.conn(), uid);
  }

  async getTasksByCalendar(calendarId: string) {
    return taskOps.getTasksByCalendar(await this.conn(), calendarId);
  }

  async getTasksByTag(tagId: string) {
    return taskOps.getTasksByTag(await this.conn(), tagId);
  }

  async getChildTasks(parentUid: string) {
    return taskOps.getChildTasks(await this.conn(), parentUid);
  }

  async countChildren(parentUid: string) {
    return taskOps.countChildren(await this.conn(), parentUid);
  }

  async createTask(data: Partial<Task>) {
    const result = await taskOps.createTask(await this.conn(), data);
    this.notify();
    return result;
  }

  async updateTask(id: string, updates: Partial<Task>) {
    const result = await taskOps.updateTask(await this.conn(), id, updates);
    this.notify();
    return result;
  }

  async deleteTask(id: string, deleteChildren?: boolean) {
    await taskOps.deleteTask(await this.conn(), id, deleteChildren);
    this.notify();
  }

  async restoreTask(id: string, restoreChildren?: boolean) {
    await taskOps.restoreTask(await this.conn(), id, restoreChildren);
    this.notify();
  }

  async permanentlyDeleteTask(id: string, deleteChildren?: boolean) {
    await taskOps.permanentlyDeleteTask(await this.conn(), id, deleteChildren);
    this.notify();
  }

  async deleteExpiredRecentlyDeletedTasks(now?: Date) {
    const count = await taskOps.deleteExpiredRecentlyDeletedTasks(await this.conn(), now);
    if (count > 0) this.notify();
    return count;
  }

  async toggleTaskComplete(id: string) {
    await taskOps.toggleTaskComplete(await this.conn(), id);
    this.notify();
  }

  // tags
  async getAllTags() {
    return tagOps.getAllTags(await this.conn());
  }

  async getTagById(id: string) {
    return tagOps.getTagById(await this.conn(), id);
  }

  async createTag(data: Partial<Tag>) {
    const result = await tagOps.createTag(await this.conn(), data);
    this.notify();
    return result;
  }

  async updateTag(id: string, updates: Partial<Tag>) {
    const result = await tagOps.updateTag(await this.conn(), id, updates);
    this.notify();
    return result;
  }

  async deleteTag(id: string) {
    await tagOps.deleteTag(await this.conn(), id);
    this.notify();
  }

  // filters
  async getAllFilters() {
    return filterOps.getAllFilters(await this.conn());
  }

  async getFilterById(id: string) {
    return filterOps.getFilterById(await this.conn(), id);
  }

  async createFilter(data: Partial<Filter>) {
    const result = await filterOps.createFilter(await this.conn(), data);
    this.notify();
    return result;
  }

  async updateFilter(id: string, updates: Partial<Filter>) {
    const result = await filterOps.updateFilter(await this.conn(), id, updates);
    this.notify();
    return result;
  }

  async deleteFilter(id: string) {
    await filterOps.deleteFilter(await this.conn(), id);
    this.notify();
  }

  // UI state
  async getUIState() {
    return uiOps.getUIState(await this.conn());
  }

  async setActiveAccount(id: string | null) {
    await uiOps.setActiveAccount(await this.conn(), id);
    this.notify();
  }

  async setActiveCalendar(id: string | null) {
    await uiOps.setActiveCalendar(await this.conn(), id);
    this.notify();
  }

  async setActiveTag(id: string | null) {
    await uiOps.setActiveTag(await this.conn(), id);
    this.notify();
  }

  async setActiveFilter(id: string | null) {
    await uiOps.setActiveFilter(await this.conn(), id);
    this.notify();
  }

  async setAllTasksView() {
    await uiOps.setAllTasksView(await this.conn());
    this.notify();
  }

  async setRecentlyDeletedView() {
    await uiOps.setRecentlyDeletedView(await this.conn());
    this.notify();
  }

  async setSelectedTask(id: string | null) {
    await uiOps.setSelectedTask(await this.conn(), id);
    this.notify();
  }

  async setEditorOpen(open: boolean) {
    await uiOps.setEditorOpen(await this.conn(), open);
    this.notify();
  }

  async setSearchQuery(query: string) {
    await uiOps.setSearchQuery(await this.conn(), query);
    this.notify();
  }

  async setSortConfig(config: SortConfig) {
    await uiOps.setSortConfig(await this.conn(), config);
    this.notify();
  }

  async setAccountSortConfig(config: AccountSortConfig) {
    await uiOps.setAccountSortConfig(await this.conn(), config);
    this.notify();
  }

  async setCalendarSortConfig(config: CalendarSortConfig) {
    await uiOps.setCalendarSortConfig(await this.conn(), config);
    this.notify();
  }

  async setTagSortConfig(config: TagSortConfig) {
    await uiOps.setTagSortConfig(await this.conn(), config);
    this.notify();
  }

  async setShowCompletedTasks(show: boolean) {
    await uiOps.setShowCompletedTasks(await this.conn(), show);
    this.notify();
  }

  async setShowUnstartedTasks(show: boolean) {
    await uiOps.setShowUnstartedTasks(await this.conn(), show);
    this.notify();
  }

  // history
  async logHistoryForTaskUpdate(taskUid: string, oldTask: Task, updates: Partial<Task>) {
    return historyOps.logHistoryForTaskUpdate(await this.conn(), taskUid, oldTask, updates);
  }

  async logTaskChange(
    taskUid: string,
    field: string,
    oldValue: string | null,
    newValue: string | null,
  ) {
    return historyOps.logTaskChange(await this.conn(), taskUid, field, oldValue, newValue);
  }

  async getTaskHistory(taskUid: string) {
    return historyOps.getTaskHistory(await this.conn(), taskUid);
  }

  // pending deletions
  async getPendingDeletions() {
    return pendingOps.getPendingDeletions(await this.conn());
  }

  async addPendingDeletion(deletion: PendingDeletion) {
    await pendingOps.addPendingDeletion(await this.conn(), deletion);
    this.notify();
  }

  async clearPendingDeletion(uid: string) {
    await pendingOps.clearPendingDeletion(await this.conn(), uid);
    this.notify();
  }

  async clearPendingDeletionsForCalendar(calendarId: string) {
    await pendingOps.clearPendingDeletionsForCalendar(await this.conn(), calendarId);
    this.notify();
  }

  async markPendingDeletionAttempt(uid: string, error: string) {
    await pendingOps.markPendingDeletionAttempt(await this.conn(), uid, error);
    this.notify();
  }

  // CalDAV task object baselines
  async getCalDAVTaskObjectByUid(taskUid: string) {
    return caldavTaskObjectOps.getCalDAVTaskObjectByUid(await this.conn(), taskUid);
  }

  async getCalDAVTaskObjectsByCalendar(calendarId: string) {
    return caldavTaskObjectOps.getCalDAVTaskObjectsByCalendar(await this.conn(), calendarId);
  }

  async upsertCalDAVTaskObject(object: CalDAVTaskObject) {
    await caldavTaskObjectOps.upsertCalDAVTaskObject(await this.conn(), object);
    this.notify();
  }

  async removeCalDAVTaskObjectByUid(taskUid: string) {
    await caldavTaskObjectOps.removeCalDAVTaskObjectByUid(await this.conn(), taskUid);
    this.notify();
  }

  async removeCalDAVTaskObjectsByCalendar(calendarId: string) {
    await caldavTaskObjectOps.removeCalDAVTaskObjectsByCalendar(await this.conn(), calendarId);
    this.notify();
  }

  // push subscriptions
  async getAllPushSubscriptions() {
    return pushOps.getAllPushSubscriptions(await this.conn());
  }

  async getPushSubscriptionsByCalendar(calendarId: string) {
    return pushOps.getPushSubscriptionsByCalendar(await this.conn(), calendarId);
  }

  async upsertPushSubscription(subscription: PushSubscription) {
    await pushOps.upsertPushSubscription(await this.conn(), subscription);
    this.notify();
  }

  async deletePushSubscription(subscriptionId: string) {
    await pushOps.deletePushSubscription(await this.conn(), subscriptionId);
    this.notify();
  }

  async deletePushSubscriptionsByCalendar(calendarId: string) {
    await pushOps.deletePushSubscriptionsByCalendar(await this.conn(), calendarId);
    this.notify();
  }

  // snapshot
  async getSnapshot() {
    return snapshotOps.getSnapshot(await this.conn());
  }
}

export const db = new Database();
