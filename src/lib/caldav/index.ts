import * as calendarOps from '$lib/caldav/calendars';
import type { Connection } from '$lib/caldav/connection';
import * as connectionOps from '$lib/caldav/connection';
import * as taskOps from '$lib/caldav/tasks';
import type { Account, Calendar, ServerType, Task } from '$types';

export class CalDAVClient {
  readonly accountId: string;
  private conn: Connection;

  private constructor(accountId: string, conn: Connection) {
    this.accountId = accountId;
    this.conn = conn;
  }

  // Connection management
  static getForAccount(accountId: string): CalDAVClient {
    const conn = connectionOps.getConnection(accountId);
    return new CalDAVClient(accountId, conn);
  }

  static async connect(
    accountId: string,
    serverUrl: string,
    username: string,
    password: string,
    serverType: ServerType = 'generic',
    calendarHomeUrl?: string,
  ): Promise<{ principalUrl: string; displayName: string; calendarHome: string }> {
    return connectionOps.connect(accountId, serverUrl, username, password, serverType, calendarHomeUrl);
  }

  static disconnect(accountId: string): void {
    connectionOps.disconnect(accountId);
  }

  static isConnected(accountId: string): boolean {
    return connectionOps.isConnected(accountId);
  }

  static async reconnect(account: Account): Promise<void> {
    return connectionOps.reconnect(account);
  }

  // Calendars
  async fetchCalendars(): Promise<Calendar[]> {
    return calendarOps.fetchCalendars(this.conn, this.accountId);
  }

  async createCalendar(displayName: string, color?: string): Promise<Calendar> {
    return calendarOps.createCalendar(this.conn, this.accountId, displayName, color);
  }

  async updateCalendar(
    calendarUrl: string,
    updates: { displayName?: string; color?: string; order?: number },
  ): Promise<{ success: boolean; failedProperties: string[] }> {
    return calendarOps.updateCalendar(this.conn, calendarUrl, updates);
  }

  async deleteCalendar(calendarUrl: string): Promise<boolean> {
    return calendarOps.deleteCalendar(this.conn, calendarUrl);
  }

  // Tasks
  async fetchTasks(calendar: Calendar): Promise<Task[] | null> {
    return taskOps.fetchTasks(this.conn, this.accountId, calendar);
  }

  async createTask(calendar: Calendar, task: Task): Promise<{ href: string; etag: string } | null> {
    return taskOps.createTask(this.conn, calendar, task);
  }

  async updateTask(task: Task): Promise<{ etag: string } | null> {
    return taskOps.updateTask(this.conn, task);
  }

  async deleteTask(task: Task): Promise<boolean> {
    return taskOps.deleteTask(this.conn, task);
  }

  async syncCalendar(
    calendar: Calendar,
    localTasks: Task[],
  ): Promise<{ created: Task[]; updated: Task[]; deleted: string[] } | null> {
    return taskOps.syncCalendar(this.conn, this.accountId, calendar, localTasks);
  }
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
